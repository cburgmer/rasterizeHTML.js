describe("The rendering process", function () {
    describe("on document to SVG conversion", function () {
        var defaultZoomLevel = 1;

        it("should return a SVG with embeded HTML", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "Test content";

            var svgCode = render.getSvgForDocument(doc, 123, 456, defaultZoomLevel);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="456">' +
                    '<foreignObject width="123" height="456">' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                            '<head>' +
                                '<title(/>|></title>)' +
                            '</head>' +
                            '<body>' +
                                "Test content" +
                            '</body>' +
                        '</html>' +
                    '</foreignObject>' +
                '</svg>'
            ));
        });

        it("should return a SVG with embedded image", function () {
            var doc = document.implementation.createHTMLDocument(""),
                canonicalXML;
            doc.body.innerHTML = '<img src="data:image/png;base64,sOmeFAKeBasE64="/>';

            var svgCode = render.getSvgForDocument(doc, 123, 456, defaultZoomLevel);

            expect(svgCode).not.toBeNull();
            canonicalXML = svgCode.replace(/ +\/>/, '/>');
            expect(canonicalXML).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="456">' +
                    '<foreignObject width="123" height="456">' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                            '<head>' +
                                '<title(/>|></title>)' +
                            '</head>' +
                            '<body>' +
                                '<img src="data:image/png;base64,sOmeFAKeBasE64="/>' +
                            '</body>' +
                        '</html>' +
                    '</foreignObject>' +
                '</svg>'
            ));
        });

        it("should return a SVG with the given size", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var svgCode = render.getSvgForDocument(doc, 123, 987, defaultZoomLevel);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="987">' +
                    '<foreignObject width="123" height="987">' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                            '<head>' +
                                '<title(/>|></title>)' +
                            '</head>' +
                            '<body>' +
                                "content" +
                            '</body>' +
                        '</html>' +
                    '</foreignObject>' +
                '</svg>'
            ));
        });

        it("should zoom by the given factor", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var zoomFactor = 10;
            var svgCode = render.getSvgForDocument(doc, 123, 987, zoomFactor);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="987">' +
                    '<foreignObject width="12" height="99" style="-webkit-transform: scale\\(10\\); -webkit-transform-origin: top left; transform: scale\\(10\\); transform-origin: top left;">' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                            '<head>' +
                                '<title(/>|></title>)' +
                            '</head>' +
                            '<body>' +
                                "content" +
                            '</body>' +
                        '</html>' +
                    '</foreignObject>' +
                '</svg>'
            ));
        });

        it("should ignore zoom factor 0", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var zoomLevel = 0;
            var svgCode = render.getSvgForDocument(doc, 123, 987, zoomLevel);

            expect(svgCode).toMatch(new RegExp(
                '<foreignObject width="123" height="987">'
            ));
        });

        it("should raise an error on invalid source", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var error = new Error();
            spyOn(browser, 'validateXHTML').and.throwError(error);

            expect(function () { render.getSvgForDocument(doc, 123, 987); }).toThrow(error);
        });

        describe("workAroundWebkitBugIgnoringTheFirstRuleInCSS", function () {
            var originalUserAgent, myUserAgent;

            beforeEach(function () {
                originalUserAgent = window.navigator.userAgent;
                // Mock userAgent, does not work under Safari
                navigator.__defineGetter__('userAgent', function () {
                    return myUserAgent;
                });
            });

            afterEach(function () {
                myUserAgent = originalUserAgent;
            });

            it("should add a workaround for Webkit to account for first CSS rules being ignored", function () {
                var doc = document.implementation.createHTMLDocument(""),
                    svgCode;

                myUserAgent = "WebKit";
                testHelper.addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

                svgCode = render.getSvgForDocument(doc, 123, 987);

                expect(svgCode).toMatch(/<style type="text\/css">\s*span \{\}/);
            });

            ifNotInWebkitIt("should not add a workaround outside of WebKit", function () {
                var doc = document.implementation.createHTMLDocument(""),
                    svgCode;

                myUserAgent = "Something else";
                testHelper.addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

                svgCode = render.getSvgForDocument(doc, 123, 987);

                expect(svgCode).not.toMatch(/span \{\}/);
            });

        });
    });

    describe("on SVG rendering", function () {
        beforeEach(function () {
            jasmine.addMatchers(diffHelper.matcher);
        });

        ifNotInWebkitIt("should render the SVG", function (done) {
            var referenceImg = $('<img src="' + testHelper.fixturesPath + 'rednblue.png" alt="test image"/>'),
                twoColorSvg = (
                    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
                        '<foreignObject width="100%" height="100%">' +
                            '<html xmlns="http://www.w3.org/1999/xhtml">' +
                                '<head>' +
                                    '<style type="text/css">body { padding: 0; margin: 0}</style>' +
                                '</head>' +
                                '<body>' +
                                    '<div style="background-color: #ff7700; height: 50px"></div>' +
                                    '<div style="background-color: #1000ff; height: 50px"></div>' +
                                '</body>' +
                            '</html>' +
                        '</foreignObject>' +
                    '</svg>'
                );

            render.renderSvg(twoColorSvg, null).then(function (image) {
                // This fails in Chrome & Safari, possibly due to a bug with same origin policy stuff
                try {
                    expect(image).toImageDiffEqual(referenceImg.get(0));
                } catch (err) {
                    expect(err.message).toBeNull();
                }

                done();
            });
        });

        ifNotInWebkitIt("should render an SVG with inline image", function (done) {
            var referenceImg = $('<img src="' + testHelper.fixturesPath + 'rednblue.png" alt="test image"/>'),
                twoColorSvg = (
                    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
                        '<foreignObject width="100%" height="100%">' +
                            '<html xmlns="http://www.w3.org/1999/xhtml">' +
                                '<head>' +
                                    '<style type="text/css">body { padding: 0; margin: 0}</style>' +
                                '</head>' +
                                '<body>' +
                                    '<img id="image" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABAUlEQVR4nO3RMQ3AABDEsINQtoX/hdEMHrxHyu7d0bG/AzAkzZAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMidmzOzoMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMifkA6bsjwS/Y5YIAAAAASUVORK5CYII=" alt="test image"/>' +
                                '</body>' +
                            '</html>' +
                        '</foreignObject>' +
                    '</svg>'
                );

            render.renderSvg(twoColorSvg, null).then(function (image) {
                // This fails in Chrome & Safari, possibly due to a bug with same origin policy stuff
                try {
                    expect(image).toImageDiffEqual(referenceImg.get(0));
                } catch (err) {
                    expect(err.message).toBeNull();
                }

                done();
            });
        });

        it("should return an error when the SVG cannot be rendered", function (done) {
            var imageSpy = {};

            // We need to mock, as only Chrome & Safari seem to throw errors on a faulty SVG
            spyOn(window, "Image").and.returnValue(imageSpy);

            render.renderSvg("svg", null).fail(done);

            imageSpy.onerror();
        });

        it("should return an image without event listeners attached", function (done) {
            var anSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

            render.renderSvg(anSvg, null).then(function (image) {
                expect(image.onerror).toBeNull();
                expect(image.onload).toBeNull();

                done();
            });
        });
    });

    describe("drawDocumentImage", function () {
        var doc = "doc",
            canvas;

        var fulfilled = function (value) {
            var defer = ayepromise.defer();
            defer.resolve(value);
            return defer.promise;
        };

        var rejected = function (error) {
            var defer = ayepromise.defer();
            defer.reject(error);
            return defer.promise;
        };

        beforeEach(function () {
            spyOn(documentHelper, 'fakeHover');
            spyOn(documentHelper, 'fakeActive');
            spyOn(browser, 'calculateDocumentContentSize').and.returnValue(fulfilled({width: 47, height: 11}));
            spyOn(render, 'getSvgForDocument');
            spyOn(render, 'renderSvg');

            canvas = document.createElement("canvas");
            canvas.width = 123;
            canvas.height = 456;
        });

        it("should draw the image", function (done) {
            var svg = "the svg",
                image = "the image";

            render.getSvgForDocument.and.returnValue(svg);
            render.renderSvg.and.returnValue(fulfilled(image));

            render.drawDocumentImage(doc, canvas, {zoom: 42}).then(function (theImage) {
                expect(theImage).toBe(image);

                expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(doc, jasmine.any(Number), jasmine.any(Number));
                expect(render.getSvgForDocument).toHaveBeenCalledWith(doc, 47, 11, 42);
                expect(render.renderSvg).toHaveBeenCalledWith(svg, canvas);

                done();
            });
        });

        it("should report an error when constructing the SVG image", function (done) {
            render.renderSvg.and.returnValue(rejected());

            render.drawDocumentImage(doc, canvas, {}).fail(done);
        });

        it("should use the canvas width and height as viewport size", function () {
            render.drawDocumentImage(doc, canvas, {});

            expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(doc, 123, 456);
        });

        it("should make the canvas optional and apply default viewport width and height", function () {
            render.drawDocumentImage(doc, null, {});

            expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(doc, 300, 200);
        });

        it("should take an optional width and height", function () {
            render.drawDocumentImage(doc, canvas, {width: 42, height: 4711});

            expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(doc, 42, 4711);
        });

        it("should trigger hover effect", function () {
            render.drawDocumentImage(doc, canvas, {hover: '.mySpan'});

            expect(documentHelper.fakeHover).toHaveBeenCalledWith(doc, '.mySpan');
        });

        it("should not trigger hover effect by default", function () {
            render.drawDocumentImage(doc, canvas, {});

            expect(documentHelper.fakeHover).not.toHaveBeenCalled();
        });

        it("should trigger active effect", function () {
            render.drawDocumentImage(doc, canvas, {active: '.mySpan'});

            expect(documentHelper.fakeActive).toHaveBeenCalledWith(doc, '.mySpan');
        });

        it("should not trigger active effect by default", function () {
            render.drawDocumentImage(doc, canvas, {});

            expect(documentHelper.fakeActive).not.toHaveBeenCalled();
        });
    });

    describe("on drawing the image on the canvas", function () {
        it("should render the image", function () {
            var image = "the_image",
                canvas = jasmine.createSpyObj("canvas", ["getContext"]),
                context = jasmine.createSpyObj("context", ["drawImage"]);

            canvas.getContext.and.callFake(function (howManyD) {
                if (howManyD === "2d") {
                    return context;
                }
            });

            render.drawImageOnCanvas(image, canvas);

            expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0);
        });

        it("should handle an error", function () {
            var image = "the_image",
                canvas = jasmine.createSpyObj("canvas", ["getContext"]),
                context = jasmine.createSpyObj("context", ["drawImage"]),
                error;

            canvas.getContext.and.returnValue(context);
            context.drawImage.and.throwError("error");

            try {
                render.drawImageOnCanvas(image, canvas);
            } catch (e) {
                error = e;
            }

            expect(error).toEqual(jasmine.objectContaining({message: "Error rendering page"}));
        });
    });
});
