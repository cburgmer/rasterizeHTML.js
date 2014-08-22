describe("Rasterize", function () {
    var svgImage = "svg image",
        doc, canvas,
        inlineReferences, drawImageOnCanvas;

    var withoutErrors = function () {
        return withErrors([]);
    };

    var withErrors = function (errors) {
        return fulfilled(errors);
    };

    var fulfilled = function (value) {
        var defer = ayepromise.defer();
        defer.resolve(value);
        return defer.promise;
    };

    var rejected = function (error) {
        var defer = ayepromise.defer();
        defer.reject(error);
        return defer.promise;
    };

    var setUpDrawDocumentImage = function (image) {
            render.drawDocumentImage.and.returnValue(fulfilled(image));
        },
        setUpDrawDocumentImageError = function (e) {
            render.drawDocumentImage.and.returnValue(rejected(e));
        };

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument('');

        canvas = document.createElement("canvas");
        canvas.width = 123;
        canvas.height = 456;

        spyOn(render, 'drawDocumentImage');
        spyOn(browser, "loadDocument");
    });

    describe("Rendering", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            inlineReferences = spyOn(inlineresources, "inlineReferences").and.returnValue(withoutErrors());
            drawImageOnCanvas = spyOn(render, "drawImageOnCanvas");

            spyOn(documentHelper, 'persistInputValues');

            setUpDrawDocumentImage(svgImage);
        });

        it("should take a document, inline all displayable content and render to the given canvas", function (done) {
            rasterize.rasterize(doc, canvas, {}).then(function (result) {
                expect(result.image).toEqual(svgImage);
                expect(result.errors).toEqual([]);

                expect(inlineReferences).toHaveBeenCalledWith(doc, {inlineScripts: false});
                expect(render.drawDocumentImage).toHaveBeenCalledWith(doc, canvas, {});
                expect(drawImageOnCanvas).toHaveBeenCalledWith(svgImage, canvas);

                done();
            });
        });

        it("should make the canvas optional", function (done) {
            rasterize.rasterize(doc, undefined, {}).then(function (result) {
                expect(result.image).toEqual(svgImage);

                expect(inlineReferences).toHaveBeenCalledWith(doc, {inlineScripts : false});
                expect(render.drawDocumentImage).toHaveBeenCalledWith(doc, undefined, {});
                expect(drawImageOnCanvas).not.toHaveBeenCalled();

                done();
            });
        });

        it("should pass on AJAX options", function (done) {
            rasterize.rasterize(doc, canvas, {baseUrl: "a_baseUrl", cache: 'none', cacheBucket: {}}).then(function () {
                expect(inlineReferences).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none', cacheBucket: {}, inlineScripts : false});

                done();
            });
        });

        it("should pass on render options", function (done) {
            rasterize.rasterize(doc, canvas, {width: 123, height: 234, hover: '.aSelector', active: '#anotherSelector', zoom: 42}).then(function () {
                expect(render.drawDocumentImage).toHaveBeenCalledWith(doc, canvas, {width: 123, height: 234, hover: '.aSelector', active: '#anotherSelector', zoom: 42});

                done();
            });
        });

        it("should optionally execute JavaScript in the page", function (done) {
            var executeJavascript = spyOn(browser, "executeJavascript").and.returnValue(
                    fulfilled({document: doc, errors: []})
                );

            rasterize.rasterize(doc, undefined, {executeJs: true, width: 123, height: 456}).then(function () {
                expect(executeJavascript).toHaveBeenCalledWith(doc, undefined, 0, {width: 123, height: 456});
                expect(documentHelper.persistInputValues).toHaveBeenCalledWith(doc);

                done();
            });
        });

        it("should inline scripts when executing JavaScript", function (done) {
            spyOn(browser, "executeJavascript").and.returnValue(
                fulfilled({document: doc, errors: []})
            );

            rasterize.rasterize(doc, undefined, {executeJs: true}).then(function () {
                expect(inlineReferences).toHaveBeenCalledWith(doc, {executeJs : true, inlineScripts: true});

                done();
            });
        });

        it("should follow optional timeout when executing JavaScript", function (done) {
            var executeJavascript = spyOn(browser, "executeJavascript").and.returnValue(
                    fulfilled({document: doc, errors: []})
                );


            rasterize.rasterize(doc, undefined, {executeJs: true, executeJsTimeout: 42}).then(function () {
                expect(executeJavascript).toHaveBeenCalledWith(doc, undefined, 42, jasmine.any(Object));

                done();
            });
        });
    });

    describe("Error handling", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            drawImageOnCanvas = spyOn(render, "drawImageOnCanvas");
            spyOn(documentHelper, 'persistInputValues');
        });

        it("should pass through an error from inlining on drawDocument", function (done) {
            setUpDrawDocumentImage(svgImage);

            inlineReferences = spyOn(inlineresources, "inlineReferences").and.returnValue(withErrors(["the error"]));

            rasterize.rasterize(doc, canvas, {}).then(function (result) {
                expect(result.image).toEqual(svgImage);
                expect(result.errors).toEqual(["the error"]);

                expect(inlineReferences).toHaveBeenCalled();

                done();
            });
        });

        it("should pass through a JS error", function (done) {
            spyOn(inlineresources, "inlineReferences").and.returnValue(withoutErrors());
            spyOn(browser, "executeJavascript").and.returnValue(
                fulfilled({document: doc, errors: ["the error"]})
            );
            setUpDrawDocumentImage(svgImage);

            rasterize.rasterize(doc, canvas, {executeJs: true}).then(function (result) {
                expect(result.image).toBe(svgImage);
                expect(result.errors).toEqual(["the error"]);

                done();
            });
        });
    });

    describe("Internal errors", function () {
        var callback, executeJavascript;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            inlineReferences = spyOn(inlineresources, "inlineReferences").and.returnValue(withoutErrors());

            drawImageOnCanvas = spyOn(render, "drawImageOnCanvas");

            executeJavascript = spyOn(browser, "executeJavascript");
            spyOn(documentHelper, 'persistInputValues');
        });

        it("should fail the returned promise on error from inlining when rendering the SVG on drawDocument", function (done) {
            var error = new Error();

            setUpDrawDocumentImageError(error);

            rasterize.rasterize(doc, canvas, {}).fail(function (e) {
                expect(e).toBe(error);

                expect(drawImageOnCanvas).not.toHaveBeenCalled();

                done();
            });
        });

        it("should fail the returned promise on error from inlining when drawing the image on the canvas on drawDocument", function (done) {
            var error = new Error("theError");

            setUpDrawDocumentImage(svgImage);
            drawImageOnCanvas.and.throwError(error);

            rasterize.rasterize(doc, canvas, {}).fail(function (e) {
                expect(e).toBe(error);

                expect(drawImageOnCanvas).toHaveBeenCalled();

                done();
            });
        });
    });
});
