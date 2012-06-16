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

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        this.addMatchers(imagediff.jasmine);

        setFixtures(
            '<img id="referenceImage1" src="fixtures/rednblue.png" alt="test image"/>' +
            '<img id="referenceImage2" src="fixtures/green.png" alt="test image"/>'
        );
    });

    describe("img inline", function () {
        var joinUrlSpy = null,
            getLocalDocumentImage = function (image, finishHandler) {
            var img = new window.Image();

            img.onload = function () {
                finishHandler(img);
            };
            img.src = image.attributes.src.nodeValue; // Chrome 19 sets image.src to ""
        };

        beforeEach(function () {
            joinUrlSpy = spyOn(rasterizeHTML.util, "joinUrl");
        });

        it("should load external images", function () {
            var inlineFinished = false,
                localImg = null;

            doc.body.innerHTML = '<img id="image" src="fixtures/rednblue.png" alt="test image"/>';

            rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineImages", 2000);

            // Gecko & Webkit won't allow direct comparison of images, need to get local first
            runs(function () {
                getLocalDocumentImage(doc.getElementById("image"), function (img) { localImg = img; });
            });

            waitsFor(function () {
                return localImg !== null;
            }, "Move of image to local", 200);

            runs(function () {
                expect(doc.getElementById("image").src).toMatch(/^data:image\/png;base64,/);
                expect(localImg).toImageDiffEqual(window.document.getElementById("referenceImage1"));
            });
        });

        it("should load multiple external images", function () {
            var inlineFinished = false,
                localImg1 = null,
                localImg2 = null;

            doc.body.innerHTML = (
                    '<img id="image1" src="fixtures/rednblue.png" alt="test image"/>' +
                    '<img id="image2" src="fixtures/green.png" alt="test image"/>'
                );

            rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineImages", 2000);

            // Gecko & Webkit won't allow direct comparison of images, need to get local first
            runs(function () {
                getLocalDocumentImage(doc.getElementById("image1"), function (img) { localImg1 = img; });
                getLocalDocumentImage(doc.getElementById("image2"), function (img) { localImg2 = img; });
            });

            waitsFor(function () {
                return localImg1 !== null && localImg2 !== null;
            }, "Move of image to local", 200);

            runs(function () {
                expect(doc.getElementById("image1").src).toMatch(/^data:image\/png;base64,/);
                expect(localImg1).toImageDiffEqual(window.document.getElementById("referenceImage1"));
                expect(doc.getElementById("image2").src).toMatch(/^data:image\/png;base64,/);
                expect(localImg2).toImageDiffEqual(window.document.getElementById("referenceImage2"));
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
                localImg = null;

            doc = readDocumentFixture("image.html");
            joinUrlSpy.andCallThrough();

            rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineImages", 2000);

            runs(function () {
                expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "rednblue.png");
                // Gecko & Webkit won't allow direct comparison of images, need to get local first
                getLocalDocumentImage(doc.getElementsByTagName("img")[0], function (img) { localImg = img; });
            });

            waitsFor(function () {
                return localImg !== null;
            }, "Move of image to local", 200);

            runs(function () {
                expect(doc.getElementsByTagName("img")[0].attributes.src.nodeValue).toMatch(/^data:image\/png;base64,/);
                expect(localImg).toImageDiffEqual(window.document.getElementById("referenceImage1"));
            });
        });
    });

    describe("CSS inline", function () {
        var cssLink, anotherCssLink, emptyCssLink, faviconLink, cssWithRelativeResource,
            extractCssUrlSpy, joinUrlSpy;

        beforeEach(function () {
            extractCssUrlSpy = spyOn(rasterizeHTML.util, "extractCssUrl");
            joinUrlSpy = spyOn(rasterizeHTML.util, "joinUrl");

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

            cssWithRelativeResource = window.document.createElement("link");
            cssWithRelativeResource.href = "fixtures/backgroundImage.css";
            cssWithRelativeResource.rel = "stylesheet";
            cssWithRelativeResource.type = "text/css";
        });

        it("should do nothing if no linked CSS is found", function () {
            var inlineFinished = false;

            rasterizeHTML.loadAndInlineCSS(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSS", 2000);

            runs(function () {
                expect(doc.head.getElementsByTagName("style").length).toEqual(0);
            });
        });

        it("should not touch non-CSS links", function () {
            var inlineFinished = false;

            doc.head.appendChild(faviconLink);

            rasterizeHTML.loadAndInlineCSS(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSS", 2000);

            runs(function () {
                expect(doc.head.getElementsByTagName("style").length).toEqual(0);
                expect(doc.head.getElementsByTagName("link").length).toEqual(1);
            });
        });

        it("should inline linked CSS", function () {
            var inlineFinished = false;

            doc.head.appendChild(cssLink);

            rasterizeHTML.loadAndInlineCSS(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSS", 2000);

            runs(function () {
                expect(doc.head.getElementsByTagName("style").length).toEqual(1);
                expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
                expect(doc.head.getElementsByTagName("link").length).toEqual(0);
            });
        });

        it("should inline multiple linked CSS", function () {
            var inlineFinished = false;

            doc.head.appendChild(cssLink);
            doc.head.appendChild(anotherCssLink);

            rasterizeHTML.loadAndInlineCSS(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSS", 2000);

            runs(function () {
                expect(doc.head.getElementsByTagName("style").length).toEqual(1);
                expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/(^|\n)p \{ font-size: 14px; \}($|\n)/);
                expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/(^|\n)a \{ text-decoration: none; \}($|\n)/);
                expect(doc.head.getElementsByTagName("link").length).toEqual(0);
            });
        });

        it("should not add inline CSS if no content given", function () {
            var inlineFinished = false;

            doc.head.appendChild(emptyCssLink);

            rasterizeHTML.loadAndInlineCSS(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSS", 2000);

            runs(function () {
                expect(doc.head.getElementsByTagName("style").length).toEqual(0);
                expect(doc.head.getElementsByTagName("link").length).toEqual(0);
            });
        });

        it("should respect the document's baseURI when loading linked CSS", function () {
            var inlineFinished = false;

            joinUrlSpy.andCallThrough();

            doc = readDocumentFixture("externalCSS.html");

            rasterizeHTML.loadAndInlineCSS(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSS", 2000);

            runs(function () {
                expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "some.css");

                expect(doc.getElementsByTagName("style").length).toEqual(1);
                expect(doc.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
                expect(doc.getElementsByTagName("link").length).toEqual(0);
            });
        });

        it("should map resource paths relative to the stylesheet", function () {
            var inlineFinished = false;

            extractCssUrlSpy.andReturn("green.png");
            joinUrlSpy.andReturn("fixtures/green.png");

            doc.head.appendChild(cssWithRelativeResource);

            rasterizeHTML.loadAndInlineCSS(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSS", 2000);

            runs(function () {
                // Chrome 19 sets cssWithRelativeResource.href to ""
                expect(joinUrlSpy).toHaveBeenCalledWith(cssWithRelativeResource.attributes.href.nodeValue, "green.png");

                expect(doc.head.getElementsByTagName("style").length).toEqual(1);
                expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(/url\(\"fixtures\/green\.png\"\)/);
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

        it("should not touch an already inlined image", function () {
            var inlineFinished = false;

            extractCssUrlSpy.andReturn("data:image/png;base64,soMEfAkebASE64=");

            addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

            rasterizeHTML.loadAndInlineCSSReferences(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "rasterizeHTML.loadAndInlineCSSReferences", 2000);

            runs(function () {
                expect(doc.head.getElementsByTagName("style").length).toEqual(1);
                expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual('span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');
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
                expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual('span { background-image: "invalid url"; }');
            });
        });

        it("should inline a background-image", function () {
            var backgroundImageRegex = /^span\s*\{\s*background-image: url\("([^\)]+)"\);\s*\}\s*$/,
                inlineFinished = false,
                resultImage = null,
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
                getImageForURL(url, function (img) { resultImage = img; });
            });

            waitsFor(function () {
                return resultImage !== null;
            }, "getting result image", 2000);

            runs(function () {
                expect(resultImage).toImageDiffEqual(window.document.getElementById("referenceImage1"));
            });
        });

        it("should respect the document's baseURI when loading the background-image", function () {
            var backgroundImageRegex = /background-image:\s*url\("([^\)]+)"\);/,
                inlineFinished = false,
                resultImage = null,
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
                getImageForURL(url, function (img) { resultImage = img; });
            });

            waitsFor(function () {
                return resultImage !== null;
            }, "getting result image", 2000);

            runs(function () {
                expect(resultImage).toImageDiffEqual(window.document.getElementById("referenceImage1"));
            });
        });

    });
});
