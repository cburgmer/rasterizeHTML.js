describe("CSS references inline", function () {
    var doc, extractCssUrlSpy, joinUrlSpy, getDataURIForImageURLSpy, binaryAjaxSpy;

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
        getDataURIForImageURLSpy = spyOn(rasterizeHTML.util, "getDataURIForImageURL");
        binaryAjaxSpy = spyOn(rasterizeHTML.util, "binaryAjax");

    });

    it("should do nothing if no CSS is found", function () {
        var inlineFinished = false;

        rasterizeHTML.loadAndInlineCSSReferences(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

        runs(function () {
            expect(doc.head.getElementsByTagName("style").length).toEqual(0);
        });
    });

    it("should not touch unrelated CSS", function () {
        var inlineFinished = false;

        rasterizeHTMLTestHelper.addStyleToDocument(doc, "span { padding-left: 0; }");

        rasterizeHTML.loadAndInlineCSSReferences(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

        runs(function () {
            expect(doc.head.getElementsByTagName("style").length).toEqual(1);
            expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("span { padding-left: 0; }");
        });
    });

    it("should add a workaround for Webkit to account for first CSS rules being ignored", function () {
        var inlineFinished = false;

        rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

        rasterizeHTML.loadAndInlineCSSReferences(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

        runs(function () {
            expect(doc.head.getElementsByTagName("style").length).toEqual(1);
            if (window.navigator.userAgent.indexOf("WebKit") >= 0) {
                expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/^span \{\}/);
            } else {
                expect(doc.head.getElementsByTagName("style")[0].textContent).not.toMatch(/^span \{\}/);
            }
        });
    });

    describe("CSS background-image inline", function () {
        it("should not touch an already inlined background-image", function () {
            var inlineFinished = false;

            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(doc.head.getElementsByTagName("style").length).toEqual(1);
                expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/span \{ background-image: url\("data:image\/png;base64,soMEfAkebASE64="\); \}/);
            });
        });

        it("should ignore invalid values", function () {
            var inlineFinished = false;

            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: "invalid url"; }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(doc.head.getElementsByTagName("style").length).toEqual(1);
                expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/span \{ background-image: "invalid url"; \}/);
            });
        });

        it("should inline a background-image", function () {
            var backgroundImageRegex = /span\s*\{\s*background-image: url\("([^\)]+)"\);\s*\}/,
                inlineFinished = false,
                anImage = "anImage.png",
                anImagesDataUri = "data:image/png;base64,someDataUri",
                url, styleContent;

            getDataURIForImageURLSpy.andCallFake(function (url, successCallback, errorCallback) {
                if (url === anImage) {
                    successCallback(anImagesDataUri);
                }
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("' + anImage + '"); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(extractCssUrlSpy).toHaveBeenCalledWith('url("' + anImage + '")');

                expect(doc.head.getElementsByTagName("style").length).toEqual(1);
                styleContent = doc.head.getElementsByTagName("style")[0].textContent;
                expect(styleContent).toMatch(backgroundImageRegex);
                url = backgroundImageRegex.exec(styleContent)[1];
                expect(url).toEqual(anImagesDataUri);
            });
        });

        it("should respect the document's baseURI when loading the background-image", function () {
            var backgroundImageRegex = /background-image:\s*url\("([^\)]+)"\);/,
                inlineFinished = false,
                url, styleContent;

            getDataURIForImageURLSpy.andCallFake(function (url, successCallback, errorCallback) {
                successCallback("aDataUri");
            });
            joinUrlSpy.andCallThrough();

            doc = rasterizeHTMLTestHelper.readDocumentFixture("backgroundImage.html");

            rasterizeHTML.loadAndInlineCSSReferences(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(extractCssUrlSpy).toHaveBeenCalledWith('url("rednblue.png")');
                expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "rednblue.png");
            });
        });

        it("should respect optional baseUrl when loading the background-image", function () {
            var inlineFinished = false;

            getDataURIForImageURLSpy.andCallFake(function (url, successCallback, errorCallback) {
                successCallback("aDataUri");
            });
            joinUrlSpy.andCallThrough();

            doc = rasterizeHTMLTestHelper.readDocumentFixtureWithoutBaseURI("backgroundImage.html");

            rasterizeHTML.loadAndInlineCSSReferences(doc, "aBaseURI", function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(joinUrlSpy).toHaveBeenCalledWith("aBaseURI", "rednblue.png");
            });
        });

        it("should favour explicit baseUrl over document.baseURI when loading the background-image", function () {
            var inlineFinished = false,
                baseUrl = "aBaseURI";

            getDataURIForImageURLSpy.andCallFake(function (url, successCallback, errorCallback) {
                successCallback("aDataUri");
            });
            joinUrlSpy.andCallThrough();

            doc = rasterizeHTMLTestHelper.readDocumentFixture("backgroundImage.html");
            expect(doc.baseURI).not.toBeNull();
            expect(doc.baseURI).not.toEqual("about:blank");
            expect(doc.baseURI).not.toEqual(baseUrl);

            rasterizeHTML.loadAndInlineCSSReferences(doc, baseUrl, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(joinUrlSpy).toHaveBeenCalledWith(baseUrl, "rednblue.png");
            });
        });
    });

    describe("backgroundImage inline error handling", function () {
        var aBackgroundImageThatDoesExist = "a_backgroundImage_that_does_exist.png",
            callback;

        beforeEach(function () {
            callback = jasmine.createSpy("callback");

            getDataURIForImageURLSpy.andCallFake(function (url, successCallback, errorCallback) {
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

            rasterizeHTML.loadAndInlineCSSReferences(doc, "some_base_url/", callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineCSSReferences");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([{
                    resourceType: "backgroundImage",
                    url: "some_base_url/a_backgroundImage_that_doesnt_exist.png"
                }]);
            });
        });

        it("should only report a failing backgroundImage as error", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("a_backgroundImage_that_doesnt_exist.png"); }');
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("' + aBackgroundImageThatDoesExist + '"); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineCSSReferences");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([{
                    resourceType: "backgroundImage",
                    url: "a_backgroundImage_that_doesnt_exist.png"
                }]);
            });
        });

        it("should report multiple failing backgroundImages as error", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("a_backgroundImage_that_doesnt_exist.png"); }');
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("another_backgroundImage_that_doesnt_exist.png"); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineCSSReferences");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
                expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
            });
        });

        it("should report an empty list for a successful backgroundImage", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("' + aBackgroundImageThatDoesExist + '"); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineCSSReferences");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([]);
            });
        });
    });

    describe("CSS font-style inline", function () {
        var fontFaceRegex = /\s*@font-face\s*\{\s*font-family\s*:\s*"([^\"]+)";\s*src:\s*url\("([^\)]+)"\);\s*\}/,
            callback;

        var expectFontFaceUrlToMatch = function (url) {
            var extractedUrl, styleContent;

            expect(doc.getElementsByTagName("style").length).toEqual(1);
            styleContent = doc.getElementsByTagName("style")[0].textContent;
            expect(styleContent).toMatch(fontFaceRegex);
            extractedUrl = fontFaceRegex.exec(styleContent)[2];
            expect(extractedUrl).toEqual(url);
        };

        beforeEach(function () {
            callback = jasmine.createSpy("callback");
        });

        it("should not touch an already inlined font", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: url("data:font/woff;base64,soMEfAkebASE64="); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();

            expectFontFaceUrlToMatch("data:font/woff;base64,soMEfAkebASE64=");
        });

        it("should ignore invalid values", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: "invalid url"; }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();
            expect(binaryAjaxSpy).not.toHaveBeenCalled();

            expect(doc.head.getElementsByTagName("style").length).toEqual(1);
            expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual('@font-face { font-family: "test font"; src: "invalid url"; }');
        });

        it("should inline a font", function () {
            binaryAjaxSpy.andCallFake(function (url, success, error) {
                success("this is not a font");
            });

            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font"; src: url("fake.woff"); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();

            expect(extractCssUrlSpy).toHaveBeenCalledWith('url("fake.woff")');
            expect(binaryAjaxSpy).toHaveBeenCalledWith("fake.woff", jasmine.any(Function), jasmine.any(Function));

            expectFontFaceUrlToMatch("data:font/woff;base64,dGhpcyBpcyBub3QgYSBmb250");
        });

        it("should respect the document's baseURI when loading the font", function () {
            joinUrlSpy.andCallThrough();

            binaryAjaxSpy.andCallFake(function (url, success, error) {
                success("this is not a font");
            });

            doc = rasterizeHTMLTestHelper.readDocumentFixture("fontFace.html");

            rasterizeHTML.loadAndInlineCSSReferences(doc, callback);

            expect(callback).toHaveBeenCalled();

            expect(extractCssUrlSpy).toHaveBeenCalledWith('url("raphaelicons-webfont.woff")');
            expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "raphaelicons-webfont.woff");
            expect(binaryAjaxSpy).toHaveBeenCalledWith(rasterizeHTMLTestHelper.getBaseUri() + jasmine.getFixtures().fixturesPath + "raphaelicons-webfont.woff",
                jasmine.any(Function), jasmine.any(Function));

            expectFontFaceUrlToMatch("data:font/woff;base64,dGhpcyBpcyBub3QgYSBmb250");
        });

    });

    describe("CSS font-style inline error handling", function () {
        var aFontReferenceThatDoesExist = "a_font_that_does_exist.woff",
            callback;

        beforeEach(function () {
            callback = jasmine.createSpy("callback");

            binaryAjaxSpy.andCallFake(function (url, successCallback, errorCallback) {
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

            rasterizeHTML.loadAndInlineCSSReferences(doc, "some_base_url/", callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineCSSReferences");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([{
                    resourceType: "fontFace",
                    url: "some_base_url/a_font_that_doesnt_exist.woff"
                }]);
            });
        });

        it("should only report a failing font as error", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font1"; src: url("a_font_that_doesnt_exist.woff"); }');
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font2"; src: url("' + aFontReferenceThatDoesExist + '"); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineCSSReferences");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([{
                    resourceType: "fontFace",
                    url: "a_font_that_doesnt_exist.woff"
                }]);
            });
        });

        it("should report multiple failing fonts as error", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font1"; src: url("a_font_that_doesnt_exist.woff"); }');
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font2"; src: url("another_font_that_doesnt_exist.woff"); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineCSSReferences");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
                expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
            });
        });

        it("should report an empty list for a successful backgroundImage", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, '@font-face { font-family: "test font2"; src: url("' + aFontReferenceThatDoesExist + '"); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineCSSReferences");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([]);
            });
        });
    });

});
