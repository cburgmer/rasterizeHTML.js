describe("Main interface of rasterizeHTML.js", function () {
    var callbackCaller = function (doc, options, callback) { callback([]); },
        svg = "the svg",
        svgImage = "svg image",
        canvas = document.createElement("canvas"),
        ajaxSpy,
        loadAndInlineImages, loadAndInlineCSS, loadAndInlineCSSImports, loadAndInlineCSSReferences,
        getSvgForDocument, renderSvg, drawImageOnCanvas;

    beforeEach(function () {
        ajaxSpy = spyOn(rasterizeHTML.util, "ajax");
    });

    describe("Rendering", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            loadAndInlineImages = spyOn(rasterizeHTML, "loadAndInlineImages").andCallFake(callbackCaller);
            loadAndInlineCSS = spyOn(rasterizeHTML, "loadAndInlineCSS").andCallFake(callbackCaller);
            loadAndInlineCSSImports = spyOn(rasterizeHTML, "loadAndInlineCSSImports").andCallFake(callbackCaller);
            loadAndInlineCSSReferences = spyOn(rasterizeHTML, "loadAndInlineCSSReferences").andCallFake(callbackCaller);
            getSvgForDocument = spyOn(rasterizeHTML, "getSvgForDocument").andReturn(svg);
            renderSvg = spyOn(rasterizeHTML, "renderSvg").andCallFake(function (svg, canvas, callback) {
                callback(svgImage);
            });
            drawImageOnCanvas = spyOn(rasterizeHTML, "drawImageOnCanvas").andReturn(true);
        });

        it("should take a document, inline all displayable content and render to the given canvas", function () {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, canvas, callback);

            expect(loadAndInlineImages).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
            expect(loadAndInlineCSS).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
            expect(loadAndInlineCSSImports).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
            expect(loadAndInlineCSSReferences).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
            expect(getSvgForDocument).toHaveBeenCalledWith(doc, canvas.width, canvas.height);
            expect(renderSvg).toHaveBeenCalledWith(svg, canvas, jasmine.any(Function), jasmine.any(Function));
            expect(drawImageOnCanvas).toHaveBeenCalledWith(svgImage, canvas);

            expect(callback).toHaveBeenCalledWith(svgImage, []);
        });

        it("should take a document with optional baseUrl and inline all displayable content", function () {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, canvas, {baseUrl: "a_baseUrl"}, callback);

            expect(loadAndInlineImages).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl"}, jasmine.any(Function));
            expect(loadAndInlineCSS).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl"}, jasmine.any(Function));
            expect(loadAndInlineCSSImports).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl"}, jasmine.any(Function));
            expect(loadAndInlineCSSReferences).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl"}, jasmine.any(Function));

            expect(callback).toHaveBeenCalledWith(svgImage, []);
        });

        it("should circumvent caching if requested for drawDocument", function () {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, canvas, {cache: false}, callback);

            expect(loadAndInlineImages).toHaveBeenCalledWith(doc, {cache: false}, jasmine.any(Function));
            expect(loadAndInlineCSS).toHaveBeenCalledWith(doc, {cache: false}, jasmine.any(Function));
            expect(loadAndInlineCSSImports).toHaveBeenCalledWith(doc, {cache: false}, jasmine.any(Function));
            expect(loadAndInlineCSSReferences).toHaveBeenCalledWith(doc, {cache: false}, jasmine.any(Function));

            expect(callback).toHaveBeenCalled();
        });

        it("should make callback optional for drawDocument", function () {
            rasterizeHTML.drawDocument("doc", canvas, {baseUrl: "a_baseUrl"});
        });

        it("should take a HTML string, inline all displayable content and render to the given canvas", function () {
            var html = "<head><title>a title</title></head><body>some html</body>",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            rasterizeHTML.drawHTML(html, canvas, callback);

            expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), canvas, {}, callback);
            expect(drawDocumentSpy.mostRecentCall.args[0].documentElement.innerHTML).toEqual(html);

            expect(callback).toHaveBeenCalledWith(svgImage, []);
        });

        it("should take a HTML string with optional baseUrl, inline all displayable content and render to the given canvas", function () {
            var html = "<head><title>a title</title></head><body>some html</body>",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            rasterizeHTML.drawHTML(html, canvas, {baseUrl: "a_baseUrl"}, callback);

            expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), canvas, {baseUrl: "a_baseUrl"}, callback);
            expect(drawDocumentSpy.mostRecentCall.args[0].documentElement.innerHTML).toEqual(html);

            expect(callback).toHaveBeenCalledWith(svgImage, []);
        });

        it("should circumvent caching if requested for drawHTML", function () {
            var html = "<head><title>a title</title></head><body>some html</body>",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, options, callback) {
                    callback(svgImage, []);
                });

            rasterizeHTML.drawHTML(html, canvas, {cache: false}, callback);

            expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), canvas, {cache: false}, callback);

            expect(callback).toHaveBeenCalled();
        });

        it("should make callback optional for drawHTML", function () {
            rasterizeHTML.drawHTML("<html></html>", canvas, {baseUrl: "a_baseUrl"});
        });

        it("should take a URL, inline all displayable content and render to the given canvas", function () {
            var finished = false,
                drawHtmlSpy = spyOn(rasterizeHTML, "drawHTML").andCallFake(function (html, canvas, options, callback) {
                    callback(svgImage, []);
                });

            ajaxSpy.andCallFake(function (url, options, success, error) {
                success("some html");
            });

            rasterizeHTML.drawURL("fixtures/image.html", canvas, callback);

            expect(callback).toHaveBeenCalledWith(svgImage, []);
            expect(drawHtmlSpy).toHaveBeenCalledWith("some html", canvas, {baseUrl: "fixtures/image.html"}, callback);
        });

        it("should circumvent caching if requested for drawURL", function () {
            var finished = false,
                drawHtmlSpy = spyOn(rasterizeHTML, "drawHTML").andCallFake(function (html, canvas, options, callback) {
                    callback(svgImage, []);
                });

            ajaxSpy.andCallFake(function (url, options, success, error) {
                error();
            });

            rasterizeHTML.drawURL("fixtures/image.html", canvas, {cache: false}, callback);

            expect(ajaxSpy).toHaveBeenCalledWith("fixtures/image.html", {
                cache: false
            }, jasmine.any(Function), jasmine.any(Function));
            expect(callback).toHaveBeenCalled();
        });

        it("should make callback optional for drawURL", function () {
            ajaxSpy.andCallFake(function (url, options, success, error) {
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

            loadAndInlineImages = spyOn(rasterizeHTML, "loadAndInlineImages").andCallFake(function (doc, options, callback) {
                callback(["the error"]);
            });
            loadAndInlineCSS = spyOn(rasterizeHTML, "loadAndInlineCSS").andCallFake(callbackCaller);
            loadAndInlineCSSImports = spyOn(rasterizeHTML, "loadAndInlineCSSImports").andCallFake(callbackCaller);
            loadAndInlineCSSReferences = spyOn(rasterizeHTML, "loadAndInlineCSSReferences").andCallFake(callbackCaller);

            rasterizeHTML.drawDocument(doc, canvas, callback);

            expect(loadAndInlineImages).toHaveBeenCalled();

            expect(callback).toHaveBeenCalledWith(svgImage, ["the error"]);
        });

        it("should pass through multiple errors from inlining on drawDocument", function () {
            var doc = "doc";

            loadAndInlineImages = spyOn(rasterizeHTML, "loadAndInlineImages").andCallFake(function (doc, options, callback) {
                callback(["the error"]);
            });
            loadAndInlineCSS = spyOn(rasterizeHTML, "loadAndInlineCSS").andCallFake(function (doc, options, callback) {
                callback(["another error"]);
            });
            loadAndInlineCSSImports = spyOn(rasterizeHTML, "loadAndInlineCSSImports").andCallFake(function (doc, options, callback) {
                callback(["more error"]);
            });
            loadAndInlineCSSReferences = spyOn(rasterizeHTML, "loadAndInlineCSSReferences").andCallFake(function (doc, options, callback) {
                callback(["yet another error", "and even more"]);
            });

            rasterizeHTML.drawDocument(doc, canvas, callback);

            expect(loadAndInlineImages).toHaveBeenCalled();

            expect(callback).toHaveBeenCalledWith(svgImage, ["the error", "another error", "more error", "yet another error", "and even more"]);
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
            var drawHtmlSpy = spyOn(rasterizeHTML, "drawHTML").andCallFake(function (html, canvas, options, callback) {
                    callback(svgImage, ["some error"]);
                });

            ajaxSpy.andCallFake(function (url, options, success, error) {
                success();
            });

            rasterizeHTML.drawURL("fixtures/image.html", canvas, callback);

            expect(drawHtmlSpy).toHaveBeenCalled();
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
                url: "non_existing.html"
            }]);
        });

        it("should deal with a missing callback when loading a broken URL", function () {
            var drawHtmlSpy = spyOn(rasterizeHTML, "drawHTML");

            ajaxSpy.andCallFake(function (url, options, success, error) {
                error();
            });

            rasterizeHTML.drawURL("non_existing.html", canvas);
            expect(ajaxSpy).toHaveBeenCalled();
        });
    });

    describe("Internal errors", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            loadAndInlineImages = spyOn(rasterizeHTML, "loadAndInlineImages").andCallFake(callbackCaller);
            loadAndInlineCSS = spyOn(rasterizeHTML, "loadAndInlineCSS").andCallFake(callbackCaller);
            loadAndInlineCSSImports = spyOn(rasterizeHTML, "loadAndInlineCSSImports").andCallFake(callbackCaller);
            loadAndInlineCSSReferences = spyOn(rasterizeHTML, "loadAndInlineCSSReferences").andCallFake(callbackCaller);

            getSvgForDocument = spyOn(rasterizeHTML, "getSvgForDocument").andReturn(svg);
            renderSvg = spyOn(rasterizeHTML, "renderSvg");
            drawImageOnCanvas = spyOn(rasterizeHTML, "drawImageOnCanvas");
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
                resourceType: "document"
            }]);
        });

        it("should pass through an error from inlining when drawing the image on the canvas on drawDocument", function () {
            var doc = "doc";

            renderSvg.andCallFake(function (svg, canvas, successCallback, errorCallback) {
                successCallback(svgImage);
            });
            drawImageOnCanvas.andReturn(false);

            rasterizeHTML.drawDocument(doc, canvas, callback);

            expect(renderSvg).toHaveBeenCalled();
            expect(drawImageOnCanvas).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(null, [{
                resourceType: "document"
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

            renderSvg.andCallFake(function (svg, canvas, successCallback, errorCallback) {
                successCallback(svgImage);
            });
            drawImageOnCanvas.andReturn(false);

            rasterizeHTML.drawDocument(doc, canvas);
        });

    });
});
