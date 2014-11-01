describe("Rasterize", function () {
    var svgImage = "svg image",
        doc,
        inlineReferences;

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

    var aMockCanvas = function () {
            var canvas = jasmine.createSpyObj("canvas", ["getContext"]),
                context = jasmine.createSpyObj("context", ["drawImage"]);

            canvas.getContext.and.callFake(function (howManyD) {
                if (howManyD === "2d") {
                    return context;
                }
            });
            return canvas;
        },
        aMockCanvasWithDrawError = function () {
            var canvas = jasmine.createSpyObj("canvas", ["getContext"]),
                context = jasmine.createSpyObj("context", ["drawImage"]);

            canvas.getContext.and.returnValue(context);
            context.drawImage.and.throwError("error");
            return canvas;
        };

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument('');

        spyOn(render, 'drawDocumentImage');
        spyOn(browser, "loadDocument");
    });

    describe("Rendering", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            inlineReferences = spyOn(inlineresources, "inlineReferences").and.returnValue(withoutErrors());

            spyOn(documentHelper, 'persistInputValues');

            setUpDrawDocumentImage(svgImage);
        });

        it("should take a document, inline all displayable content and render to the given canvas", function (done) {
            var canvas = aMockCanvas();
            
            rasterize.rasterize(doc, canvas, {}).then(function (result) {
                expect(result.image).toEqual(svgImage);
                expect(result.errors).toEqual([]);

                expect(inlineReferences).toHaveBeenCalledWith(doc, {inlineScripts: false});
                expect(render.drawDocumentImage).toHaveBeenCalledWith(doc, {});
                expect(canvas.getContext('2d').drawImage).toHaveBeenCalledWith(svgImage, 0, 0);

                done();
            });
        });

        it("should make the canvas optional", function (done) {
            rasterize.rasterize(doc, null, {}).then(function (result) {
                expect(result.image).toEqual(svgImage);

                expect(inlineReferences).toHaveBeenCalledWith(doc, {inlineScripts : false});
                expect(render.drawDocumentImage).toHaveBeenCalledWith(doc, {});

                done();
            });
        });

        it("should pass on AJAX options", function (done) {
            rasterize.rasterize(doc, aMockCanvas(), {baseUrl: "a_baseUrl", cache: 'none', cacheBucket: {}}).then(function () {
                expect(inlineReferences).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none', cacheBucket: {}, inlineScripts : false});

                done();
            });
        });

        it("should pass on render options", function (done) {
            rasterize.rasterize(doc, aMockCanvas(), {width: 123, height: 234, hover: '.aSelector', active: '#anotherSelector', zoom: 42}).then(function () {
                expect(render.drawDocumentImage).toHaveBeenCalledWith(doc, {width: 123, height: 234, hover: '.aSelector', active: '#anotherSelector', zoom: 42});

                done();
            });
        });

        it("should optionally execute JavaScript in the page", function (done) {
            var executeJavascript = spyOn(browser, "executeJavascript").and.returnValue(
                    fulfilled({document: doc, errors: []})
                );

            rasterize.rasterize(doc, null, {executeJs: true, width: 123, height: 456}).then(function () {
                expect(executeJavascript).toHaveBeenCalledWith(doc, jasmine.objectContaining({width: 123, height: 456}));
                expect(documentHelper.persistInputValues).toHaveBeenCalledWith(doc);

                done();
            });
        });

        it("should inline scripts when executing JavaScript", function (done) {
            spyOn(browser, "executeJavascript").and.returnValue(
                fulfilled({document: doc, errors: []})
            );

            rasterize.rasterize(doc, null, {executeJs: true}).then(function () {
                expect(inlineReferences).toHaveBeenCalledWith(doc, {executeJs : true, inlineScripts: true});

                done();
            });
        });

        it("should follow optional timeout when executing JavaScript", function (done) {
            var executeJavascript = spyOn(browser, "executeJavascript").and.returnValue(
                    fulfilled({document: doc, errors: []})
                );


            rasterize.rasterize(doc, null, {executeJs: true, executeJsTimeout: 42}).then(function () {
                expect(executeJavascript).toHaveBeenCalledWith(doc, jasmine.objectContaining({executeJsTimeout: 42}));

                done();
            });
        });
    });

    describe("Error handling", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            spyOn(documentHelper, 'persistInputValues');
        });

        it("should pass through an error from inlining on drawDocument", function (done) {
            setUpDrawDocumentImage(svgImage);

            inlineReferences = spyOn(inlineresources, "inlineReferences").and.returnValue(withErrors(["the error"]));

            rasterize.rasterize(doc, aMockCanvas(), {}).then(function (result) {
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

            rasterize.rasterize(doc, aMockCanvas(), {executeJs: true}).then(function (result) {
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

            executeJavascript = spyOn(browser, "executeJavascript");
            spyOn(documentHelper, 'persistInputValues');
        });

        it("should fail the returned promise on error from inlining when rendering the SVG", function (done) {
            var canvas = aMockCanvas(),
                error = new Error();

            setUpDrawDocumentImageError(error);

            rasterize.rasterize(doc, canvas, {}).fail(function (e) {
                expect(e).toBe(error);

                expect(canvas.getContext('2d').drawImage).not.toHaveBeenCalled();

                done();
            });
        });

        it("should fail the returned promise on error from inlining when drawing the image on the canvas", function (done) {
            var canvas = aMockCanvasWithDrawError();

            setUpDrawDocumentImage(svgImage);

            rasterize.rasterize(doc, canvas, {}).fail(function (error) {
                expect(error).toEqual(jasmine.objectContaining({message: "Error rendering page"}));

                done();
            });
        });
    });
});
