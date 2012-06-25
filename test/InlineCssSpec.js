describe("CSS inline", function () {
    var doc, cssLink, anotherCssLink, emptyCssLink, faviconLink,
        extractCssUrlSpy, joinUrlSpy, ajaxSpy, callback;

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        extractCssUrlSpy = spyOn(rasterizeHTML.util, "extractCssUrl");
        joinUrlSpy = spyOn(rasterizeHTML.util, "joinUrl");
        ajaxSpy = spyOn(rasterizeHTML.util, "ajax").andCallFake(function (url, success, error) {
            var fixturesUrl = url.replace(rasterizeHTMLTestHelper.getBaseUri(), "").replace(/^(.\/)?fixtures\//, "");

            try {
                success(rasterizeHTMLTestHelper.readFixturesOrFail(fixturesUrl));
            } catch (err) {
                error();
            }
        });
        callback = jasmine.createSpy("loadAndInlineCssCallback");

        cssLink = window.document.createElement("link");
        cssLink.href = "fixtures/some.css";
        cssLink.rel = "stylesheet";
        cssLink.type = "text/css";

        anotherCssLink = window.document.createElement("link");
        anotherCssLink.href = "fixtures/another.css";
        anotherCssLink.rel = "stylesheet";
        anotherCssLink.type = "text/css";

        emptyCssLink = window.document.createElement("link");
        emptyCssLink.href = "fixtures/empty.css";
        emptyCssLink.rel = "stylesheet";
        emptyCssLink.type = "text/css";

        faviconLink = window.document.createElement("link");
        faviconLink.href = "favicon.ico";
        faviconLink.type = "image/x-icon";
    });

    it("should do nothing if no linked CSS is found", function () {
        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
    });

    it("should not touch non-CSS links", function () {
        doc.head.appendChild(faviconLink);

        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
        expect(doc.head.getElementsByTagName("link").length).toEqual(1);
    });

    it("should inline linked CSS", function () {
        doc.head.appendChild(cssLink);

        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should inline multiple linked CSS", function () {
        doc.head.appendChild(cssLink);
        doc.head.appendChild(anotherCssLink);

        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/(^|\n)p \{ font-size: 14px; \}($|\n)/);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/(^|\n)a \{ text-decoration: none; \}($|\n)/);
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should not add inline CSS if no content given", function () {
        doc.head.appendChild(emptyCssLink);

        rasterizeHTML.loadAndInlineCSS(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should respect the document's baseURI when loading linked CSS", function () {
        joinUrlSpy.andCallThrough();

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

        doc = rasterizeHTMLTestHelper.readDocumentFixtureWithoutBaseURI("externalCSS.html");

        rasterizeHTML.loadAndInlineCSS(doc, "./fixtures/", callback);

        expect(callback).toHaveBeenCalled();
        expect(joinUrlSpy).toHaveBeenCalledWith("./fixtures/", "some.css");
    });

    it("should favour explicit baseUrl over document.baseURI when loading linked CSS", function () {
        var baseUrl = "./fixtures/";

        joinUrlSpy.andCallThrough();

        doc = rasterizeHTMLTestHelper.readDocumentFixture("externalCSS.html");
        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        rasterizeHTML.loadAndInlineCSS(doc, "./fixtures/", callback);

        expect(callback).toHaveBeenCalled();
        expect(joinUrlSpy).toHaveBeenCalledWith("./fixtures/", "some.css");
    });

    it("should map resource paths relative to the stylesheet", function () {
        var cssWithRelativeResource;

        cssWithRelativeResource = window.document.createElement("link");
        cssWithRelativeResource.href = "below/backgroundImage.css";
        cssWithRelativeResource.rel = "stylesheet";
        cssWithRelativeResource.type = "text/css";

        extractCssUrlSpy.andReturn("../green.png");
        joinUrlSpy.andCallFake(function (base, url) {
            if (url === "below/backgroundImage.css" && base === "fixtures/") {
                return "fixtures/below/backgroundImage.css";
            } else if (url === "../green.png" && base === "below/backgroundImage.css") {
                return "green.png";
            }
        });

        doc.head.appendChild(cssWithRelativeResource);

        // Let's assume the doc's baseURI is under "fixtures/"
        rasterizeHTML.loadAndInlineCSS(doc, "fixtures/", callback);

        expect(callback).toHaveBeenCalled();
        // Chrome 19 sets cssWithRelativeResource.href to ""
        expect(joinUrlSpy).toHaveBeenCalledWith("below/backgroundImage.css", "../green.png");

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/url\(\"green\.png\"\)/);
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

            rasterizeHTML.loadAndInlineCSS(doc, "some_base_url/", callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "stylesheet",
                url: "some_base_url/a_document_that_doesnt_exist.css"
            }]);
        });

        it("should only report a failing stylesheet as error", function () {
            doc.head.appendChild(brokenCssLink);
            doc.head.appendChild(cssLink);

            rasterizeHTML.loadAndInlineCSS(doc, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "stylesheet",
                url: "a_document_that_doesnt_exist.css"
            }]);
        });

        it("should report multiple failing stylesheet as error", function () {
            doc.head.appendChild(brokenCssLink);
            doc.head.appendChild(anotherBrokenCssLink);

            rasterizeHTML.loadAndInlineCSS(doc, callback);

            expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
            expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
        });

        it("should report an empty list for a successful stylesheet", function () {
            doc.head.appendChild(cssLink);

            rasterizeHTML.loadAndInlineCSS(doc, callback);

            expect(callback).toHaveBeenCalledWith([]);
        });
    });
});
