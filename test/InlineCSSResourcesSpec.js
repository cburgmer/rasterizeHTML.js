describe("CSS references inline", function () {
    var doc, extractCssUrlSpy, joinUrlSpy, getDataURIForImageURLSpy, binaryAjaxSpy, callback;

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        extractCssUrlSpy = spyOn(rasterizeHTMLInline.util, "extractCssUrl").andCallFake(function (cssUrl) {
            if (/^url/.test(cssUrl)) {
                return cssUrl.replace(/^url\("?/, '').replace(/"?\)$/, '');
            } else {
                throw "error";
            }
        });
        joinUrlSpy = spyOn(rasterizeHTMLInline.util, "joinUrl");
        getDataURIForImageURLSpy = spyOn(rasterizeHTMLInline.util, "getDataURIForImageURL");
        binaryAjaxSpy = spyOn(rasterizeHTMLInline.util, "binaryAjax");

        callback = jasmine.createSpy("callback");
    });

    it("should do nothing if no CSS is found", function () {
        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
    });

    it("should not touch unrelated CSS", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, "span { padding-left: 0; }");

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("span { padding-left: 0; }");
    });

    it("should add a workaround for Webkit to account for first CSS rules being ignored on background-images", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

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

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        if (window.navigator.userAgent.indexOf("WebKit") >= 0) {
            expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/^span \{\}/);
        } else {
            expect(doc.head.getElementsByTagName("style")[0].textContent).not.toMatch(/^span \{\}/);
        }
    });

    it("should work with empty content", function () {
        rasterizeHTMLTestHelper.addStyleToDocument(doc, '');

        rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

        expect(callback).toHaveBeenCalled();
    });

    describe("on background-image", function () {
        it("should not touch an already inlined background-image", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();

            expect(doc.head.getElementsByTagName("style").length).toEqual(1);
            expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/span \{ background-image: url\("data:image\/png;base64,soMEfAkebASE64="\); \}/);
        });

        it("should ignore invalid values", function () {
            extractCssUrlSpy.andCallFake(function () {
                throw new Error("Invalid url");
            });
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: "invalid url"; }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();

            expect(doc.head.getElementsByTagName("style").length).toEqual(1);
            expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/span \{ background-image: "invalid url"; \}/);
        });

        it("should inline a background-image", function () {
            var backgroundImageRegex = /span\s*\{\s*background-image: url\("?([^\)"]+)"?\);\s*\}/,
                anImage = "anImage.png",
                anImagesDataUri = "data:image/png;base64,someDataUri",
                url, styleContent;

            getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                if (url === anImage) {
                    successCallback(anImagesDataUri);
                }
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("' + anImage + '"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();
            expect(extractCssUrlSpy.mostRecentCall.args[0]).toMatch(new RegExp('url\\("?' + anImage + '"?\\)'));

            expect(doc.head.getElementsByTagName("style").length).toEqual(1);
            styleContent = doc.head.getElementsByTagName("style")[0].textContent;
            expect(styleContent).toMatch(backgroundImageRegex);
            url = backgroundImageRegex.exec(styleContent)[1];
            expect(url).toEqual(anImagesDataUri);
        });

        it("should inline a background declaration", function () {
            var anImage = "anImage.png",
                anImagesDataUri = "data:image/png;base64,someDataUri",
                styleContent;

            getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                if (url === anImage) {
                    successCallback(anImagesDataUri);
                }
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background: url("' + anImage + '") top left, url("data:image/png;base64,someMoreDataUri") #FFF; }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc);

            styleContent = doc.head.getElementsByTagName("style")[0].textContent;
            expect(styleContent).toMatch(/background(-image)?: .*url\("?data:image\/png;base64,someDataUri"?\).*, .*url\("?data:image\/png;base64,someMoreDataUri"?\).*;/);
        });

        it("should inline multiple background-images in one rule", function () {
            var backgroundImageRegex = /span\s*\{\s*background-image: url\("?([^\)"]+)"?\)\s*,\s*url\("?([^\)"]+)"?\);\s*\}/,
                anImage = "anImage.png",
                anImagesDataUri = "data:image/png;base64,someDataUri",
                aSecondImage = "aSecondImage.png",
                aSecondImagesDataUri = "data:image/png;base64,anotherDataUri",
                url, styleContent;

            getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                if (url === anImage) {
                    successCallback(anImagesDataUri);
                } else if (url === aSecondImage) {
                    successCallback(aSecondImagesDataUri);
                }
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("' + anImage + '"), url("' + aSecondImage + '"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();
            expect(extractCssUrlSpy.mostRecentCall.args[0]).toMatch(new RegExp('url\\("?' + aSecondImage + '"?\\)'));

            expect(doc.head.getElementsByTagName("style").length).toEqual(1);
            styleContent = doc.head.getElementsByTagName("style")[0].textContent;
            expect(styleContent).toMatch(backgroundImageRegex);
            url = backgroundImageRegex.exec(styleContent)[1];
            expect(url).toEqual(anImagesDataUri);
            url = backgroundImageRegex.exec(styleContent)[2];
            expect(url).toEqual(aSecondImagesDataUri);
        });

        it("should inline a background-image on a style element without a type", function () {
            var anImage = "anImage.png",
                styleNode = doc.createElement("style");

            styleNode.appendChild(doc.createTextNode('span { background-image: url("' + anImage + '"); }'));
            doc.head.appendChild(styleNode);

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(getDataURIForImageURLSpy).toHaveBeenCalledWith(anImage, jasmine.any(Object), jasmine.any(Function), jasmine.any(Function));
        });

        it("should not break background-position (#30)", function () {
            var styleNode = doc.createElement("style"),
                styleContent;

            getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                successCallback("data:image/png;base64,someDataUri");
            });

            styleNode.appendChild(doc.createTextNode('span { background-image: url("anImage.png"); background-position: 0 center, right center;}'));
            doc.head.appendChild(styleNode);

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            styleContent = doc.head.getElementsByTagName("style")[0].textContent;
            expect(styleContent).toMatch(/background-position: 0(px)? (center|50%), (right|100%) (center|50%);/);
        });

        it("should respect the document's baseURI when loading the background-image", function () {
            getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                successCallback("aDataUri");
            });
            joinUrlSpy.andCallThrough();

            doc = rasterizeHTMLTestHelper.readDocumentFixture("backgroundImage.html");

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();

            expect(extractCssUrlSpy.mostRecentCall.args[0]).toMatch(new RegExp('url\\("?rednblue.png"?\\)'));
            expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "rednblue.png");
        });

        it("should respect optional baseUrl when loading the background-image", function () {
            var callback = jasmine.createSpy("callback");

            getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                successCallback("aDataUri");
            });
            joinUrlSpy.andCallThrough();

            doc = rasterizeHTMLTestHelper.readDocumentFixtureWithoutBaseURI("backgroundImage.html");

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, {baseUrl: "aBaseURI"}, callback);

            expect(callback).toHaveBeenCalled();

            expect(joinUrlSpy).toHaveBeenCalledWith("aBaseURI", "rednblue.png");
        });

        it("should favour explicit baseUrl over document.baseURI when loading the background-image", function () {
            var baseUrl = "aBaseURI";

            getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                successCallback("aDataUri");
            });
            joinUrlSpy.andCallThrough();

            doc = rasterizeHTMLTestHelper.readDocumentFixture("backgroundImage.html");
            expect(doc.baseURI).not.toBeNull();
            expect(doc.baseURI).not.toEqual("about:blank");
            expect(doc.baseURI).not.toEqual(baseUrl);

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, {baseUrl: baseUrl}, callback);

            expect(callback).toHaveBeenCalled();

            expect(joinUrlSpy).toHaveBeenCalledWith(baseUrl, "rednblue.png");
        });

        it("should circumvent caching if requested", function () {
            var anImage = "anImage.png";

            getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                successCallback("uri");
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("' + anImage + '"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, {cache: false}, callback);

            expect(getDataURIForImageURLSpy).toHaveBeenCalledWith(anImage, {cache: false}, jasmine.any(Function), jasmine.any(Function));
            expect(callback).toHaveBeenCalled();
        });

        it("should not circumvent caching by default", function () {
            var anImage = "anImage.png";

            getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                successCallback("uri");
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("' + anImage + '"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(getDataURIForImageURLSpy).toHaveBeenCalledWith(anImage, {cache: true}, jasmine.any(Function), jasmine.any(Function));
            expect(callback).toHaveBeenCalled();
        });

    });

    describe("on background-image with errors", function () {
        var aBackgroundImageThatDoesExist = "a_backgroundImage_that_does_exist.png";

        beforeEach(function () {
            getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback, errorCallback) {
                if (url === aBackgroundImageThatDoesExist) {
                    successCallback();
                } else {
                    errorCallback();
                }
            });
            joinUrlSpy.andCallThrough();
        });

        it("should report an error if a backgroundImage could not be loaded", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("a_backgroundImage_that_doesnt_exist.png"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, {baseUrl: "some_base_url/"}, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "backgroundImage",
                url: "some_base_url/a_backgroundImage_that_doesnt_exist.png",
                msg: "Unable to load background-image some_base_url/a_backgroundImage_that_doesnt_exist.png"
            }]);
        });

        it("should only report a failing backgroundImage as error", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("a_backgroundImage_that_doesnt_exist.png"); }');
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("' + aBackgroundImageThatDoesExist + '"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "backgroundImage",
                url: "a_backgroundImage_that_doesnt_exist.png",
                msg: jasmine.any(String)
            }]);
        });

        it("should report multiple failing backgroundImages as error", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("a_backgroundImage_that_doesnt_exist.png"); }');
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("another_backgroundImage_that_doesnt_exist.png"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
            expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
        });

        it("should only report one failing backgroundImage for multiple in a rule", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc,
                'span { background-image: url("' + aBackgroundImageThatDoesExist + '"), url("a_backgroundImage_that_doesnt_exist.png"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "backgroundImage",
                url: "a_backgroundImage_that_doesnt_exist.png",
                msg: jasmine.any(String)
            }]);
        });

        it("should report multiple failing backgroundImages in a rule as error", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc,
                'span { background-image: url("a_backgroundImage_that_doesnt_exist.png"), url("another_backgroundImage_that_doesnt_exist.png"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
            expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
        });

        it("should report an empty list for a successful backgroundImage", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("' + aBackgroundImageThatDoesExist + '"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalledWith([]);
        });
    });

    describe("on font-face", function () {
        var fontFaceRegex = /\s*@font-face\s*\{\s*font-family\s*:\s*"?([^\"]+)"?;\s*src:\s*url\("?([^\)"]+)"?\)(\s*format\("?([^\)"]+)"?\))?;\s*\}/,
            callback;

        var expectFontFaceUrlToMatch = function (url, format) {
            var extractedUrl, styleContent, match;

            expect(doc.getElementsByTagName("style").length).toEqual(1);
            styleContent = doc.getElementsByTagName("style")[0].textContent;
            expect(styleContent).toMatch(fontFaceRegex);

            match = fontFaceRegex.exec(styleContent);
            extractedUrl = match[2];
            expect(extractedUrl).toEqual(url);
            if (format) {
                expect(match[4]).toEqual(format);
            }
        };

        beforeEach(function () {
            callback = jasmine.createSpy("callback");
        });

        it("should not touch an already inlined font", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: url("data:font/woff;base64,soMEfAkebASE64="); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();

            expectFontFaceUrlToMatch("data:font/woff;base64,soMEfAkebASE64=");
        });

        it("should ignore invalid values", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: "invalid url"; }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();
            expect(binaryAjaxSpy).not.toHaveBeenCalled();

            expect(doc.head.getElementsByTagName("style").length).toEqual(1);
            expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/@font-face \{ font-family: "test font"; src: "invalid url"; \}/);
        });

        it("should ignore a local font", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: local("font name"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();
            expect(binaryAjaxSpy).not.toHaveBeenCalled();

            expect(doc.head.getElementsByTagName("style").length).toEqual(1);
            expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/@font-face \{ font-family: "test font"; src: local\("font name"\); \}/);
        });

        it("should inline a font", function () {
            binaryAjaxSpy.andCallFake(function (url, options, success) {
                success("this is not a font");
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: url("fake.woff"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();

            expect(extractCssUrlSpy.mostRecentCall.args[0]).toMatch(new RegExp('url\\("?fake.woff"?\\)'));

            expectFontFaceUrlToMatch("data:font/woff;base64,dGhpcyBpcyBub3QgYSBmb250");
        });

        it("should take a font from url with alternatives", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: local("font name"), url("fake.woff"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(extractCssUrlSpy.mostRecentCall.args[0]).toMatch(new RegExp('url\\("?fake.woff"?\\)'));
        });

        it("should detect a woff", function () {
            binaryAjaxSpy.andCallFake(function (url, options, success) {
                success("font's content");
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: url("fake.woff") format("woff"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expectFontFaceUrlToMatch("data:font/woff;base64,Zm9udCdzIGNvbnRlbnQ=", 'woff');
        });

        it("should detect a truetype font", function () {
            binaryAjaxSpy.andCallFake(function (url, options, success) {
                success("font's content");
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: url("fake.ttf") format("truetype"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expectFontFaceUrlToMatch("data:font/truetype;base64,Zm9udCdzIGNvbnRlbnQ=", 'truetype');
        });

        it("should detect a opentype font", function () {
            binaryAjaxSpy.andCallFake(function (url, options, success) {
                success("font's content");
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: url("fake.otf") format("opentype"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expectFontFaceUrlToMatch("data:font/opentype;base64,Zm9udCdzIGNvbnRlbnQ=", 'opentype');
        });

        ifNotInPhantomJsIt("should keep all src references intact", function () {
            var fontFaceSrcRegex = /src:\s*((?:\([^\(]*\)|[^;])+)\s*;/,
                styleContent, match, src;

            binaryAjaxSpy.andCallFake(function (url, options, success) {
                success("font");
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: local("Fake Font"), url("fake.otf") format("opentype"), url("fake.woff"), local("Another Fake Font"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(doc.getElementsByTagName("style").length).toEqual(1);
            styleContent = doc.getElementsByTagName("style")[0].textContent;
            expect(styleContent).toMatch(fontFaceSrcRegex);
            match = fontFaceSrcRegex.exec(styleContent);
            src = match[1];

            expect(src).toMatch(/local\("?Fake Font"?\), url\("?data:font\/opentype;base64,Zm9udA=="?\) format\("?opentype"?\), url\("?data:font\/woff;base64,Zm9udA=="?\), local\("?Another Fake Font"?\)/);
        });

        it("should respect the document's baseURI when loading the font", function () {
            joinUrlSpy.andCallThrough();

            binaryAjaxSpy.andCallFake(function (url, options, success) {
                success("this is not a font");
            });

            doc = rasterizeHTMLTestHelper.readDocumentFixture("fontFace.html");

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();

            expect(extractCssUrlSpy.mostRecentCall.args[0]).toMatch(new RegExp('url\\("?raphaelicons-webfont.woff"?\\)'));
            expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "raphaelicons-webfont.woff");
            expect(binaryAjaxSpy).toHaveBeenCalledWith(rasterizeHTMLTestHelper.getBaseUri() + jasmine.getFixtures().fixturesPath + "raphaelicons-webfont.woff",
                jasmine.any(Object), jasmine.any(Function), jasmine.any(Function));

            expectFontFaceUrlToMatch("data:font/woff;base64,dGhpcyBpcyBub3QgYSBmb250");
        });

        it("should favour explicit baseUrl over document.baseURI when loading the font", function () {
            var callback = jasmine.createSpy("callback"),
                baseUrl = "aBaseURI";

            binaryAjaxSpy.andCallFake(function (url, options, success) {
                success("this is not a font");
            });
            joinUrlSpy.andCallThrough();

            doc = rasterizeHTMLTestHelper.readDocumentFixture("fontFace.html");
            expect(doc.baseURI).not.toBeNull();
            expect(doc.baseURI).not.toEqual("about:blank");
            expect(doc.baseURI).not.toEqual(baseUrl);

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, {baseUrl: baseUrl}, callback);

            expect(callback).toHaveBeenCalled();

            expect(joinUrlSpy).toHaveBeenCalledWith(baseUrl, "raphaelicons-webfont.woff");
        });

        it("should circumvent caching if requested", function () {
            var fontUrl = "fake.woff";

            binaryAjaxSpy.andCallFake(function (url, options, success) {
                success("this is not a font");
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: url("' + fontUrl + '"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, {cache: false}, callback);

            expect(callback).toHaveBeenCalled();
            expect(binaryAjaxSpy).toHaveBeenCalledWith(fontUrl, {cache: false}, jasmine.any(Function), jasmine.any(Function));
        });

        it("should not circumvent caching by default", function () {
            var fontUrl = "fake.woff";

            binaryAjaxSpy.andCallFake(function (url, options, success) {
                success("this is not a font");
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: url("' + fontUrl + '"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();
            expect(binaryAjaxSpy).toHaveBeenCalledWith(fontUrl, {cache: true}, jasmine.any(Function), jasmine.any(Function));
        });

    });

    describe("on font-face with errors", function () {
        var aFontReferenceThatDoesExist = "a_font_that_does_exist.woff",
            callback;

        beforeEach(function () {
            callback = jasmine.createSpy("callback");

            binaryAjaxSpy.andCallFake(function (url, options, successCallback, errorCallback) {
                if (url === aFontReferenceThatDoesExist) {
                    successCallback();
                } else {
                    errorCallback();
                }
            });
            joinUrlSpy.andCallThrough();
        });

        it("should report an error if a font could not be loaded", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: url("a_font_that_doesnt_exist.woff"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, {baseUrl: "some_base_url/"}, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "fontFace",
                url: "some_base_url/a_font_that_doesnt_exist.woff",
                msg: "Unable to load font-face some_base_url/a_font_that_doesnt_exist.woff"
            }]);
        });

        it("should only report a failing font as error", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font1"; src: url("a_font_that_doesnt_exist.woff"); }');
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font2"; src: url("' + aFontReferenceThatDoesExist + '"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "fontFace",
                url: "a_font_that_doesnt_exist.woff",
                msg: jasmine.any(String)
            }]);
        });

        it("should report multiple failing fonts as error", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font1"; src: url("a_font_that_doesnt_exist.woff"); }');
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font2"; src: url("another_font_that_doesnt_exist.woff"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
            expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
        });

        it("should report an empty list for a successful backgroundImage", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font2"; src: url("' + aFontReferenceThatDoesExist + '"); }');

            rasterizeHTMLInline.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalledWith([]);
        });
    });

});
