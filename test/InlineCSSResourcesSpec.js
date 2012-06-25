describe("CSS references inline", function () {
    var doc,
        extractCssUrlSpy, joinUrlSpy;

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        extractCssUrlSpy = spyOn(rasterizeHTML.util, "extractCssUrl");
        joinUrlSpy = spyOn(rasterizeHTML.util, "joinUrl");
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

        extractCssUrlSpy.andReturn("data:image/png;base64,soMEfAkebASE64=");

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
        beforeEach(function () {
            this.addMatchers(imagediff.jasmine);

            setFixtures(
                '<img id="referenceImage1" src="fixtures/rednblue.png" alt="test image"/>' +
                '<img id="referenceImage2" src="fixtures/green.png" alt="test image"/>'
            );
        });

        it("should not touch an already inlined background-image", function () {
            var inlineFinished = false;

            extractCssUrlSpy.andReturn("data:image/png;base64,soMEfAkebASE64=");

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

            extractCssUrlSpy.andThrow("Invalid url");

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
                url, styleContent;

            extractCssUrlSpy.andReturn("fixtures/rednblue.png");

            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url("fixtures/rednblue.png"); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(extractCssUrlSpy).toHaveBeenCalledWith('url("fixtures/rednblue.png")');

                expect(doc.head.getElementsByTagName("style").length).toEqual(1);
                styleContent = doc.head.getElementsByTagName("style")[0].textContent;
                expect(styleContent).toMatch(backgroundImageRegex);
                url = backgroundImageRegex.exec(styleContent)[1];
                expect(url).toMatch(/^data:image\/png;base64,/);
            });

            runs(function () {
                rasterizeHTMLTestHelper.compareDataUriToReferenceImage(url, "referenceImage1");
            });
        });

        it("should respect the document's baseURI when loading the background-image", function () {
            var backgroundImageRegex = /background-image:\s*url\("([^\)]+)"\);/,
                inlineFinished = false,
                url, styleContent;

            extractCssUrlSpy.andReturn("rednblue.png");
            joinUrlSpy.andCallThrough();

            doc = rasterizeHTMLTestHelper.readDocumentFixture("backgroundImage.html");

            rasterizeHTML.loadAndInlineCSSReferences(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(extractCssUrlSpy).toHaveBeenCalledWith('url("rednblue.png")');
                expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "rednblue.png");

                expect(doc.getElementsByTagName("style").length).toEqual(1);
                styleContent = doc.getElementsByTagName("style")[0].textContent;
                expect(styleContent).toMatch(backgroundImageRegex);

                url = backgroundImageRegex.exec(styleContent)[1];
                expect(url).toMatch(/^data:image\/png;base64,/);
            });

            runs(function () {
                rasterizeHTMLTestHelper.compareDataUriToReferenceImage(url, "referenceImage1");
            });
        });

        it("should respect optional baseUrl when loading the background-image", function () {
            var inlineFinished = false;

            extractCssUrlSpy.andReturn("rednblue.png");
            joinUrlSpy.andCallThrough();

            doc = rasterizeHTMLTestHelper.readDocumentFixtureWithoutBaseURI("backgroundImage.html");

            rasterizeHTML.loadAndInlineCSSReferences(doc, "./fixtures/", function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(joinUrlSpy).toHaveBeenCalledWith("./fixtures/", "rednblue.png");
            });
        });

        it("should favour explicit baseUrl over document.baseURI when loading the background-image", function () {
            var inlineFinished = false,
                baseUrl = "./fixtures/";

            extractCssUrlSpy.andReturn("rednblue.png");
            joinUrlSpy.andCallThrough();

            doc = rasterizeHTMLTestHelper.readDocumentFixture("backgroundImage.html");
            expect(doc.baseURI).not.toBeNull();
            expect(doc.baseURI).not.toEqual("about:blank");
            expect(doc.baseURI).not.toEqual(baseUrl);

            rasterizeHTML.loadAndInlineCSSReferences(doc, "./fixtures/", function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(joinUrlSpy).toHaveBeenCalledWith("./fixtures/", "rednblue.png");
            });
        });
    });

    describe("backgroundImage inline error handling", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("callback");

            joinUrlSpy.andCallThrough();
        });

        it("should report an error if a backgroundImage could not be loaded", function () {
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url(a_backgroundImage_that_doesnt_exist.png); }');
            extractCssUrlSpy.andReturn("a_backgroundImage_that_doesnt_exist.png");

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
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url(a_backgroundImage_that_doesnt_exist.png); }');
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url(fixtures/rednblue.png); }');
            extractCssUrlSpy.andCallFake(function (cssUrl) {
                if (cssUrl === "url(fixtures/rednblue.png)") {
                    return "fixtures/rednblue.png";
                } else if (cssUrl === "url(a_backgroundImage_that_doesnt_exist.png)") {
                    return "a_backgroundImage_that_doesnt_exist.png";
                }
            });

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
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url(a_backgroundImage_that_doesnt_exist.png); }');
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url(another_backgroundImage_that_doesnt_exist.png); }');
            extractCssUrlSpy.andCallFake(function (cssUrl) {
                if (cssUrl === "url(another_backgroundImage_that_doesnt_exist.png)") {
                    return "another_backgroundImage_that_doesnt_exist.png";
                } else if (cssUrl === "url(a_backgroundImage_that_doesnt_exist.png)") {
                    return "a_backgroundImage_that_doesnt_exist.png";
                }
            });

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
            rasterizeHTMLTestHelper.addStyleToDocument(doc, 'span { background-image: url(fixtures/rednblue.png); }');
            extractCssUrlSpy.andReturn("fixtures/rednblue.png");

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
