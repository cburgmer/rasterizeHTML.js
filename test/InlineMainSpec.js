describe("Inline main", function () {
    var callbackCaller = function (doc, options, callback) { callback([]); },
        callback = jasmine.createSpy("callback"),
        loadAndInlineImages, loadAndInlineCSS, loadAndInlineCSSImports, loadAndInlineCSSReferences, loadAndInlineScript;

    beforeEach(function () {
        loadAndInlineImages = spyOn(rasterizeHTMLInline, "loadAndInlineImages");
        loadAndInlineCSS = spyOn(rasterizeHTMLInline, "loadAndInlineCSS");
        loadAndInlineCSSImports = spyOn(rasterizeHTMLInline, "loadAndInlineCSSImports");
        loadAndInlineCSSReferences = spyOn(rasterizeHTMLInline, "loadAndInlineCSSReferences");
        loadAndInlineScript = spyOn(rasterizeHTMLInline, "loadAndInlineScript");
    });

    it("should inline all resources", function () {
        var doc = "doc";

        loadAndInlineImages.andCallFake(callbackCaller);
        loadAndInlineCSS.andCallFake(callbackCaller);
        loadAndInlineCSSImports.andCallFake(callbackCaller);
        loadAndInlineCSSReferences.andCallFake(callbackCaller);
        loadAndInlineScript.andCallFake(callbackCaller);

        rasterizeHTMLInline.inlineReferences(doc, {}, callback);

        expect(loadAndInlineImages).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
        expect(loadAndInlineCSS).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
        expect(loadAndInlineCSSImports).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
        expect(loadAndInlineCSSReferences).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
        expect(loadAndInlineScript).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));

        expect(callback).toHaveBeenCalledWith([]);
    });

    it("should pass on options", function () {
        var doc = "doc";

        loadAndInlineImages.andCallFake(callbackCaller);
        loadAndInlineCSS.andCallFake(callbackCaller);
        loadAndInlineCSSImports.andCallFake(callbackCaller);
        loadAndInlineCSSReferences.andCallFake(callbackCaller);
        loadAndInlineScript.andCallFake(callbackCaller);

        rasterizeHTMLInline.inlineReferences(doc, {baseUrl: "a_baseUrl", cache: false}, callback);

        expect(loadAndInlineImages).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: false}, jasmine.any(Function));
        expect(loadAndInlineCSS).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: false}, jasmine.any(Function));
        expect(loadAndInlineCSSImports).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: false}, jasmine.any(Function));
        expect(loadAndInlineCSSReferences).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: false}, jasmine.any(Function));
        expect(loadAndInlineScript).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: false}, jasmine.any(Function));

        expect(callback).toHaveBeenCalledWith([]);
    });

    it("should pass through an error from inlining", function () {
        var doc = "doc";

        loadAndInlineImages.andCallFake(function (doc, options, callback) {
            callback(["the error"]);
        });
        loadAndInlineCSS.andCallFake(callbackCaller);
        loadAndInlineCSSImports.andCallFake(callbackCaller);
        loadAndInlineCSSReferences.andCallFake(callbackCaller);
        loadAndInlineScript.andCallFake(callbackCaller);

        rasterizeHTMLInline.inlineReferences(doc, {}, callback);

        expect(callback).toHaveBeenCalledWith(["the error"]);
    });

    it("should pass through multiple errors from inlining on drawDocument", function () {
        var doc = "doc";

        loadAndInlineImages.andCallFake(function (doc, options, callback) {
            callback(["the error"]);
        });
        loadAndInlineCSS.andCallFake(function (doc, options, callback) {
            callback(["another error"]);
        });
        loadAndInlineCSSImports.andCallFake(function (doc, options, callback) {
            callback(["more error"]);
        });
        loadAndInlineCSSReferences.andCallFake(function (doc, options, callback) {
            callback(["yet another error", "and even more"]);
        });
        loadAndInlineScript.andCallFake(function (doc, options, callback) {
            callback(["error from script"]);
        });

        rasterizeHTMLInline.inlineReferences(doc, {}, callback);

        expect(callback).toHaveBeenCalledWith(["the error", "another error", "more error", "yet another error", "and even more", "error from script"]);
    });
});
