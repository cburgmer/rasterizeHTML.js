describe("CSS references inline", function () {
    var doc, loadAndInlineCSSResourcesForRulesSpy, callback;

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        loadAndInlineCSSResourcesForRulesSpy = spyOn(rasterizeHTMLInline, 'loadAndInlineCSSResourcesForRules');

        callback = jasmine.createSpy("callback");
    });

    it("should do nothing if no CSS is found", function () {
        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
    });

    it("should not touch unrelated CSS", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, "span { padding-left: 0; }");

        loadAndInlineCSSResourcesForRulesSpy.andCallFake(function(rules, baseUrl, cache, callback) {
            rules[0] = "something else";
            callback(false, []);
        });

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("span { padding-left: 0; }");
    });

    it("should report errors", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("anImage.png"); }');

        loadAndInlineCSSResourcesForRulesSpy.andCallFake(function (cssRules, baseUrl, cache, callback) {
            callback(false, ["error"]);
        });

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(callback).toHaveBeenCalledWith(["error"]);
    });

    it("should circumvent caching if requested", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("anImage.png"); }');

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, {cache: false}, callback);

        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[2]).toBeFalsy();
    });

    it("should not circumvent caching by default", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("anImage.png"); }');

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[2]).toBeTruthy();
    });

    it("should respect the document's baseURI when loading the background-image", function () {
        doc = rasterizeHTMLTestHelper.readDocumentFixture("backgroundImage.html");

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalledWith(jasmine.any(Object), doc.baseURI, true, jasmine.any(Function));
    });

    it("should respect optional baseUrl when loading the background-image", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("anImage.png"); }');

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, {baseUrl: "aBaseURI"}, callback);

        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalledWith(jasmine.any(Object), "aBaseURI", true, jasmine.any(Function));
    });

    it("should favour explicit baseUrl over document.baseURI when loading the background-image", function () {
        var baseUrl = "aBaseURI";

        doc = rasterizeHTMLTestHelper.readDocumentFixture("backgroundImage.html");
        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, {baseUrl: baseUrl}, callback);

        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalledWith(jasmine.any(Object), baseUrl, true, jasmine.any(Function));
    });

    it("should add a workaround for Webkit to account for first CSS rules being ignored on background-images", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

        loadAndInlineCSSResourcesForRulesSpy.andCallFake(function(rules, baseUrl, cache, callback) {
            callback(true, []);
        });

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        if (window.navigator.userAgent.indexOf("WebKit") >= 0) {
            expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/^span \{\}/);
        } else {
            expect(doc.head.getElementsByTagName("style")[0].textContent).not.toMatch(/^span \{\}/);
        }
    });

    it("should add a workaround for Webkit to account for first CSS rules being ignored on font face", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "RaphaelIcons"; src: url("data:font/woff;base64,soMEfAkebASE64="); }');

        loadAndInlineCSSResourcesForRulesSpy.andCallFake(function(rules, baseUrl, cache, callback) {
            callback(true, []);
        });

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        if (window.navigator.userAgent.indexOf("WebKit") >= 0) {
            expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/^span \{\}/);
        } else {
            expect(doc.head.getElementsByTagName("style")[0].textContent).not.toMatch(/^span \{\}/);
        }
    });

    it("should inline a background-image", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("anImage.png"); }');

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[0][0].cssText).toMatch(/span \{\s*background-image: url\("?anImage.png"?\)\s*;\s*\}/);
    });

    it("should inline a background-image on a style element without a type", function () {
        var styleNode = doc.createElement("style");

        styleNode.appendChild(doc.createTextNode('span { background-image: url("anImage.png"); }'));
        doc.head.appendChild(styleNode);

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalled();
    });

    it("should inline a font", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: url("fake.woff"); }');

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[0][0].cssText).toMatch(/@font-face \{\s*font-family: ["']test font["'];\s*src: url\("?fake.woff"?\)\s*;\s*\}/);
    });

});
