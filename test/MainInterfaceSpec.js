describe("Main interface of rasterizeHTML.js", function () {
    var callbackCaller = function (doc, options, callback) { callback([]); },
        svg = "the svg",
        svgImage = "svg image",
        doc = {},
        canvas, ajaxSpy, parseHTMLSpy, parseOptionalParametersSpy,
        inlineReferences, getSvgForDocument, renderSvg, drawImageOnCanvas;

    beforeEach(function () {
        ajaxSpy = spyOn(rasterizeHTML.util, "loadDocument");
        parseHTMLSpy = spyOn(rasterizeHTML.util, 'parseHTML').andReturn(doc);


        canvas = document.createElement("canvas");
        canvas.width = 123;
        canvas.height = 456;

        parseOptionalParametersSpy = spyOn(rasterizeHTML.util, "parseOptionalParameters").andCallThrough();
    });

    describe("Rendering", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            inlineReferences = spyOn(rasterizeHTMLInline, "inlineReferences").andCallFake(callbackCaller);
            getSvgForDocument = spyOn(rasterizeHTML, "getSvgForDocument").andReturn(svg);
            renderSvg = spyOn(rasterizeHTML, "renderSvg").andCallFake(function (svg, canvas, callback) {
                callback(svgImage);
            });
            drawImageOnCanvas = spyOn(rasterizeHTML, "drawImageOnCanvas").andReturn(true);
        });

        it("should take a document, inline all displayable content and render to the given canvas", function () {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, canvas, callback);

            expect(inlineReferences).toHaveBeenCalledWith(doc, {inlineScripts: false}, jasmine.any(Function));
            expect(getSvgForDocument).toHaveBeenCalledWith(doc, canvas.width, canvas.height);
            expect(renderSvg).toHaveBeenCalledWith(svg, canvas, jasmine.any(Function), jasmine.any(Function));
            expect(drawImageOnCanvas).toHaveBeenCalledWith(svgImage, canvas);

            expect(callback).toHaveBeenCalledWith(svgImage, []);
            expect(parseOptionalParametersSpy).toHaveBeenCalled();
        });

        it("should make the canvas optional when drawing a document and apply default width and height", function () {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, callback);

            expect(inlineReferences).toHaveBeenCalledWith(doc, {inlineScripts : false}, jasmine.any(Function));
            expect(getSvgForDocument).toHaveBeenCalledWith(doc, 300, 200);
            expect(renderSvg).toHaveBeenCalledWith(svg, null, jasmine.any(Function), jasmine.any(Function));
            expect(drawImageOnCanvas).not.toHaveBeenCalled();

            expect(callback).toHaveBeenCalledWith(svgImage, []);
            expect(parseOptionalParametersSpy).toHaveBeenCalled();
        });

        it("should take a document with optional width and height", function () {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, canvas, {width: 42, height: 4711}, callback);

            expect(getSvgForDocument).toHaveBeenCalledWith(doc, 42, 4711);

            expect(callback).toHaveBeenCalledWith(svgImage, []);
        });

        it("should pass on options", function () {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, canvas, {baseUrl: "a_baseUrl", cache: 'none', cacheBucket: {}}, callback);

            expect(inlineReferences).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none', cacheBucket: {}, inlineScripts : false}, jasmine.any(Function));

            expect(callback).toHaveBeenCalledWith(svgImage, []);
        });

        it("should make callback optional for drawDocument", function () {
            rasterizeHTML.drawDocument("doc", canvas, {baseUrl: "a_baseUrl"});
        });

        it("should optionally execute JavaScript in the page", function () {
            var doc = "the document",
                executeJavascript = spyOn(rasterizeHTML.util, "executeJavascript").andCallFake(function (doc, timeout, callback) {
                    callback(doc);
                });

            rasterizeHTML.drawDocument(doc, {executeJs: true}, callback);

            expect(executeJavascript).toHaveBeenCalledWith(doc, 0, jasmine.any(Function));
            expect(callback).toHaveBeenCalled();
        });

        it("should inline scripts when executing JavaScript", function () {
            var doc = "the document";
            spyOn(rasterizeHTML.util, "executeJavascript");

            rasterizeHTML.drawDocument(doc, {executeJs: true}, callback);

            expect(inlineReferences).toHaveBeenCalledWith(doc, {executeJs : true, inlineScripts: true}, jasmine.any(Function));
        });

        it("should follow optional timeout when executing JavaScript", function () {
            var doc = "the document",
                executeJavascript = spyOn(rasterizeHTML.util, "executeJavascript").andCallFake(function (doc, timeout, callback) {
                    callback(doc);
                });

            rasterizeHTML.drawDocument(doc, {executeJs: true, executeJsTimeout: 42}, callback);

            expect(executeJavascript).toHaveBeenCalledWith(doc, 42, jasmine.any(Function));
            expect(callback).toHaveBeenCalled();
        });

        it("should take a HTML string, inline all displayable content and render to the given canvas", function () {
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

            rasterizeHTML.drawHTML(html, canvas, callback);

            expect(drawDocumentSpy).toHaveBeenCalledWith(doc, canvas, {}, callback);

            expect(callback).toHaveBeenCalledWith(svgImage, []);
        });

        it("should make the canvas optional when drawing a HTML string", function () {
            var html = "the html",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            parseHTMLSpy.andReturn(doc);

            rasterizeHTML.drawHTML(html, {width: 999, height: 987}, callback);

            expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), null, {width: 999, height: 987}, callback);

            expect(callback).toHaveBeenCalledWith(svgImage, []);
        });

        it("should take a HTML string with optional baseUrl, inline all displayable content and render to the given canvas", function () {
            var html = "the html",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            rasterizeHTML.drawHTML(html, canvas, {baseUrl: "a_baseUrl"}, callback);

            expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), canvas, {baseUrl: "a_baseUrl"}, callback);

            expect(callback).toHaveBeenCalledWith(svgImage, []);
        });

        it("should circumvent caching if requested for drawHTML", function () {
            var html = "<head><title>a title</title></head><body>some html</body>",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            rasterizeHTML.drawHTML(html, canvas, {cache: 'none'}, callback);

            expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), canvas, {cache: 'none'}, callback);

            expect(callback).toHaveBeenCalled();
        });

        it("should make callback optional for drawHTML", function () {
            rasterizeHTML.drawHTML("<html></html>", canvas, {baseUrl: "a_baseUrl"});
        });

        it("should take a URL, inline all displayable content and render to the given canvas", function () {
            var doc = "the document",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            ajaxSpy.andCallFake(function (url, options, success) {
                success(doc);
            });

            rasterizeHTML.drawURL("fixtures/image.html", canvas, callback);

            expect(callback).toHaveBeenCalledWith(svgImage, []);
            expect(drawDocumentSpy).toHaveBeenCalledWith(doc, canvas, {}, callback);
        });

        it("should make the canvas optional when drawing an URL", function () {
            var doc = "the document",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            ajaxSpy.andCallFake(function (url, options, success) {
                success(doc);
            });

            rasterizeHTML.drawURL("fixtures/image.html", {width: 999, height: 987}, callback);

            expect(callback).toHaveBeenCalledWith(svgImage, []);
            expect(drawDocumentSpy).toHaveBeenCalledWith(doc, null, {width: 999, height: 987}, callback);
        });

        it("should circumvent caching if requested for drawURL", function () {
            spyOn(rasterizeHTML, "drawHTML").andCallFake(function (html, canvas, options, callback) {
                callback(svgImage, []);
            });

            ajaxSpy.andCallFake(function (url, options, success, error) {
                error();
            });

            rasterizeHTML.drawURL("fixtures/image.html", canvas, {cache: 'none'}, callback);

            expect(ajaxSpy).toHaveBeenCalledWith("fixtures/image.html", {
                cache: 'none'
            }, jasmine.any(Function), jasmine.any(Function));
            expect(callback).toHaveBeenCalled();
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

            getSvgForDocument = spyOn(rasterizeHTML, "getSvgForDocument").andReturn(svg);
            renderSvg = spyOn(rasterizeHTML, "renderSvg").andCallFake(function (svg, canvas, callback) {
                callback(svgImage);
            });
            drawImageOnCanvas = spyOn(rasterizeHTML, "drawImageOnCanvas").andReturn(true);
        });

        it("should pass through an error from inlining on drawDocument", function () {
            var doc = "doc";

            inlineReferences = spyOn(rasterizeHTMLInline, "inlineReferences").andCallFake(function (doc, options, callback) {
                callback(["the error"]);
            });

            rasterizeHTML.drawDocument(doc, canvas, callback);

            expect(inlineReferences).toHaveBeenCalled();

            expect(callback).toHaveBeenCalledWith(svgImage, ["the error"]);
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

            inlineReferences = spyOn(rasterizeHTMLInline, "inlineReferences").andCallFake(callbackCaller);

            getSvgForDocument = spyOn(rasterizeHTML, "getSvgForDocument").andReturn(svg);
            renderSvg = spyOn(rasterizeHTML, "renderSvg");
            drawImageOnCanvas = spyOn(rasterizeHTML, "drawImageOnCanvas");

            executeJavascript = spyOn(rasterizeHTML.util, "executeJavascript");
        });

        it("should pass through an error from inlining when rendering the SVG on drawDocument", function () {
            var doc = "doc";

            renderSvg.andCallFake(function (svg, canvas, successCallback, errorCallback) {
                errorCallback();
            });
            drawImageOnCanvas.andReturn(true);

            rasterizeHTML.drawDocument(doc, canvas, callback);

            expect(renderSvg).toHaveBeenCalled();
            expect(drawImageOnCanvas).not.toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(null, [{
                resourceType: "document",
                msg: "Error rendering page"
            }]);
        });

        it("should pass through an error from inlining when drawing the image on the canvas on drawDocument", function () {
            var doc = "doc";

            renderSvg.andCallFake(function (svg, canvas, successCallback) {
                successCallback(svgImage);
            });
            drawImageOnCanvas.andReturn(false);

            rasterizeHTML.drawDocument(doc, canvas, callback);

            expect(renderSvg).toHaveBeenCalled();
            expect(drawImageOnCanvas).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(null, [{
                resourceType: "document",
                msg: "Error rendering page"
            }]);
        });

        it("should work without a callback specified on error when rendering the SVG in drawDocument", function () {
            var doc = "doc";

            renderSvg.andCallFake(function (svg, canvas, successCallback, errorCallback) {
                errorCallback();
            });
            drawImageOnCanvas.andReturn(true);

            rasterizeHTML.drawDocument(doc, canvas);
        });

        it("should work without a callback specified on error when drawing the image on the canvas in drawDocument", function () {
            var doc = "doc";

            renderSvg.andCallFake(function (svg, canvas, successCallback) {
                successCallback(svgImage);
            });
            drawImageOnCanvas.andReturn(false);

            rasterizeHTML.drawDocument(doc, canvas);
        });

        it("should pass through a JS error", function () {
            var doc = "doc";

            executeJavascript.andCallFake(function (doc, timeout, callback) {
                callback(doc, ["the error"]);
            });
            renderSvg.andCallFake(function (svg, canvas, successCallback) {
                successCallback(svgImage);
            });
            drawImageOnCanvas.andReturn(true);

            rasterizeHTML.drawDocument(doc, canvas, {executeJs: true}, callback);

            expect(callback).toHaveBeenCalledWith(svgImage, ["the error"]);
        });

    });
});
