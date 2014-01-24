describe("Inline main", function () {
    var callbackCaller = function (doc, options, callback) { callback([]); },
        loadAndInlineImages, loadAndInlineCssLinks, loadAndInlineStyles, loadAndInlineScript;

    var withoutErrors = function () {
        return withErrors([]);
    };

    var withErrors = function (errors) {
        var defer = ayepromise.defer();
        defer.resolve(errors);
        return defer.promise;
    };

    beforeEach(function () {
        loadAndInlineImages = spyOn(rasterizeHTMLInline, "loadAndInlineImages");
        loadAndInlineCssLinks = spyOn(rasterizeHTMLInline, "loadAndInlineCssLinks");
        loadAndInlineStyles = spyOn(rasterizeHTMLInline, "loadAndInlineStyles");
        loadAndInlineScript = spyOn(rasterizeHTMLInline, "loadAndInlineScript");
    });

    it("should inline all resources", function (done) {
        var doc = "doc";

        loadAndInlineImages.andReturn(withoutErrors());
        loadAndInlineCssLinks.andCallFake(callbackCaller);
        loadAndInlineStyles.andCallFake(callbackCaller);
        loadAndInlineScript.andCallFake(callbackCaller);

        rasterizeHTMLInline.inlineReferences(doc, {}, function (errors) {
            expect(errors).toEqual([]);

            expect(loadAndInlineImages).toHaveBeenCalledWith(doc, {});
            expect(loadAndInlineCssLinks).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
            expect(loadAndInlineStyles).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));
            expect(loadAndInlineScript).toHaveBeenCalledWith(doc, {}, jasmine.any(Function));

            done();
        });
    });

    it("should pass on options", function (done) {
        var doc = "doc";

        loadAndInlineImages.andReturn(withoutErrors());
        loadAndInlineCssLinks.andCallFake(callbackCaller);
        loadAndInlineStyles.andCallFake(callbackCaller);
        loadAndInlineScript.andCallFake(callbackCaller);

        rasterizeHTMLInline.inlineReferences(doc, {baseUrl: "a_baseUrl", cache: 'none'}, function () {
            expect(loadAndInlineImages).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none'});
            expect(loadAndInlineCssLinks).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none'}, jasmine.any(Function));
            expect(loadAndInlineStyles).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none'}, jasmine.any(Function));
            expect(loadAndInlineScript).toHaveBeenCalledWith(doc, {baseUrl: "a_baseUrl", cache: 'none'}, jasmine.any(Function));

            done();
        });
    });

    it("should pass through an error from inlining", function (done) {
        var doc = "doc";

        loadAndInlineImages.andReturn(withErrors(["the error"]));
        loadAndInlineCssLinks.andCallFake(callbackCaller);
        loadAndInlineStyles.andCallFake(callbackCaller);
        loadAndInlineScript.andCallFake(callbackCaller);

        rasterizeHTMLInline.inlineReferences(doc, {}, function (errors) {
            expect(errors).toEqual(["the error"]);

            done();
        });
    });

    it("should pass through multiple errors from inlining on drawDocument", function (done) {
        var doc = "doc";

        loadAndInlineImages.andReturn(withErrors(["the error"]));
        loadAndInlineStyles.andCallFake(function (doc, options, callback) {
            callback(["more error"]);
        });
        loadAndInlineCssLinks.andCallFake(function (doc, options, callback) {
            callback(["another error"]);
        });
        loadAndInlineScript.andCallFake(function (doc, options, callback) {
            callback(["error from script"]);
        });

        rasterizeHTMLInline.inlineReferences(doc, {}, function (errors) {
            expect(errors).toEqual(["the error", "more error", "another error", "error from script"]);

            done();
        });
    });

    it("should optionally not inline scripts", function (done) {
        var doc = "doc";

        loadAndInlineImages.andReturn(withoutErrors());
        loadAndInlineCssLinks.andCallFake(callbackCaller);
        loadAndInlineStyles.andCallFake(callbackCaller);

        rasterizeHTMLInline.inlineReferences(doc, {inlineScripts: false}, function () {
            expect(loadAndInlineScript).not.toHaveBeenCalled();

            done();
        });
    });
});
