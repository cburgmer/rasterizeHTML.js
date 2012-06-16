describe("Main interface of rasterizeHTML.js", function () {
    var callbackCaller = function (doc, callback) { callback(); },
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

        expect(loadAndInlineImages).toHaveBeenCalledWith(doc, jasmine.any(Function));
        expect(loadAndInlineCSS).toHaveBeenCalledWith(doc, jasmine.any(Function));
        expect(loadAndInlineCSSReferences).toHaveBeenCalledWith(doc, jasmine.any(Function));
        expect(getSvgForDocument).toHaveBeenCalledWith(doc, canvas.width, canvas.height);
        expect(drawSvgToCanvas).toHaveBeenCalledWith(svg, canvas, jasmine.any(Function));

        expect(callback).toHaveBeenCalledWith(canvas);
    });
});