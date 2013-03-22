describe("CSS import inline", function () {
    var doc, loadCSSImportsForRulesSpy, callback;

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        loadCSSImportsForRulesSpy = spyOn(rasterizeHTMLInline, 'loadCSSImportsForRules');

        callback = jasmine.createSpy("callback");
    });

    it("should do nothing if no CSS is found", function () {
        rasterizeHTMLInline.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(loadCSSImportsForRulesSpy).not.toHaveBeenCalled();
    });

    it("should not touch unrelated CSS", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, "span { padding-left: 0; }");

        loadCSSImportsForRulesSpy.andCallFake(function(rules, baseUrl, cache, includedList, callback) {
            rules[0] = "fake rule";
            callback(false, []);
        });

        rasterizeHTMLInline.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("span { padding-left: 0; }");
    });

    it("should replace an import with the content of the given URL", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTMLInline.loadAndInlineCSSImports(doc, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalled();
        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[0][0].cssText).toMatch(/@import url\("?that.css"?\)\s*;/);
    });

    it("should follow import on a style element without a type", function () {
        var styleNode = doc.createElement("style");

        styleNode.appendChild(doc.createTextNode('@import url("imported.css");'));
        doc.head.appendChild(styleNode);

        rasterizeHTMLInline.loadAndInlineCSSImports(doc, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalled();
        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[0][0].cssText).toMatch(/@import url\("?imported.css"?\)\s*;/);
    });

    it("should respect the document's baseURI", function () {
        doc = rasterizeHTMLTestHelper.readDocumentFixture("importCss.html");

        rasterizeHTMLInline.loadAndInlineCSSImports(doc, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalledWith(jasmine.any(Object), doc.baseURI, true, [], jasmine.any(Function));
    });

    it("should favour explicit baseUrl over document.baseURI", function () {
        var baseUrl = "aBaseURI";

        doc = rasterizeHTMLTestHelper.readDocumentFixture("importCss.html");

        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        rasterizeHTMLInline.loadAndInlineCSSImports(doc, {baseUrl: baseUrl}, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalledWith(jasmine.any(Object), baseUrl, true, [], jasmine.any(Function));
    });

    it("should circumvent caching if requested", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTMLInline.loadAndInlineCSSImports(doc, {cache: false}, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalled();
        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[2]).toBeFalsy();
    });

    it("should not circumvent caching by default", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTMLInline.loadAndInlineCSSImports(doc, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalled();
        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[2]).toBeTruthy();
    });

    it("should report errors", function () {
        loadCSSImportsForRulesSpy.andCallFake(function(rules, baseUrl, cache, includedList, callback) {
            callback(false, ['errors']);
        });

        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTMLInline.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalledWith(['errors']);
    });

});
