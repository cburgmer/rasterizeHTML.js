describe("Main interface of rasterizeHTML.js", function () {
    var callbackCaller = function (doc, baseUrl, callback) { callback(); },
        svg = "the svg",
        loadAndInlineImages, loadAndInlineCSS, loadAndInlineCSSReferences,
        getSvgForDocument, drawSvgToCanvas;

    beforeEach(function () {
        loadAndInlineImages = spyOn(rasterizeHTML, "loadAndInlineImages").andCallFake(callbackCaller);
        loadAndInlineCSS = spyOn(rasterizeHTML, "loadAndInlineCSS").andCallFake(callbackCaller);
        loadAndInlineCSSReferences = spyOn(rasterizeHTML, "loadAndInlineCSSReferences").andCallFake(callbackCaller);
        getSvgForDocument = spyOn(rasterizeHTML, "getSvgForDocument").andReturn(svg);
        drawSvgToCanvas = spyOn(rasterizeHTML, "drawSvgToCanvas").andCallFake(function (svg, canvas, callback) {
            callback(canvas);
        });
    });

    it("should take a document, inline all displayable content and render to the given canvas", function () {
        var doc = "doc",
            canvas = document.createElement("canvas"),
            callback = jasmine.createSpy("drawDocumentCallback");

        rasterizeHTML.drawDocument(doc, canvas, callback);

        expect(loadAndInlineImages).toHaveBeenCalledWith(doc, null, jasmine.any(Function));
        expect(loadAndInlineCSS).toHaveBeenCalledWith(doc, null, jasmine.any(Function));
        expect(loadAndInlineCSSReferences).toHaveBeenCalledWith(doc, null, jasmine.any(Function));
        expect(getSvgForDocument).toHaveBeenCalledWith(doc, canvas.width, canvas.height);
        expect(drawSvgToCanvas).toHaveBeenCalledWith(svg, canvas, jasmine.any(Function));

        expect(callback).toHaveBeenCalledWith(canvas);
    });

    it("should take a document with optional baseUrl, inline all displayable content and render to the given canvas", function () {
        var doc = "doc",
            canvas = document.createElement("canvas"),
            callback = jasmine.createSpy("drawDocumentCallback");

        rasterizeHTML.drawDocument(doc, canvas, "a_baseUrl", callback);

        expect(loadAndInlineImages).toHaveBeenCalledWith(doc, "a_baseUrl", jasmine.any(Function));
        expect(loadAndInlineCSS).toHaveBeenCalledWith(doc, "a_baseUrl", jasmine.any(Function));
        expect(loadAndInlineCSSReferences).toHaveBeenCalledWith(doc, "a_baseUrl", jasmine.any(Function));
        expect(getSvgForDocument).toHaveBeenCalledWith(doc, canvas.width, canvas.height);
        expect(drawSvgToCanvas).toHaveBeenCalledWith(svg, canvas, jasmine.any(Function));

        expect(callback).toHaveBeenCalledWith(canvas);
    });

    it("should take a HTML string, inline all displayable content and render to the given canvas", function () {
        var html = "<head><title>a title</title></head><body>some html</body>",
            canvas = document.createElement("canvas"),
            callback = jasmine.createSpy("drawDocumentCallback"),
            drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, baseUrl, callback) {
                callback(canvas);
            });

        rasterizeHTML.drawHTML(html, canvas, callback);

        expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), canvas, null, callback);
        expect(drawDocumentSpy.mostRecentCall.args[0].documentElement.innerHTML).toEqual(html);

        expect(callback).toHaveBeenCalledWith(canvas);
    });

    it("should take a HTML string with optional baseUrl, inline all displayable content and render to the given canvas", function () {
        var html = "<head><title>a title</title></head><body>some html</body>",
            canvas = document.createElement("canvas"),
            callback = jasmine.createSpy("drawDocumentCallback"),
            drawDocumentSpy = spyOn(rasterizeHTML, "drawDocument").andCallFake(function (doc, canvas, baseUrl, callback) {
                callback(canvas);
            });

        rasterizeHTML.drawHTML(html, canvas, "a_baseUrl", callback);

        expect(drawDocumentSpy).toHaveBeenCalledWith(jasmine.any(Object), canvas, "a_baseUrl", callback);
        expect(drawDocumentSpy.mostRecentCall.args[0].documentElement.innerHTML).toEqual(html);

        expect(callback).toHaveBeenCalledWith(canvas);
    });

    it("should take a URL, inline all displayable content and render to the given canvas", function () {
        var canvas = document.createElement("canvas"),
            finished = false,
            callback = function (canvas) {
                finished = true;
            },
            drawHtmlSpy = spyOn(rasterizeHTML, "drawHTML").andCallFake(function (html, canvas, baseUrl, callback) {
                callback(canvas);
            });

        rasterizeHTML.drawURL("fixtures/image.html", canvas, callback);

        waitsFor(function() {
            return finished;
        });

        runs(function() {
            expect(drawHtmlSpy).toHaveBeenCalledWith(readFixtures("image.html"), canvas, "fixtures/image.html", callback);
        });
    });
});
