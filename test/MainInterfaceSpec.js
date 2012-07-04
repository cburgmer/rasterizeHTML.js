describe("Main interface of rasterizeHTML.js", function () {
    var callbackCaller = function (doc, baseUrl, callback) { callback([]); },
        svg = "the svg",
        canvas = document.createElement("canvas"),
        ajaxSpy,
        loadAndInlineImages, loadAndInlineCSS, loadAndInlineCSSReferences,
        getSvgForDocument, drawSvgToCanvas;

    beforeEach(function () {
        ajaxSpy = spyOn(rasterizeHTML.util, "ajax");
    });

    describe("Rendering", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("drawCallback");

            loadAndInlineImages = spyOn(rasterizeHTML, "loadAndInlineImages").andCallFake(callbackCaller);
            loadAndInlineCSS = spyOn(rasterizeHTML, "loadAndInlineCSS").andCallFake(callbackCaller);
            loadAndInlineCSSReferences = spyOn(rasterizeHTML, "loadAndInlineCSSReferences").andCallFake(callbackCaller);
            getSvgForDocument = spyOn(rasterizeHTML, "getSvgForDocument").andReturn(svg);
            drawSvgToCanvas = spyOn(rasterizeHTML, "drawSvgToCanvas").andCallFake(function (svg, canvas, callback) {
                callback(canvas);
            });
        });

        it("should take a document, inline all displayable content and render to the given canvas", function () {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, canvas, callback);

            expect(loadAndInlineImages).toHaveBeenCalledWith(doc, null, jasmine.any(Function));
            expect(loadAndInlineCSS).toHaveBeenCalledWith(doc, null, jasmine.any(Function));
            expect(loadAndInlineCSSReferences).toHaveBeenCalledWith(doc, null, jasmine.any(Function));
            expect(getSvgForDocument).toHaveBeenCalledWith(doc, canvas.width, canvas.height);
            expect(drawSvgToCanvas).toHaveBeenCalledWith(svg, canvas, jasmine.any(Function));

            expect(callback).toHaveBeenCalledWith(canvas, []);
        });

        it("should take a document with optional baseUrl, inline all displayable content and render to the given canvas", function () {
            var doc = "doc";

            rasterizeHTML.drawDocument(doc, canvas, "a_baseUrl", callback);

            expect(loadAndInlineImages).toHaveBeenCalledWith(doc, "a_baseUrl", jasmine.any(Function));
            expect(loadAndInlineCSS).toHaveBeenCalledWith(doc, "a_baseUrl", jasmine.any(Function));
            expect(loadAndInlineCSSReferences).toHaveBeenCalledWith(doc, "a_baseUrl", jasmine.any(Function));
            expect(getSvgForDocument).toHaveBeenCalledWith(doc, canvas.width, canvas.height);
            expect(drawSvgToCanvas).toHaveBeenCalledWith(svg, canvas, jasmine.any(Function));

            expect(callback).toHaveBeenCalledWith(canvas, []);
        });

        it("should make callback optional for drawDocument", function () {
            rasterizeHTML.drawDocument("doc", canvas, "a_baseUrl");
        });

        it("should take a HTML string, inline all displayable content and render to the given canvas", function () {
            var html = "<head><title>a title</title></head><body>some html</body>",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, baseUrl, callback) {
                    callback(canvas, []);
                });

            rasterizeHTML.drawHTML(html, canvas, callback);

            expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), canvas, null, callback);
            expect(drawDocumentSpy.mostRecentCall.args[0].documentElement.innerHTML).toEqual(html);

            expect(callback).toHaveBeenCalledWith(canvas, []);
        });

        it("should take a HTML string with optional baseUrl, inline all displayable content and render to the given canvas", function () {
            var html = "<head><title>a title</title></head><body>some html</body>",
                drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, baseUrl, callback) {
                    callback(canvas, []);
                });

            rasterizeHTML.drawHTML(html, canvas, "a_baseUrl", callback);

            expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), canvas, "a_baseUrl", callback);
            expect(drawDocumentSpy.mostRecentCall.args[0].documentElement.innerHTML).toEqual(html);

            expect(callback).toHaveBeenCalledWith(canvas, []);
        });

        it("should make callback optional for drawHTML", function () {
            rasterizeHTML.drawHTML("<html></html>", canvas, "a_baseUrl");
        });

        it("should take a URL, inline all displayable content and render to the given canvas", function () {
            var finished = false,
                drawHtmlSpy = spyOn(rasterizeHTML, "drawHTML").andCallFake(function (html, canvas, baseUrl, callback) {
                    callback(canvas, []);
                });

            ajaxSpy.andCallFake(function (url, success, error) {
                success("some html");
            });

            rasterizeHTML.drawURL("fixtures/image.html", canvas, callback);

            expect(callback).toHaveBeenCalledWith(canvas, []);
            expect(drawHtmlSpy).toHaveBeenCalledWith("some html", canvas, "fixtures/image.html", callback);
        });

        it("should make callback optional for drawURL", function () {
            ajaxSpy.andCallFake(function (url, success, error) {
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
            drawSvgToCanvas = spyOn(rasterizeHTML, "drawSvgToCanvas").andCallFake(function (svg, canvas, callback) {
                callback(canvas);
            });
        });

        it("should pass through an error from inlining on drawDocument", function () {
            var doc = "doc";

            loadAndInlineImages = spyOn(rasterizeHTML, "loadAndInlineImages").andCallFake(function (doc, baseUrl, callback) {
                callback(["the error"]);
            });
            loadAndInlineCSS = spyOn(rasterizeHTML, "loadAndInlineCSS").andCallFake(callbackCaller);
            loadAndInlineCSSReferences = spyOn(rasterizeHTML, "loadAndInlineCSSReferences").andCallFake(callbackCaller);

            rasterizeHTML.drawDocument(doc, canvas, callback);

            expect(loadAndInlineImages).toHaveBeenCalled();

            expect(callback).toHaveBeenCalledWith(canvas, ["the error"]);
        });

        it("should pass through multiple errors from inlining on drawDocument", function () {
            var doc = "doc";

            loadAndInlineImages = spyOn(rasterizeHTML, "loadAndInlineImages").andCallFake(function (doc, baseUrl, callback) {
                callback(["the error"]);
            });
            loadAndInlineCSS = spyOn(rasterizeHTML, "loadAndInlineCSS").andCallFake(function (doc, baseUrl, callback) {
                callback(["another error"]);
            });
            loadAndInlineCSSReferences = spyOn(rasterizeHTML, "loadAndInlineCSSReferences").andCallFake(function (doc, baseUrl, callback) {
                callback(["yet another error", "and even more"]);
            });

            rasterizeHTML.drawDocument(doc, canvas, callback);

            expect(loadAndInlineImages).toHaveBeenCalled();

            expect(callback).toHaveBeenCalledWith(canvas, ["the error", "another error", "yet another error", "and even more"]);
        });

        it("should pass through errors from drawHTML", function () {
            var drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, baseUrl, callback) {
                    callback(canvas, ["an error"]);
                });

            rasterizeHTML.drawHTML("", canvas, callback);

            expect(drawDocumentSpy).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(canvas, ["an error"]);
        });

        it("should pass through errors from drawURL", function () {
            var callback = jasmine.createSpy("callback"),
                drawHtmlSpy = spyOn(rasterizeHTML, "drawHTML").andCallFake(function (html, canvas, baseUrl, callback) {
                    callback(canvas, ["some error"]);
                });

            ajaxSpy.andCallFake(function (url, success, error) {
                success();
            });

            rasterizeHTML.drawURL("fixtures/image.html", canvas, callback);

            expect(drawHtmlSpy).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(canvas, ["some error"]);
        });

        it("should report an error on loading a broken URL", function () {
            var callback = jasmine.createSpy("callback"),
                drawHtmlSpy = spyOn(rasterizeHTML, "drawHTML");

            ajaxSpy.andCallFake(function (url, success, error) {
                error();
            });

            rasterizeHTML.drawURL("non_existing.html", canvas, callback);

            expect(drawHtmlSpy).not.toHaveBeenCalled();
            expect(ajaxSpy).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(canvas, [{
                resourceType: "page",
                url: "non_existing.html"
            }]);
        });
    });
});
