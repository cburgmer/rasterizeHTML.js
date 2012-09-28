describe("CSS import inline", function () {
    var doc, extractCssUrlSpy, joinUrlSpy, ajaxSpy, callback;

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

        callback = jasmine.createSpy("callback");
    });

    it("should do nothing if no CSS is found", function () {
        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
    });

    it("should not touch unrelated CSS", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, "span {   padding-left: 0; }");

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("span {   padding-left: 0; }");
    });

    it("should replace an import with the content of the given URL", function () {
        ajaxSpy.andCallFake(function (url, options, callback) {
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

    it("should support an import without the functional url() form", function () {
        ajaxSpy.andCallFake(function (url, options, callback) {
            callback("");
        });

        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import "that.css";');

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(ajaxSpy).toHaveBeenCalledWith("that.css", jasmine.any(Object), jasmine.any(Function), jasmine.any(Function));
    });

    it("should inline multiple imported CSS and keep order", function () {
        ajaxSpy.andCallFake(function (url, options, callback) {
            if (url === 'that.css') {
                callback("p { font-size: 10px; }");
            } else if (url === 'this.css') {
                callback("span { font-weight: bold; }");
            }
        });

        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");\n' +
            '@import url("this.css");');

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 10px; }\n" +
            "span { font-weight: bold; }");
    });

    it("should not add CSS if no content is given", function () {
        ajaxSpy.andCallFake(function (url, options, callback) {
            if (url === 'that.css') {
                callback("");
            } else if (url === 'this.css') {
                callback("span { font-weight: bold; }");
            }
        });

        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");\n' +
            '@import url("this.css");');

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("span { font-weight: bold; }");
    });

    it("should ignore invalid values", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import   invalid url;');

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual('@import   invalid url;');
    });

    it("should respect the document's baseURI", function () {
        joinUrlSpy.andCallFake(function (base, rel) {
            return "fake_url/" + rel;
        });

        ajaxSpy.andCallFake(function (url, options, callback) {
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
        var baseUrl = "aBaseURI";

        ajaxSpy.andCallFake(function (url, options, callback) {
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

    it("should map resource paths relative to the stylesheet", function () {
        ajaxSpy.andCallFake(function (url, options, callback) {
            if (url === 'this_url/that.css') {
                callback('div { background-image: url("the_image.png"); }');
            }
        });
        joinUrlSpy.andCallFake(function (base, url) {
            if (base === "this_url/that.css" && url === "the_image.png") {
                return "this_url/the_image.png";
            }
        });

        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("this_url/that.css");');

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/div\s+\{\s+background-image: url\("this_url\/the_image.png"\);\s+\}\s*$/);
    });

    it("should map resources relative to the document base URI", function () {
        ajaxSpy.andCallFake(function (url, options, callback) {
            if (url === 'this_url/that.css') {
                callback('div { background-image: url("the_image.png"); }\n' +
                    '@font-face { font-family: "test font"; src: url("fake.woff"); }');
            }
        });
        joinUrlSpy.andCallFake(function (base, url) {
            if (base === "this_url/" && url === "that.css") {
                return "this_url/that.css";
            } else if (base === "this_url/that.css" && url === "the_image.png") {
                return "this_url/the_image.png";
            } else if (base === "this_url/that.css" && url === "fake.woff") {
                return "this_url/fake.woff";
            }
        });

        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTML.loadAndInlineCSSImports(doc, {baseUrl: 'this_url/'}, callback);

        expect(callback).toHaveBeenCalled();

        expect(joinUrlSpy).toHaveBeenCalledWith("this_url/", "that.css");
        expect(joinUrlSpy).toHaveBeenCalledWith("that.css", "the_image.png");
        expect(joinUrlSpy).toHaveBeenCalledWith("that.css", "fake.woff");
     });

    it("should circumvent caching if requested", function () {
        ajaxSpy.andCallFake(function (url, options, callback) {
            callback('');
        });

        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTML.loadAndInlineCSSImports(doc, {cache: false}, callback);

        expect(callback).toHaveBeenCalled();

        expect(ajaxSpy).toHaveBeenCalledWith("that.css", {cache: false}, jasmine.any(Function), jasmine.any(Function));
    });

    it("should not circumvent caching by default", function () {
        ajaxSpy.andCallFake(function (url, options, callback) {
            callback('');
        });

        rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

        rasterizeHTML.loadAndInlineCSSImports(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(ajaxSpy).toHaveBeenCalledWith("that.css", {cache: true}, jasmine.any(Function), jasmine.any(Function));
    });

    describe("on errors", function () {
        it("should report an error if a stylesheet could not be loaded", function () {
            ajaxSpy.andCallFake(function (url, options, successCallback, errorCallback) {
                errorCallback();
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("missing.css");');

            rasterizeHTML.loadAndInlineCSSImports(doc, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "stylesheet",
                url: "missing.css"
            }]);
        });

        it("should include the base URI in the reported url", function () {
            ajaxSpy.andCallFake(function (url, options, successCallback, errorCallback) {
                errorCallback();
            });
            joinUrlSpy.andCallFake(function (base, rel) {
                return base + rel;
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("missing.css");');

            rasterizeHTML.loadAndInlineCSSImports(doc, {baseUrl: 'some_url/'}, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "stylesheet",
                url: "some_url/missing.css"
            }]);
        });

        it("should only report a failing stylesheet as error", function () {
            ajaxSpy.andCallFake(function (url, options, successCallback, errorCallback) {
                if (url === 'existing.css') {
                    successCallback("");
                } else {
                    errorCallback();
                }
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("missing.css");\n' +
                '@import url("existing.css");');

            rasterizeHTML.loadAndInlineCSSImports(doc, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "stylesheet",
                url: "missing.css"
            }]);
        });

        it("should report multiple failing stylesheet as error", function () {
            ajaxSpy.andCallFake(function (url, options, successCallback, errorCallback) {
                errorCallback();
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("missing.css");\n' +
                '@import url("another_missing.css");');
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("and_a_third_missing.css");');

            rasterizeHTML.loadAndInlineCSSImports(doc, callback);

            expect(callback).toHaveBeenCalledWith([
                {
                    resourceType: "stylesheet",
                    url: "missing.css"
                },
                {
                    resourceType: "stylesheet",
                    url: "another_missing.css"
                },
                {
                    resourceType: "stylesheet",
                    url: "and_a_third_missing.css"
                }
            ]);
        });

        it("should report an empty list for a successful stylesheet", function () {
            ajaxSpy.andCallFake(function (url, options, callback) {
                if (url === 'that.css') {
                    callback("");
                }
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@import url("that.css");');

            rasterizeHTML.loadAndInlineCSSImports(doc, callback);

            expect(callback).toHaveBeenCalledWith([]);
        });
    });
});
