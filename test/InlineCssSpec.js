describe("CSS inline", function () {
    var doc, cssLink,
        extractCssUrlSpy, joinUrlSpy, ajaxSpy, callback;

    var setUpAjaxSpyToLoadFixturesThroughTestSetup = function () {
        ajaxSpy.andCallFake(function (url, success, error) {
            var fixturesUrl = url.replace(rasterizeHTMLTestHelper.getBaseUri(), "").replace(jasmine.getFixtures().fixturesPath, "");

            try {
                success(rasterizeHTMLTestHelper.readFixturesOrFail(fixturesUrl));
            } catch (err) {
                error();
            }
        });
    };

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        extractCssUrlSpy = spyOn(rasterizeHTML.util, "extractCssUrl");
        joinUrlSpy = spyOn(rasterizeHTML.util, "joinUrl");
        ajaxSpy = spyOn(rasterizeHTML.util, "ajax");
        callback = jasmine.createSpy("loadAndInlineCssCallback");

        cssLink = window.document.createElement("link");
        cssLink.href = jasmine.getFixtures().fixturesPath + "some.css";
        cssLink.rel = "stylesheet";
        cssLink.type = "text/css";
    });

    it("should do nothing if no linked CSS is found", function () {
        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
    });

    it("should not touch non-CSS links", function () {
        var faviconLink = window.document.createElement("link");
        faviconLink.href = "favicon.ico";
        faviconLink.type = "image/x-icon";

        doc.head.appendChild(faviconLink);
        setUpAjaxSpyToLoadFixturesThroughTestSetup();

        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
        expect(doc.head.getElementsByTagName("link").length).toEqual(1);
    });

    it("should inline linked CSS", function () {
        doc.head.appendChild(cssLink);
        setUpAjaxSpyToLoadFixturesThroughTestSetup();

        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should inline linked CSS without a type", function () {
        var noTypeCssLink = window.document.createElement("link");
        noTypeCssLink.href = jasmine.getFixtures().fixturesPath + "some.css";
        noTypeCssLink.rel = "stylesheet";

        doc.head.appendChild(noTypeCssLink);
        setUpAjaxSpyToLoadFixturesThroughTestSetup();

        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should inline multiple linked CSS", function () {
        var anotherCssLink = window.document.createElement("link");
        anotherCssLink.href = jasmine.getFixtures().fixturesPath + "another.css";
        anotherCssLink.rel = "stylesheet";
        anotherCssLink.type = "text/css";

        doc.head.appendChild(cssLink);
        doc.head.appendChild(anotherCssLink);
        setUpAjaxSpyToLoadFixturesThroughTestSetup();

        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/(^|\n)p \{ font-size: 14px; \}($|\n)/);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/(^|\n)a \{ text-decoration: none; \}($|\n)/);
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should not add inline CSS if no content given", function () {
        var emptyCssLink = window.document.createElement("link");
        emptyCssLink.href = jasmine.getFixtures().fixturesPath + "empty.css";
        emptyCssLink.rel = "stylesheet";
        emptyCssLink.type = "text/css";

        doc.head.appendChild(emptyCssLink);

        // Circumvent Firefox having an issue locally loading empty files and returning a "404" instead.
        ajaxSpy.andCallFake(function (url, success, error) {
            success("");
        });

        rasterizeHTML.loadAndInlineCSS(doc, callback());

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should respect the document's baseURI when loading linked CSS", function () {
        joinUrlSpy.andCallThrough();
        setUpAjaxSpyToLoadFixturesThroughTestSetup();

        doc = rasterizeHTMLTestHelper.readDocumentFixture("externalCSS.html");

        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "some.css");

        expect(doc.getElementsByTagName("style").length).toEqual(1);
        expect(doc.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
        expect(doc.getElementsByTagName("link").length).toEqual(0);
    });

    it("should respect optional baseUrl when loading linked CSS", function () {
        joinUrlSpy.andCallThrough();
        setUpAjaxSpyToLoadFixturesThroughTestSetup();

        doc = rasterizeHTMLTestHelper.readDocumentFixtureWithoutBaseURI("externalCSS.html");

        rasterizeHTML.loadAndInlineCSS(doc, jasmine.getFixtures().fixturesPath, callback);

        expect(callback).toHaveBeenCalled();
        expect(joinUrlSpy).toHaveBeenCalledWith(jasmine.getFixtures().fixturesPath, "some.css");
    });

    it("should favour explicit baseUrl over document.baseURI when loading linked CSS", function () {
        var baseUrl = jasmine.getFixtures().fixturesPath;

        joinUrlSpy.andCallThrough();
        setUpAjaxSpyToLoadFixturesThroughTestSetup();

        doc = rasterizeHTMLTestHelper.readDocumentFixture("externalCSS.html");
        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        rasterizeHTML.loadAndInlineCSS(doc, jasmine.getFixtures().fixturesPath, callback);

        expect(callback).toHaveBeenCalled();
        expect(joinUrlSpy).toHaveBeenCalledWith(jasmine.getFixtures().fixturesPath, "some.css");
    });

    it("should map resource paths relative to the stylesheet", function () {
        var cssWithRelativeResource;

        cssWithRelativeResource = window.document.createElement("link");
        cssWithRelativeResource.href = "below/backgroundImage.css";
        cssWithRelativeResource.rel = "stylesheet";
        cssWithRelativeResource.type = "text/css";

        extractCssUrlSpy.andReturn("../green.png");
        joinUrlSpy.andCallFake(function (base, url) {
            if (url === "below/backgroundImage.css" && base === "the_fixtures/") {
                return jasmine.getFixtures().fixturesPath + "below/backgroundImage.css";
            } else if (url === "../green.png" && base === "below/backgroundImage.css") {
                return "green.png";
            }
        });
        setUpAjaxSpyToLoadFixturesThroughTestSetup();

        doc.head.appendChild(cssWithRelativeResource);

        // Let's assume the doc's baseURI is under "the_fixtures/"
        rasterizeHTML.loadAndInlineCSS(doc, "the_fixtures/", callback);

        expect(callback).toHaveBeenCalled();
        // Chrome 19 sets cssWithRelativeResource.href to ""
        expect(joinUrlSpy).toHaveBeenCalledWith("below/backgroundImage.css", "../green.png");

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/url\(\"green\.png\"\)/);
    });

    it("should circumvent caching if requested", function () {
        doc.head.appendChild(cssLink);
        setUpAjaxSpyToLoadFixturesThroughTestSetup();

        rasterizeHTML.loadAndInlineCSS(doc, {cache: false}, callback);

        expect(ajaxSpy).toHaveBeenCalledWith(cssLink.href, jasmine.any(Function), jasmine.any(Function), {
            cache: false
        });
        expect(callback).toHaveBeenCalled();
    });

    it("should not circumvent caching by default", function () {
        doc.head.appendChild(cssLink);
        setUpAjaxSpyToLoadFixturesThroughTestSetup();

        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(ajaxSpy).toHaveBeenCalledWith(cssLink.href, jasmine.any(Function), jasmine.any(Function), {
            cache: true
        });
        expect(callback).toHaveBeenCalled();
    });

    describe("CSS inline error handling", function () {
        var callback, brokenCssLink, anotherBrokenCssLink;

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

            callback = jasmine.createSpy("callback");
        });

        it("should report an error if a stylesheet could not be loaded", function () {
            doc.head.appendChild(brokenCssLink);
            setUpAjaxSpyToLoadFixturesThroughTestSetup();

            rasterizeHTML.loadAndInlineCSS(doc, "some_base_url/", callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "stylesheet",
                url: "some_base_url/a_document_that_doesnt_exist.css"
            }]);
        });

        it("should only report a failing stylesheet as error", function () {
            doc.head.appendChild(brokenCssLink);
            doc.head.appendChild(cssLink);
            setUpAjaxSpyToLoadFixturesThroughTestSetup();

            rasterizeHTML.loadAndInlineCSS(doc, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "stylesheet",
                url: "a_document_that_doesnt_exist.css"
            }]);
        });

        it("should report multiple failing stylesheet as error", function () {
            doc.head.appendChild(brokenCssLink);
            doc.head.appendChild(anotherBrokenCssLink);
            setUpAjaxSpyToLoadFixturesThroughTestSetup();

            rasterizeHTML.loadAndInlineCSS(doc, callback);

            expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
            expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
        });

        it("should report an empty list for a successful stylesheet", function () {
            doc.head.appendChild(cssLink);
            setUpAjaxSpyToLoadFixturesThroughTestSetup();

            rasterizeHTML.loadAndInlineCSS(doc, callback);

            expect(callback).toHaveBeenCalledWith([]);
        });
    });
});
