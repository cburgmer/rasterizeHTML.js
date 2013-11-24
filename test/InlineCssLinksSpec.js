describe("Inline CSS links", function () {
    var doc, anotherCssLink, cssLink, extractCssUrlSpy, joinUrlSpy, ajaxSpy,
        adjustPathsOfCssResourcesSpy, loadCSSImportsForRulesSpy, loadAndInlineCSSResourcesForRulesSpy,
        callback;

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        extractCssUrlSpy = spyOn(rasterizeHTMLInline.css, "extractCssUrl").andCallFake(function (cssUrl) {
            if (/^url/.test(cssUrl)) {
                return cssUrl.replace(/^url\("?/, '').replace(/"?\)$/, '');
            } else {
                throw "error";
            }
        });
        joinUrlSpy = spyOn(rasterizeHTMLInline.util, "joinUrl");
        ajaxSpy = spyOn(rasterizeHTMLInline.util, "ajax");
        adjustPathsOfCssResourcesSpy = spyOn(rasterizeHTMLInline.css, 'adjustPathsOfCssResources');
        loadCSSImportsForRulesSpy = spyOn(rasterizeHTMLInline.css, 'loadCSSImportsForRules').andCallFake(function (cssRules, alreadyLoadedCssUrls, options, callback) {
            callback(false, []);
        });
        loadAndInlineCSSResourcesForRulesSpy = spyOn(rasterizeHTMLInline.css, 'loadAndInlineCSSResourcesForRules').andCallFake(function (cssRules, options, callback) {
            callback(false, []);
        });

        callback = jasmine.createSpy("loadAndInlineCssCallback");

        cssLink = window.document.createElement("link");
        cssLink.href = "url/some.css";
        cssLink.rel = "stylesheet";
        cssLink.type = "text/css";

        anotherCssLink = window.document.createElement("link");
        anotherCssLink.href = "url/another.css";
        anotherCssLink.rel = "stylesheet";
        anotherCssLink.type = "text/css";

        ajaxSpy.andCallFake(function (url, options, success, error) {
            // href will return absolute path, attributes.href.nodeValue relative one
            if (url === cssLink.href || url === cssLink.attributes.href.nodeValue) {
                success("p { font-size: 14px; }");
            } else if (url === anotherCssLink.href || url === anotherCssLink.attributes.href.nodeValue) {
                success("a { text-decoration: none; }");
            } else {
                error(url);
            }
        });
    });

    var mockAjaxWithSuccess = function (text) {
        ajaxSpy.andCallFake(function (url, options, success) {
            success(text);
        });
    };

    it("should do nothing if no linked CSS is found", function () {
        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
    });

    it("should not touch non-CSS links", function () {
        var faviconLink = window.document.createElement("link");
        faviconLink.href = "favicon.ico";
        faviconLink.type = "image/x-icon";

        doc.head.appendChild(faviconLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
        expect(doc.head.getElementsByTagName("link").length).toEqual(1);
    });

    it("should inline linked CSS", function () {
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should inline linked CSS without a type", function () {
        var noTypeCssLink = window.document.createElement("link");
        noTypeCssLink.href = cssLink.href;
        noTypeCssLink.rel = "stylesheet";

        doc.head.appendChild(noTypeCssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should inline multiple linked CSS and keep order", function () {
        var inlineCss = window.document.createElement("style");

        inlineCss.type = "text/css";
        inlineCss.textContent = "span { margin: 0; }";

        doc.head.appendChild(cssLink);
        doc.head.appendChild(inlineCss);
        doc.head.appendChild(anotherCssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(3);
        expect(doc.head.getElementsByTagName("style")[0].textContent.trim()).toEqual("p { font-size: 14px; }");
        expect(doc.head.getElementsByTagName("style")[1].textContent.trim()).toEqual("span { margin: 0; }");
        expect(doc.head.getElementsByTagName("style")[2].textContent.trim()).toEqual("a { text-decoration: none; }");
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should not add inline CSS if no content given", function () {
        var emptyCssLink = window.document.createElement("link");
        emptyCssLink.href = "url/empty.css";
        emptyCssLink.rel = "stylesheet";
        emptyCssLink.type = "text/css";

        doc.head.appendChild(emptyCssLink);

        // Circumvent Firefox having an issue locally loading empty files and returning a "404" instead.
        ajaxSpy.andCallFake(function (url, options, success) {
            success("");
        });

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback());

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should inline CSS imports", function () {
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalled();
        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[0][0].cssText).toMatch(/p \{\s*font-size: 14px;\s*\}/);
    });

    it("should inline CSS resources", function () {
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[0][0].cssText).toMatch(/p \{\s*font-size: 14px;\s*\}/);
    });

    it("should respect the document's baseURI when loading linked CSS", function () {
        var getDocumentBaseUrlSpy = spyOn(rasterizeHTMLInline.util, 'getDocumentBaseUrl').andCallThrough();

        mockAjaxWithSuccess("p { font-size: 14px; }");

        doc = rasterizeHTMLTestHelper.readDocumentFixture("externalCSS.html");

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.getElementsByTagName("style").length).toEqual(1);
        expect(doc.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
        expect(doc.getElementsByTagName("link").length).toEqual(0);

        expect(ajaxSpy.mostRecentCall.args[1].baseUrl).toEqual(doc.baseURI);
        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[2].baseUrl).toEqual(doc.baseURI);
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[1].baseUrl).toEqual(doc.baseURI);
        expect(getDocumentBaseUrlSpy).toHaveBeenCalledWith(doc);
    });

    it("should respect optional baseUrl when loading linked CSS", function () {
        mockAjaxWithSuccess("p { font-size: 14px; }");

        doc = rasterizeHTMLTestHelper.readDocumentFixtureWithoutBaseURI("externalCSS.html");

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {baseUrl: jasmine.getFixtures().fixturesPath}, callback);

        expect(callback).toHaveBeenCalled();
        expect(ajaxSpy.mostRecentCall.args[1].baseUrl).toEqual(jasmine.getFixtures().fixturesPath);

        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[2].baseUrl).toEqual(jasmine.getFixtures().fixturesPath);
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[1].baseUrl).toEqual(jasmine.getFixtures().fixturesPath);
    });

    it("should favour explicit baseUrl over document.baseURI when loading linked CSS", function () {
        var baseUrl = jasmine.getFixtures().fixturesPath;

        mockAjaxWithSuccess("p { font-size: 14px; }");

        doc = rasterizeHTMLTestHelper.readDocumentFixture("externalCSS.html");
        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {baseUrl: jasmine.getFixtures().fixturesPath}, callback);

        expect(callback).toHaveBeenCalled();
        expect(ajaxSpy.mostRecentCall.args[1].baseUrl).toEqual(jasmine.getFixtures().fixturesPath);

        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[2].baseUrl).toEqual(jasmine.getFixtures().fixturesPath);
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[1].baseUrl).toEqual(jasmine.getFixtures().fixturesPath);
    });

    it("should map resource paths relative to the stylesheet", function () {
        var cssWithRelativeResource;

        cssWithRelativeResource = window.document.createElement("link");
        cssWithRelativeResource.href = "below/some.css";
        cssWithRelativeResource.rel = "stylesheet";
        cssWithRelativeResource.type = "text/css";

        doc.head.appendChild(cssWithRelativeResource);

        ajaxSpy.andCallFake(function (url, options, success) {
            if (url === "below/some.css" && options.baseUrl === "some_url/") {
                success('div { background-image: url("../green.png"); }\n' +
                    '@font-face { font-family: "test font"; src: url("fake.woff"); }');
            }
        });

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {baseUrl: "some_url/"}, callback);

        expect(adjustPathsOfCssResourcesSpy).toHaveBeenCalledWith("below/some.css", jasmine.any(Object));
    });

    it("should circumvent caching if requested", function () {
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {cache: 'none'}, callback);

        expect(ajaxSpy).toHaveBeenCalledWith(cssLink.attributes.href.nodeValue, {
            cache: 'none'
        }, jasmine.any(Function), jasmine.any(Function));
        expect(callback).toHaveBeenCalled();

        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[2].cache).toEqual('none');
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[1].cache).toEqual('none');
    });

    it("should not circumvent caching by default", function () {
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(ajaxSpy).toHaveBeenCalledWith(cssLink.attributes.href.nodeValue, {}, jasmine.any(Function), jasmine.any(Function));
        expect(callback).toHaveBeenCalled();

        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[2].cache).not.toBe(false);
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[1].cache).not.toBe(false);
    });

    it("should cache inlined content if a cache bucket is given", function () {
        var cacheBucket = {};

        // first call
        doc = document.implementation.createHTMLDocument("");
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {cacheBucket: cacheBucket}, callback);
        expect(ajaxSpy).toHaveBeenCalled();

        ajaxSpy.reset();
        loadCSSImportsForRulesSpy.reset();
        loadAndInlineCSSResourcesForRulesSpy.reset();

        // second call
        doc = document.implementation.createHTMLDocument("");
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {cacheBucket: cacheBucket}, callback);

        expect(ajaxSpy).not.toHaveBeenCalled();
        expect(loadCSSImportsForRulesSpy).not.toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy).not.toHaveBeenCalled();

        expect(doc.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
    });

    it("should cache inlined content for different pages if baseUrl is the same", function () {
        var cacheBucket = {};

        joinUrlSpy.andCallThrough();

        // first call
        doc = rasterizeHTMLTestHelper.readDocumentFixture("empty1.html");
        doc.getElementsByTagName("head")[0].appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {cacheBucket: cacheBucket}, callback);

        ajaxSpy.reset();
        loadCSSImportsForRulesSpy.reset();
        loadAndInlineCSSResourcesForRulesSpy.reset();

        // second call
        doc = rasterizeHTMLTestHelper.readDocumentFixture("empty2.html"); // use a document with different url, but same baseUrl
        doc.getElementsByTagName("head")[0].appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {cacheBucket: cacheBucket}, callback);

        expect(ajaxSpy).not.toHaveBeenCalled();
        expect(loadCSSImportsForRulesSpy).not.toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy).not.toHaveBeenCalled();

        expect(doc.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
    });

    it("should not cache inlined content if caching turned off", function () {
        var cacheBucket = {};

        // first call
        doc = document.implementation.createHTMLDocument("");
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {cacheBucket: cacheBucket, cache: 'none'}, callback);
        expect(ajaxSpy).toHaveBeenCalled();

        ajaxSpy.reset();

        // second call
        doc = document.implementation.createHTMLDocument("");
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {cacheBucket: cacheBucket, cache: 'none'}, callback);

        expect(ajaxSpy).toHaveBeenCalled();
    });

    describe("error handling", function () {
        var brokenCssLink, anotherBrokenCssLink;

        beforeEach(function () {
            brokenCssLink = window.document.createElement("link");
            brokenCssLink.href = "a_document_that_doesnt_exist.css";
            brokenCssLink.rel = "stylesheet";
            brokenCssLink.type = "text/css";

            anotherBrokenCssLink = window.document.createElement("link");
            anotherBrokenCssLink.href = "another_document_that_doesnt_exist.css";
            anotherBrokenCssLink.rel = "stylesheet";
            anotherBrokenCssLink.type = "text/css";

            joinUrlSpy.andCallThrough();
        });

        it("should report an error if a stylesheet could not be loaded", function () {
            doc.head.appendChild(brokenCssLink);

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, {baseUrl: "some_base_url/"}, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "stylesheet",
                url: "some_base_url/a_document_that_doesnt_exist.css",
                msg: "Unable to load stylesheet some_base_url/a_document_that_doesnt_exist.css"
            }]);
        });

        it("should only report a failing stylesheet as error", function () {
            doc.head.appendChild(brokenCssLink);
            doc.head.appendChild(cssLink);

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "stylesheet",
                url: "a_document_that_doesnt_exist.css",
                msg: jasmine.any(String)
            }]);
        });

        it("should report multiple failing stylesheets as error", function () {
            doc.head.appendChild(brokenCssLink);
            doc.head.appendChild(anotherBrokenCssLink);

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

            expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
            expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
        });

        it("should report errors from inlining resources", function () {
            doc.head.appendChild(cssLink);

            loadCSSImportsForRulesSpy.andCallFake(function (cssRules, alreadyLoadedCssUrls, options, callback) {
                callback(false, ["import inline error"]);
            });
            loadAndInlineCSSResourcesForRulesSpy.andCallFake(function (cssRules, options, callback) {
                callback(false, ["resource inline error"]);
            });

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

            expect(callback).toHaveBeenCalledWith(["import inline error", "resource inline error"]);
        });

        it("should report an empty list for a successful stylesheet", function () {
            doc.head.appendChild(cssLink);

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

            expect(callback).toHaveBeenCalledWith([]);
        });

        it("should cache errors alongside if a cache bucket is given", function () {
            var cacheBucket = {};

            loadCSSImportsForRulesSpy.andCallFake(function (cssRules, alreadyLoadedCssUrls, options, callback) {
                callback(false, ["import inline error"]);
            });

            // first call
            doc = document.implementation.createHTMLDocument("");
            doc.head.appendChild(cssLink);

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, {cacheBucket: cacheBucket}, function () {});

            // second call
            doc = document.implementation.createHTMLDocument("");
            doc.head.appendChild(cssLink);

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, {cacheBucket: cacheBucket}, callback);

            expect(callback).toHaveBeenCalledWith(["import inline error"]);
        });
    });
});
