describe("The rendering process", function () {
    describe("on document to SVG conversion", function () {
        var defaultZoomLevel = 1;

        var aRenderSize = function (width, height, viewportWidth, viewportHeight, left, top) {
            return {
                left: left || 0,
                top: top || 0,
                width: width || 123,
                height: height || 456 ,
                viewportWidth: viewportWidth || width || 123,
                viewportHeight: viewportHeight || height || 456
            };
        };

        var sandbox;

        beforeEach(function () {
            sandbox = document.createElement('div');
            document.body.appendChild(sandbox);
        });

        afterEach(function () {
            document.body.removeChild(sandbox);
        });

        it("should return a SVG with embeded HTML", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "Test content";

            var svgCode = render.getSvgForDocument(doc, aRenderSize(), defaultZoomLevel);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" .*>' +
                    '<foreignObject .*>' +
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

            var svgCode = render.getSvgForDocument(doc, aRenderSize(), defaultZoomLevel);

            expect(svgCode).not.toBeNull();
            canonicalXML = svgCode.replace(/ +\/>/, '/>');
            expect(canonicalXML).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" .*>' +
                    '<foreignObject .*>' +
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

            var svgCode = render.getSvgForDocument(doc, aRenderSize(123, 987, 200, 1000, 2, 7), defaultZoomLevel);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="987"[^>]*>' +
                    '<foreignObject x="-2" y="-7" width="200" height="1000".*>' +
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
            var svgCode = render.getSvgForDocument(doc, aRenderSize(123, 987, 12, 99), zoomFactor);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="987"[^>]*>' +
                    '<foreignObject x="0" y="0" width="12" height="99" style="-webkit-transform: scale\\(10\\); -webkit-transform-origin: 0 0; transform: scale\\(10\\); transform-origin: 0 0;.*">' +
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
            var svgCode = render.getSvgForDocument(doc, aRenderSize(123, 987), zoomLevel);

            expect(svgCode).not.toMatch(new RegExp("scale"));
        });

        it("should return a SVG with a root font size to preserve rem units", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.documentElement.style.fontSize = "14px";
            doc.body.innerHTML = "Test content";

            var svgCode = render.getSvgForDocument(doc, aRenderSize(), defaultZoomLevel);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" [^>]*font-size="14px"[^>]*>' +
                    '<foreignObject .*>' +
                        '<html xmlns="http://www.w3.org/1999/xhtml"[^>]*>' +
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

        it("should raise an error on invalid source", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var error = new Error();
            spyOn(browser, 'validateXHTML').and.throwError(error);

            expect(function () { render.getSvgForDocument(doc, aRenderSize(), 1); }).toThrow(error);
        });

        it("should work around collapsing margins in Chrome & Safari", function () {
            // Bottom margin that would trigger a collapsing margin with the following SVG
            var topChild = document.createElement('div');
            topChild.style.marginBottom = "200px";
            topChild.innerHTML = 'text';

            sandbox.appendChild(topChild);


            var doc = document.implementation.createHTMLDocument("");
            // Margin top will inside the SVG will collapse
            doc.body.innerHTML = '<div class="svgContent" style="margin-top: 200px;">content</div>';
            // HACK avoid XHTML being pasted into the DOM below
            doc.head.querySelector('title').innerText = "meh";

            var tempChild = document.createElement('div');
            tempChild.innerHTML = render.getSvgForDocument(doc, aRenderSize(100, 100), 1);

            sandbox.appendChild(tempChild.childNodes[0]);


            // Work around WebKit reporting offset across the SVG element
            sandbox.querySelector('svg').style.position = "relative";

            expect(sandbox.querySelector('.svgContent').offsetTop).toBe(200);
        });
    });

    describe("on SVG rendering", function () {
        beforeEach(function () {
            jasmine.addMatchers(imagediff.jasmine);
        });

        ifNotInWebkitIt("should render the SVG", function (done) {
            var referenceImg = $('<img src="' + testHelper.fixturesPath + 'rednblue.png" alt="test image"/>'),
                twoColorSvg = (
                    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
                        '<foreignObject x="0" y="0" width="100%" height="100%">' +
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
                        '<foreignObject x="0" y="0" width="100%" height="100%">' +
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
            calculatedSize;

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
            calculatedSize = 'the_calculated_size';
            spyOn(browser, 'calculateDocumentContentSize').and.returnValue(fulfilled(calculatedSize));
            spyOn(render, 'getSvgForDocument');
            spyOn(render, 'renderSvg');
        });

        it("should draw the image", function (done) {
            var svg = "the svg",
                image = "the image";

            render.getSvgForDocument.and.returnValue(svg);
            render.renderSvg.and.returnValue(fulfilled(image));

            render.drawDocumentImage(doc, {zoom: 42}).then(function (theImage) {
                expect(theImage).toBe(image);

                expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(
                    doc,
                    jasmine.objectContaining({zoom: 42})
                );
                expect(render.getSvgForDocument).toHaveBeenCalledWith(doc, calculatedSize, 42);
                expect(render.renderSvg).toHaveBeenCalledWith(svg);

                done();
            });
        });

        it("should report an error when constructing the SVG image", function (done) {
            render.renderSvg.and.returnValue(rejected());

            render.drawDocumentImage(doc, {}).fail(done);
        });

        it("should take an optional width and height", function () {
            render.drawDocumentImage(doc, {width: 42, height: 4711});

            expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(doc, {width: 42, height: 4711});
        });

        it("should trigger hover effect", function () {
            render.drawDocumentImage(doc, {hover: '.mySpan'});

            expect(documentHelper.fakeHover).toHaveBeenCalledWith(doc, '.mySpan');
        });

        it("should not trigger hover effect by default", function () {
            render.drawDocumentImage(doc, {});

            expect(documentHelper.fakeHover).not.toHaveBeenCalled();
        });

        it("should trigger active effect", function () {
            render.drawDocumentImage(doc, {active: '.mySpan'});

            expect(documentHelper.fakeActive).toHaveBeenCalledWith(doc, '.mySpan');
        });

        it("should not trigger active effect by default", function () {
            render.drawDocumentImage(doc, {});

            expect(documentHelper.fakeActive).not.toHaveBeenCalled();
        });

        it("should render the selected element", function () {
            render.drawDocumentImage(doc, {clip: '.mySpan'});

            expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(
                doc,
                jasmine.objectContaining({clip: '.mySpan'})
            );
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
