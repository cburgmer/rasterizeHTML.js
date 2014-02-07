describe("Main interface of rasterizeHTML.js", function () {
    var svgImage = "svg image",
        doc = {},
        canvas, ajaxSpy, parseHTMLSpy, parseOptionalParametersSpy,
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
            rasterizeHTML.drawDocumentImage.andReturn(fulfilled(image));
        },
        setUpDrawDocumentImageError = function () {
            rasterizeHTML.drawDocumentImage.andReturn(rejected());
        };

    beforeEach(function () {
        ajaxSpy = spyOn(rasterizeHTML.util, "loadDocument");
        parseHTMLSpy = spyOn(rasterizeHTML.util, 'parseHTML').andReturn(doc);


        canvas = document.createElement("canvas");
        canvas.width = 123;
        canvas.height = 456;

        parseOptionalParametersSpy = spyOn(rasterizeHTML.util, "parseOptionalParameters").andCallThrough();

        spyOn(rasterizeHTML, 'drawDocumentImage');
    });

    describe("Rendering", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            inlineReferences = spyOn(rasterizeHTMLInline, "inlineReferences").andReturn(withoutErrors());
            drawImageOnCanvas = spyOn(rasterizeHTML, "drawImageOnCanvas").andReturn(true);

            spyOn(rasterizeHTML.util, 'persistInputValues');

            setUpDrawDocumentImage(svgImage);
        });

        it("should take a document, inline all displayable content and render to the given canvas", function (done) {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, canvas, function (image, errors) {
                expect(image).toEqual(svgImage);
                expect(errors).toEqual([]);

                expect(inlineReferences).toHaveBeenCalledWith(doc, {inlineScripts: false});
                expect(rasterizeHTML.drawDocumentImage).toHaveBeenCalledWith(doc, canvas, {});
                expect(drawImageOnCanvas).toHaveBeenCalledWith(svgImage, canvas);

                done();
            });
        });

        it("should make the canvas optional", function (done) {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, function (image) {
                expect(image).toEqual(svgImage);

                expect(inlineReferences).toHaveBeenCalledWith(doc, {inlineScripts : false});
                expect(rasterizeHTML.drawDocumentImage).toHaveBeenCalledWith(doc, null, {});
                expect(drawImageOnCanvas).not.toHaveBeenCalled();

                expect(parseOptionalParametersSpy).toHaveBeenCalled();

                done();
            });
        });

        it("should pass on AJAX options", function (done) {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, canvas, {baseUrl: "a_baseUrl", cache: 'none', cacheBucket: {}}, function () {
                expect(inlineReferences).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none', cacheBucket: {}, inlineScripts : false});

                done();
            });
        });

        it("should make callback optional for drawDocument", function () {
            rasterizeHTML.drawDocument("doc", canvas, {baseUrl: "a_baseUrl"});
        });

        it("should optionally execute JavaScript in the page", function (done) {
            var doc = "the document",
                executeJavascript = spyOn(rasterizeHTML.util, "executeJavascript").andReturn(
                    fulfilled({document: doc, errors: []})
                );

            rasterizeHTML.drawDocument(doc, {executeJs: true}, function () {
                expect(executeJavascript).toHaveBeenCalledWith(doc, undefined, 0);
                expect(rasterizeHTML.util.persistInputValues).toHaveBeenCalledWith(doc);

                done();
            });
        });

        it("should inline scripts when executing JavaScript", function (done) {
            var doc = "the document";
            spyOn(rasterizeHTML.util, "executeJavascript").andReturn(
                fulfilled({document: doc, errors: []})
            );

            rasterizeHTML.drawDocument(doc, {executeJs: true}, function () {
                expect(inlineReferences).toHaveBeenCalledWith(doc, {executeJs : true, inlineScripts: true});

                done();
            });
        });

        it("should follow optional timeout when executing JavaScript", function (done) {
            var doc = "the document",
                executeJavascript = spyOn(rasterizeHTML.util, "executeJavascript").andReturn(
                    fulfilled({document: doc, errors: []})
                );


            rasterizeHTML.drawDocument(doc, {executeJs: true, executeJsTimeout: 42}, function () {
                expect(executeJavascript).toHaveBeenCalledWith(doc, undefined, 42);

                done();
            });
        });

        it("should take a HTML string, inline all displayable content and render to the given canvas", function (done) {
            var html = "<head><title>a title</title></head><body>some html</body>",
                doc = "doc",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            parseHTMLSpy.andCallFake(function (someHtml) {
                if (someHtml === html) {
                    return doc;
                }
            });

            rasterizeHTML.drawHTML(html, canvas, function (image, errors) {
                expect(image).toEqual(svgImage);
                expect(errors).toEqual([]);

                expect(drawDocumentSpy).toHaveBeenCalledWith(doc, canvas, {}, jasmine.any(Function));

                done();
            });
        });

        it("should make the canvas optional when drawing a HTML string", function (done) {
            var html = "the html",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            parseHTMLSpy.andReturn(doc);

            rasterizeHTML.drawHTML(html, {width: 999, height: 987}, function (image) {
                expect(image).toEqual(svgImage);
                expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), null, {width: 999, height: 987}, jasmine.any(Function));

                done();
            });
        });

        it("should take a HTML string with optional baseUrl, inline all displayable content and render to the given canvas", function (done) {
            var html = "the html",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            rasterizeHTML.drawHTML(html, canvas, {baseUrl: "a_baseUrl"}, function () {
                expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), canvas, {baseUrl: "a_baseUrl"}, jasmine.any(Function));

                done();
            });
        });

        it("should circumvent caching if requested for drawHTML", function (done) {
            var html = "<head><title>a title</title></head><body>some html</body>",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            rasterizeHTML.drawHTML(html, canvas, {cache: 'none'}, function () {
                expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), canvas, {cache: 'none'}, jasmine.any(Function));

                done();
            });
        });

        it("should make callback optional for drawHTML", function () {
            rasterizeHTML.drawHTML("<html></html>", canvas, {baseUrl: "a_baseUrl"});
        });

        it("should take a URL, inline all displayable content and render to the given canvas", function (done) {
            var doc = "the document",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            ajaxSpy.andCallFake(function (url, options, success) {
                success(doc);
            });

            rasterizeHTML.drawURL("fixtures/image.html", canvas, function (image, errors) {
                expect(image).toEqual(svgImage);
                expect(errors).toEqual([]);

                expect(drawDocumentSpy).toHaveBeenCalledWith(doc, canvas, {}, jasmine.any(Function));

                done();
            });
        });

        it("should make the canvas optional when drawing an URL", function (done) {
            var doc = "the document",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            ajaxSpy.andCallFake(function (url, options, success) {
                success(doc);
            });

            rasterizeHTML.drawURL("fixtures/image.html", {width: 999, height: 987}, function (image) {
                expect(image).toEqual(svgImage);
                expect(drawDocumentSpy).toHaveBeenCalledWith(doc, null, {width: 999, height: 987}, jasmine.any(Function));

                done();
            });
        });

        it("should circumvent caching if requested for drawURL", function (done) {
            spyOn(rasterizeHTML, "drawHTML").andCallFake(function (html, canvas, options, callback) {
                callback(svgImage, []);
            });

            ajaxSpy.andCallFake(function (url, options, success, error) {
                error();
            });

            rasterizeHTML.drawURL("fixtures/image.html", canvas, {cache: 'none'}, function () {
                expect(ajaxSpy).toHaveBeenCalledWith("fixtures/image.html", {
                    cache: 'none'
                }, jasmine.any(Function), jasmine.any(Function));

                done();
            });
        });

        it("should make callback optional for drawURL", function () {
            ajaxSpy.andCallFake(function (url, options, success) {
                success("some html");
            });

            rasterizeHTML.drawURL("fixtures/image.html", canvas);
        });

    });

    describe("Error handling", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            drawImageOnCanvas = spyOn(rasterizeHTML, "drawImageOnCanvas").andReturn(true);
        });

        it("should pass through an error from inlining on drawDocument", function (done) {
            var doc = "doc";

            setUpDrawDocumentImage(svgImage);

            inlineReferences = spyOn(rasterizeHTMLInline, "inlineReferences").andReturn(withErrors(["the error"]));

            rasterizeHTML.drawDocument(doc, canvas, function (image, errors) {
                expect(image).toEqual(svgImage);
                expect(errors).toEqual(["the error"]);

                expect(inlineReferences).toHaveBeenCalled();

                done();
            });
        });

        it("should pass through errors from drawHTML", function () {
            var drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, ["an error"]);
                });

            rasterizeHTML.drawHTML("", canvas, callback);

            expect(drawDocumentSpy).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(svgImage, ["an error"]);
        });

        it("should pass through errors from drawURL", function () {
            var drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, ["some error"]);
                });

            ajaxSpy.andCallFake(function (url, options, success) {
                success();
            });

            rasterizeHTML.drawURL("fixtures/image.html", canvas, callback);

            expect(drawDocumentSpy).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(svgImage, ["some error"]);
        });

        it("should report an error on loading a broken URL", function () {
            var drawHtmlSpy = spyOn(rasterizeHTML, "drawHTML");

            ajaxSpy.andCallFake(function (url, options, success, error) {
                error();
            });

            rasterizeHTML.drawURL("non_existing.html", canvas, callback);

            expect(drawHtmlSpy).not.toHaveBeenCalled();
            expect(ajaxSpy).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(null, [{
                resourceType: "page",
                url: "non_existing.html",
                msg: "Unable to load page non_existing.html"
            }]);
        });

        it("should deal with a missing callback when loading a broken URL", function () {
            spyOn(rasterizeHTML, "drawHTML");

            ajaxSpy.andCallFake(function (url, options, success, error) {
                error();
            });

            rasterizeHTML.drawURL("non_existing.html", canvas);
            expect(ajaxSpy).toHaveBeenCalled();
        });
    });

    describe("Internal errors", function () {
        var callback, executeJavascript;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            inlineReferences = spyOn(rasterizeHTMLInline, "inlineReferences").andReturn(withoutErrors());

            drawImageOnCanvas = spyOn(rasterizeHTML, "drawImageOnCanvas");

            executeJavascript = spyOn(rasterizeHTML.util, "executeJavascript");
            spyOn(rasterizeHTML.util, 'persistInputValues');
        });

        it("should pass through an error from inlining when rendering the SVG on drawDocument", function (done) {
            var doc = "doc";

            setUpDrawDocumentImageError();
            drawImageOnCanvas.andReturn(true);

            rasterizeHTML.drawDocument(doc, canvas, function (image, errors) {
                errors = rasterizeHTMLTestHelper.deleteAdditionalFieldsFromErrorsUnderPhantomJS(errors);
                expect(drawImageOnCanvas).not.toHaveBeenCalled();
                expect(image).toBe(null);
                expect(errors).toEqual([{
                    resourceType: "document",
                    msg: "Error rendering page"
                }]);

                done();
            });
        });

        it("should pass through an error from inlining when drawing the image on the canvas on drawDocument", function (done) {
            var doc = "doc";

            setUpDrawDocumentImage(svgImage);
            drawImageOnCanvas.andReturn(false);

            rasterizeHTML.drawDocument(doc, canvas, function (image, errors) {
                errors = rasterizeHTMLTestHelper.deleteAdditionalFieldsFromErrorsUnderPhantomJS(errors);
                expect(image).toBe(null);
                expect(errors).toEqual([{
                    resourceType: "document",
                    msg: "Error rendering page"
                }]);

                expect(drawImageOnCanvas).toHaveBeenCalled();

                done();
            });
        });

        it("should work without a callback specified on error when rendering the SVG in drawDocument", function () {
            var doc = "doc";

            setUpDrawDocumentImageError();
            drawImageOnCanvas.andReturn(true);

            rasterizeHTML.drawDocument(doc, canvas);
        });

        it("should work without a callback specified on error when drawing the image on the canvas in drawDocument", function () {
            var doc = "doc";

            setUpDrawDocumentImage(svgImage);
            drawImageOnCanvas.andReturn(false);

            rasterizeHTML.drawDocument(doc, canvas);
        });

        it("should pass through a JS error", function (done) {
            var doc = "doc";

            executeJavascript.andReturn(
                fulfilled({document: doc, errors: ["the error"]})
            );
            setUpDrawDocumentImage(svgImage);
            drawImageOnCanvas.andReturn(true);

            rasterizeHTML.drawDocument(doc, canvas, {executeJs: true}, function (image, errors) {
                expect(image).toBe(svgImage);
                expect(errors).toEqual(["the error"]);

                done();
            });
        });

    });
});
