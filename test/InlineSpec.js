describe("Inline external resources", function () {
    var doc;

    var readDocumentFixture = function (url) {
        var doc,
            fixtureUrl = jasmine.getFixtures().fixturesPath + url;

        $.ajax({
            dataType: 'xml',
            mimeType: 'text/xml',
            url: fixtureUrl,
            async: false,
            cache: false,
            success: function (content) {
                doc = content;
            }
        });

        return doc;
    };

    var readDocumentFixtureWithoutBaseURI = function (url) {
        var html = readFixtures(url),
            doc = document.implementation.createHTMLDocument("");

        doc.documentElement.innerHTML = html;
        return doc;
    };

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        this.addMatchers(imagediff.jasmine);

        setFixtures(
            '<img id="referenceImage1" src="fixtures/rednblue.png" alt="test image"/>' +
            '<img id="referenceImage2" src="fixtures/green.png" alt="test image"/>'
        );
    });

    describe("img inline", function () {
        var joinUrlSpy = null;

        var getLocalDocumentImage = function (image, finishHandler) {
            var img = new window.Image();

            img.onload = function () {
                finishHandler(img);
            };
            img.src = image.attributes.src.nodeValue; // Chrome 19 sets image.src to ""
        };

        var compareImageToReference = function (image, referenceImageId) {
            var localImg = null;

            // Gecko & Webkit won't allow direct comparison of images, need to get local first
            runs(function () {
                getLocalDocumentImage(image, function (img) { localImg = img; });
            });

            waitsFor(function () {
                return localImg !== null;
            }, "Move of image to local", 200);

            runs(function () {
                expect(localImg).toImageDiffEqual(window.document.getElementById(referenceImageId));
            });
        };

        beforeEach(function () {
            joinUrlSpy = spyOn(rasterizeHTML.util, "joinUrl");
        });

        it("should load external images", function () {
            var inlineFinished = false,
                image;

            doc.body.innerHTML = '<img id="image" src="fixtures/rednblue.png" alt="test image"/>';

            rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineImages", 2000);

            // Gecko & Webkit won't allow direct comparison of images, need to get local first
            runs(function () {
                image = doc.getElementById("image");
                expect(image.src).toMatch(/^data:image\/png;base64,/);
                compareImageToReference(image, "referenceImage1");
            });
        });

        it("should load multiple external images", function () {
            var inlineFinished = false,
                image1, image2;

            doc.body.innerHTML = (
                '<img id="image1" src="fixtures/rednblue.png" alt="test image"/>' +
                '<img id="image2" src="fixtures/green.png" alt="test image"/>'
            );

            rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineImages", 2000);

            runs(function () {
                image1 = doc.getElementById("image1");
                image2 = doc.getElementById("image2");
                expect(image1.src).toMatch(/^data:image\/png;base64,/);
                compareImageToReference(image1, "referenceImage1");
                expect(image2.src).toMatch(/^data:image\/png;base64,/);
                compareImageToReference(image2, "referenceImage2");
            });
        });

        it("should finish if no images found", function () {
            var inlineFinished = false;

            rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineImages", 2000);
        });

        it("should not touch an already inlined image", function () {
            var inlineFinished = false;

            doc.body.innerHTML = '<img id="image" src="data:image/png;base64,soMEfAkebASE64=" alt="test image"/>';

            rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineImages", 2000);

            runs(function () {
                expect(doc.getElementById("image").src).toEqual('data:image/png;base64,soMEfAkebASE64=');
            });
        });

        it("should respect the document's baseURI when loading the image", function () {
            var inlineFinished = false,
                image;

            doc = readDocumentFixture("image.html");
            joinUrlSpy.andCallThrough();

            rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineImages", 2000);

            runs(function () {
                expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "rednblue.png");

                image = doc.getElementsByTagName("img")[0];
                expect(image.attributes.src.nodeValue).toMatch(/^data:image\/png;base64,/);
                compareImageToReference(image, "referenceImage1");
            });
        });

        it("should respect optional baseUrl when loading the image", function () {
            var inlineFinished = false;

            doc = readDocumentFixtureWithoutBaseURI("image.html");

            joinUrlSpy.andCallThrough();

            rasterizeHTML.loadAndInlineImages(doc, "./fixtures/", function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineImages", 2000);

            runs(function () {
                expect(joinUrlSpy).toHaveBeenCalled();
                expect(joinUrlSpy).toHaveBeenCalledWith("./fixtures/", "rednblue.png");
            });
        });

        it("should favour explicit baseUrl over document.baseURI when loading the image", function () {
            var inlineFinished = false,
                baseUrl = "./fixtures/";

            doc = readDocumentFixture("image.html");
            expect(doc.baseURI).not.toBeNull();
            expect(doc.baseURI).not.toEqual("about:blank");
            expect(doc.baseURI).not.toEqual(baseUrl);

            joinUrlSpy.andCallThrough();

            rasterizeHTML.loadAndInlineImages(doc, baseUrl, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineImages", 2000);

            runs(function () {
                expect(joinUrlSpy).toHaveBeenCalledWith("./fixtures/", "rednblue.png");
            });
        });

        describe("Image inline error handling", function () {
            var callback;

            beforeEach(function () {
                callback = jasmine.createSpy("callback");

                joinUrlSpy.andCallThrough();
            });

            it("should report an error if an image could not be loaded", function () {
                doc.body.innerHTML = '<img src="image_that_doesnt_exist.png" alt="test image"/>';

                rasterizeHTML.loadAndInlineImages(doc, "some_base_url/", callback);

                waitsFor(function () {
                    return callback.wasCalled;
                }, "rasterizeHTML.loadAndInlineImages");

                runs(function () {
                    expect(callback).toHaveBeenCalledWith([{
                        resourceType: "image",
                        url: "some_base_url/image_that_doesnt_exist.png"
                    }]);
                });
            });

            it("should only report a failing image as error", function () {
                doc.body.innerHTML = (
                    '<img src="image_that_doesnt_exist.png" alt="test image"/>' +
                    '<img src="fixtures/green.png" alt="test image"/>'
                );

                rasterizeHTML.loadAndInlineImages(doc, callback);

                waitsFor(function () {
                    return callback.wasCalled;
                }, "rasterizeHTML.loadAndInlineImages");

                runs(function () {
                    expect(callback).toHaveBeenCalledWith([{
                        resourceType: "image",
                        url: "image_that_doesnt_exist.png"
                    }]);
                });
            });

            it("should report multiple failing images as error", function () {
                doc.body.innerHTML = (
                    '<img src="image_that_doesnt_exist.png" alt="test image"/>' +
                    '<img src="another_image_that_doesnt_exist.png" alt="test image"/>'
                );

                rasterizeHTML.loadAndInlineImages(doc, callback);

                waitsFor(function () {
                    return callback.wasCalled;
                }, "rasterizeHTML.loadAndInlineImages");

                runs(function () {
                    expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
                    expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
                });
            });

            it("should report an empty list for a successful image", function () {
                doc.body.innerHTML = ('<img src="fixtures/green.png" alt="test image"/>');

                rasterizeHTML.loadAndInlineImages(doc, callback);

                waitsFor(function () {
                    return callback.wasCalled;
                }, "rasterizeHTML.loadAndInlineImages");

                runs(function () {
                    expect(callback).toHaveBeenCalledWith([]);
                });
            });
        });
    });

    describe("CSS inline", function () {
        var cssLink, anotherCssLink, emptyCssLink, faviconLink,
            extractCssUrlSpy, joinUrlSpy, ajaxSpy, callback;

        var getBaseUri = function () {
            // Strip of file part
            return document.baseURI.replace(/\/[^\/]*$/, "/");
        };

        beforeEach(function () {
            extractCssUrlSpy = spyOn(rasterizeHTML.util, "extractCssUrl");
            joinUrlSpy = spyOn(rasterizeHTML.util, "joinUrl");
            ajaxSpy = spyOn(rasterizeHTML.util, "ajax").andCallFake(function (url, success, error) {
                var fixturesUrl = url.replace(getBaseUri(), "").replace(/^(.\/)?fixtures\//, "");

                try {
                    success(readFixtures(fixturesUrl));
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

            doc = readDocumentFixture("externalCSS.html");

            rasterizeHTML.loadAndInlineCSS(doc, callback);

            expect(callback).toHaveBeenCalled();
            expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "some.css");

            expect(doc.getElementsByTagName("style").length).toEqual(1);
            expect(doc.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
            expect(doc.getElementsByTagName("link").length).toEqual(0);
        });

        it("should respect optional baseUrl when loading linked CSS", function () {
            joinUrlSpy.andCallThrough();

            doc = readDocumentFixtureWithoutBaseURI("externalCSS.html");

            rasterizeHTML.loadAndInlineCSS(doc, "./fixtures/", callback);

            expect(callback).toHaveBeenCalled();
            expect(joinUrlSpy).toHaveBeenCalledWith("./fixtures/", "some.css");
        });

        it("should favour explicit baseUrl over document.baseURI when loading linked CSS", function () {
            var baseUrl = "./fixtures/";

            joinUrlSpy.andCallThrough();

            doc = readDocumentFixture("externalCSS.html");
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

    describe("CSS background-image inline", function () {
        var extractCssUrlSpy, joinUrlSpy;

        var addStyleToDocument = function (doc, styleContent) {
            var styleNode = doc.createElement("style");

            styleNode.type = "text/css";
            styleNode.appendChild(doc.createTextNode(styleContent));

            doc.head.appendChild(styleNode);
        };

        var getImageForURL = function (url, finishHandler) {
            var img = new window.Image();

            img.onload = function () {
                finishHandler(img);
            };
            img.src = url;
        };

        var compareDataUriToReferenceImage = function (uri, referenceImageId) {
            var resultImage = null;

            getImageForURL(uri, function (img) { resultImage = img; });

            waitsFor(function () {
                return resultImage !== null;
            }, "getting result image", 2000);

            runs(function () {
                expect(resultImage).toImageDiffEqual(window.document.getElementById(referenceImageId));
            });
        };

        beforeEach(function () {
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

            addStyleToDocument(doc, "span { padding-left: 0; }");

            rasterizeHTML.loadAndInlineCSSReferences(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(doc.head.getElementsByTagName("style").length).toEqual(1);
                expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("span { padding-left: 0; }");
            });
        });

        it("should not touch an already inlined background-image", function () {
            var inlineFinished = false;

            extractCssUrlSpy.andReturn("data:image/png;base64,soMEfAkebASE64=");

            addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

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

            addStyleToDocument(doc, 'span { background-image: "invalid url"; }');

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

            addStyleToDocument(doc, 'span { background-image: url("fixtures/rednblue.png"); }');

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
                compareDataUriToReferenceImage(url, "referenceImage1");
            });
        });

        it("should respect the document's baseURI when loading the background-image", function () {
            var backgroundImageRegex = /background-image:\s*url\("([^\)]+)"\);/,
                inlineFinished = false,
                url, styleContent;

            extractCssUrlSpy.andReturn("rednblue.png");
            joinUrlSpy.andCallThrough();

            doc = readDocumentFixture("backgroundImage.html");

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
                compareDataUriToReferenceImage(url, "referenceImage1");
            });
        });

        it("should respect optional baseUrl when loading the background-image", function () {
            var inlineFinished = false;

            extractCssUrlSpy.andReturn("rednblue.png");
            joinUrlSpy.andCallThrough();

            doc = readDocumentFixtureWithoutBaseURI("backgroundImage.html");

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

            doc = readDocumentFixture("backgroundImage.html");
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

        it("should add a workaround for Webkit to account for first CSS rules being ignored", function () {
            var inlineFinished = false;

            extractCssUrlSpy.andReturn("data:image/png;base64,soMEfAkebASE64=");

            addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

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

        describe("backgroundImage inline error handling", function () {
            var callback;

            beforeEach(function () {
                callback = jasmine.createSpy("callback");

                joinUrlSpy.andCallThrough();
            });

            it("should report an error if a backgroundImage could not be loaded", function () {
                addStyleToDocument(doc, 'span { background-image: url(a_backgroundImage_that_doesnt_exist.png); }');
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
                addStyleToDocument(doc, 'span { background-image: url(a_backgroundImage_that_doesnt_exist.png); }');
                addStyleToDocument(doc, 'span { background-image: url(fixtures/rednblue.png); }');
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

            it("should report multiple failing backgroundImage as error", function () {
                addStyleToDocument(doc, 'span { background-image: url(a_backgroundImage_that_doesnt_exist.png); }');
                addStyleToDocument(doc, 'span { background-image: url(another_backgroundImage_that_doesnt_exist.png); }');
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
                addStyleToDocument(doc, 'span { background-image: url(fixtures/rednblue.png); }');
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
});
