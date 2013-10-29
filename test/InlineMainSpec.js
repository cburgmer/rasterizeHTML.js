describe("Inline main", function () {
    var callbackCaller = function (doc, options, callback) { callback([]); },
        callback = jasmine.createSpy("callback"),
        loadAndInlineImages, loadAndInlineCssLinks, loadAndInlineStyles, loadAndInlineScript;

    beforeEach(function () {
        loadAndInlineImages = spyOn(rasterizeHTMLInline, "loadAndInlineImages");
        loadAndInlineCssLinks = spyOn(rasterizeHTMLInline, "loadAndInlineCssLinks");
        loadAndInlineStyles = spyOn(rasterizeHTMLInline, "loadAndInlineStyles");
        loadAndInlineScript = spyOn(rasterizeHTMLInline, "loadAndInlineScript");
    });

    it("should inline all resources", function () {
        var doc = "doc";

        loadAndInlineImages.andCallFake(callbackCaller);
        loadAndInlineCssLinks.andCallFake(callbackCaller);
        loadAndInlineStyles.andCallFake(callbackCaller);
        loadAndInlineScript.andCallFake(callbackCaller);

        rasterizeHTMLInline.inlineReferences(doc, {}, callback);

        expect(loadAndInlineImages).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
        expect(loadAndInlineCssLinks).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
        expect(loadAndInlineStyles).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
        expect(loadAndInlineScript).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));

        expect(callback).toHaveBeenCalledWith([]);
    });

    it("should pass on options", function () {
        var doc = "doc";

        loadAndInlineImages.andCallFake(callbackCaller);
        loadAndInlineCssLinks.andCallFake(callbackCaller);
        loadAndInlineStyles.andCallFake(callbackCaller);
        loadAndInlineScript.andCallFake(callbackCaller);

        rasterizeHTMLInline.inlineReferences(doc, {baseUrl: "a_baseUrl", cache: 'none'}, callback);

        expect(loadAndInlineImages).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none'}, jasmine.any(Function));
        expect(loadAndInlineCssLinks).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none'}, jasmine.any(Function));
        expect(loadAndInlineStyles).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none'}, jasmine.any(Function));
        expect(loadAndInlineScript).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none'}, jasmine.any(Function));

        expect(callback).toHaveBeenCalledWith([]);
    });

    it("should pass through an error from inlining", function () {
        var doc = "doc";

        loadAndInlineImages.andCallFake(function (doc, options, callback) {
            callback(["the error"]);
        });
        loadAndInlineCssLinks.andCallFake(callbackCaller);
        loadAndInlineStyles.andCallFake(callbackCaller);
        loadAndInlineScript.andCallFake(callbackCaller);

        rasterizeHTMLInline.inlineReferences(doc, {}, callback);

        expect(callback).toHaveBeenCalledWith(["the error"]);
    });

    it("should pass through multiple errors from inlining on drawDocument", function () {
        var doc = "doc";

        loadAndInlineImages.andCallFake(function (doc, options, callback) {
            callback(["the error"]);
        });
        loadAndInlineStyles.andCallFake(function (doc, options, callback) {
            callback(["more error"]);
        });
        loadAndInlineCssLinks.andCallFake(function (doc, options, callback) {
            callback(["another error"]);
        });
        loadAndInlineScript.andCallFake(function (doc, options, callback) {
            callback(["error from script"]);
        });

        rasterizeHTMLInline.inlineReferences(doc, {}, callback);

        expect(callback).toHaveBeenCalledWith(["the error", "more error", "another error", "error from script"]);
    });

    it("should optionally not inline scripts", function () {
        var doc = "doc";

        loadAndInlineImages.andCallFake(callbackCaller);
        loadAndInlineCssLinks.andCallFake(callbackCaller);
        loadAndInlineStyles.andCallFake(callbackCaller);

        rasterizeHTMLInline.inlineReferences(doc, {inlineScripts: false}, callback);

        expect(callback).toHaveBeenCalledWith([]);

        expect(loadAndInlineScript).not.toHaveBeenCalled();
    });
});
