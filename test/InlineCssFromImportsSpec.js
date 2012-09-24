describe("CSS import inline", function () {
    var doc, extractCssUrlSpy, joinUrlSpy, ajaxSpy;

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        extractCssUrlSpy = spyOn(rasterizeHTML.util, "extractCssUrl").andCallFake(function (cssUrl) {
            if (/^url/.test(cssUrl)) {
                return cssUrl.replace(/^url\("/, '').replace(/"\)$/, '');
            } else {
                throw "error";
            }
        });
        joinUrlSpy = spyOn(rasterizeHTML.util, "joinUrl");
        ajaxSpy = spyOn(rasterizeHTML.util, "ajax");

    });

    it("should do nothing if no CSS is found", function () {
        var callback = jasmine.createSpy("callback");

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
    });

    it("should not touch unrelated CSS", function () {
        var callback = jasmine.createSpy("callback");

        rasterizeHTMLTestHelper.addStyleToDocument(doc, "span {   padding-left: 0; }");

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("span {   padding-left: 0; }");
    });

    it("should replace an import with the content of the given URL", function () {
        var callback = jasmine.createSpy("callback");

        ajaxSpy.andCallFake(function (url, callback) {
            if (url === 'that.css') {
                callback("p { font-size: 10px; }");
            }
        });

        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 10px; }");
    });

    it("should ignore invalid values", function () {
        var callback = jasmine.createSpy("callback");

        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import   "invalid url";');

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual('@import   "invalid url";');
    });

    it("should respect the document's baseURI", function () {
        var callback = jasmine.createSpy("callback");

        joinUrlSpy.andCallFake(function (base, rel) {
            return "fake_url/" + rel;
        });

        ajaxSpy.andCallFake(function (url, callback) {
            if (url === 'fake_url/some.css') {
                callback("p { font-size: 14px; }");
            }
        });

        doc = rasterizeHTMLTestHelper.readDocumentFixture("importCss.html");

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.getElementsByTagName("style").length).toEqual(1);
        expect(doc.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
        expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "some.css");
    });

    it("should favour explicit baseUrl over document.baseURI", function () {
        var callback = jasmine.createSpy("callback"),
            baseUrl = "aBaseURI";

        ajaxSpy.andCallFake(function (url, callback) {
            callback("p { font-size: 10px; }");
        });
        joinUrlSpy.andCallThrough();

        doc = rasterizeHTMLTestHelper.readDocumentFixture("importCss.html");

        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        rasterizeHTML.loadAndInlineCSSImports(doc, {baseUrl: baseUrl}, callback);

        expect(callback).toHaveBeenCalled();

        expect(joinUrlSpy).toHaveBeenCalledWith(baseUrl, "some.css");
    });

});
