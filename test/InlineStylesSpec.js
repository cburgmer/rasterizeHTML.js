describe("Impor styles", function () {
    var doc, loadCSSImportsForRulesSpy, loadAndInlineCSSResourcesForRulesSpy, workAroundWebkitBugIgnoringTheFirstRuleInCSSSpy, callback;

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        loadCSSImportsForRulesSpy = spyOn(rasterizeHTMLInline.css, 'loadCSSImportsForRules').andCallFake(function (cssRules, baseUrl, cache, alreadyLoadedCssUrls, callback) {
            callback(false, []);
        });
        loadAndInlineCSSResourcesForRulesSpy = spyOn(rasterizeHTMLInline.css, 'loadAndInlineCSSResourcesForRules').andCallFake(function (cssRules, baseUrl, cache, callback) {
            callback(false, []);
        });
        workAroundWebkitBugIgnoringTheFirstRuleInCSSSpy = spyOn(rasterizeHTMLInline.css, 'workAroundWebkitBugIgnoringTheFirstRuleInCSS').andCallFake(function (content) {
            return content;
        });

        callback = jasmine.createSpy("callback");
    });

    it("should do nothing if no CSS is found", function () {
        rasterizeHTMLInline.loadAndInlineStyles(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(loadCSSImportsForRulesSpy).not.toHaveBeenCalled();
    });

    it("should not touch unrelated CSS", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, "span { padding-left: 0; }");

        loadCSSImportsForRulesSpy.andCallFake(function(rules, baseUrl, cache, includedList, callback) {
            rules[0] = "fake rule";
            callback(false, []);
        });
        loadAndInlineCSSResourcesForRulesSpy.andCallFake(function(rules, baseUrl, cache, callback) {
            rules[0] = "something else";
            callback(false, []);
        });

        rasterizeHTMLInline.loadAndInlineStyles(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("span { padding-left: 0; }");
    });

    it("should replace an import with the content of the given URL", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTMLInline.loadAndInlineStyles(doc, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalled();
        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[0][0].cssText).toMatch(/@import url\("?that.css"?\)\s*;/);
    });

    it("should inline css resources", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("anImage.png"); }');

        rasterizeHTMLInline.loadAndInlineStyles(doc, callback);

        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[0][0].cssText).toMatch(/span \{\s*background-image: url\("?anImage.png"?\)\s*;\s*\}/);
    });

    it("should accept a style element without a type", function () {
        var styleNode = doc.createElement("style");

        styleNode.appendChild(doc.createTextNode('@import url("imported.css");'));
        doc.head.appendChild(styleNode);

        rasterizeHTMLInline.loadAndInlineStyles(doc, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalled();
    });

    it("should apply workaround for WebKit", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

        loadAndInlineCSSResourcesForRulesSpy.andCallFake(function (cssRules, baseUrl, cache, callback) {
            callback(false, []);
        });

        workAroundWebkitBugIgnoringTheFirstRuleInCSSSpy.andCallFake(function () {
            return "workaround css";
        });

        rasterizeHTMLInline.loadAndInlineStyles(doc, callback);

        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("workaround css");
    });

    it("should respect the document's baseURI", function () {
        doc = rasterizeHTMLTestHelper.readDocumentFixture("importCss.html");

        rasterizeHTMLInline.loadAndInlineStyles(doc, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalledWith(jasmine.any(Object), doc.baseURI, true, [], jasmine.any(Function));
        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalledWith(jasmine.any(Object), doc.baseURI, true, jasmine.any(Function));
    });

    it("should favour explicit baseUrl over document.baseURI", function () {
        var baseUrl = "aBaseURI";

        doc = rasterizeHTMLTestHelper.readDocumentFixture("importCss.html");

        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        rasterizeHTMLInline.loadAndInlineStyles(doc, {baseUrl: baseUrl}, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalledWith(jasmine.any(Object), baseUrl, true, [], jasmine.any(Function));
        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalledWith(jasmine.any(Object), baseUrl, true, jasmine.any(Function));
    });

    it("should circumvent caching if requested", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTMLInline.loadAndInlineStyles(doc, {cache: false}, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalled();
        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[2]).toBeFalsy();
        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[2]).toBeFalsy();
    });

    it("should not circumvent caching by default", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTMLInline.loadAndInlineStyles(doc, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalled();
        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[2]).toBeTruthy();
        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[2]).toBeTruthy();
    });

    it("should report errors", function () {
        loadCSSImportsForRulesSpy.andCallFake(function(rules, baseUrl, cache, includedList, callback) {
            callback(false, ['import error']);
        });
        loadAndInlineCSSResourcesForRulesSpy.andCallFake(function (cssRules, baseUrl, cache, callback) {
            callback(false, ['resource error']);
        });

        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTMLInline.loadAndInlineStyles(doc, callback);

        expect(callback).toHaveBeenCalledWith(['import error', 'resource error']);
    });

});
