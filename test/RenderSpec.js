describe("Rendering the Canvas", function () {
    describe("Document to SVG conversion", function () {
        it("should return a SVG with embeded HTML", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "Test content";

            var svgCode = rasterizeHTML.getSvgForDocument(doc);

            expect(svgCode).toEqual(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
                    '<foreignObject width="100%" height="100%">' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                            '<head>' +
                                '<title>' +
                                '</title>' +
                            '</head>' +
                            '<body>' +
                                "Test content" +
                            '</body>' +
                        '</html>' +
                    '</foreignObject>' +
                '</svg>'
            );
        });

        it("should return a SVG with embedded image", function () {
            var doc = document.implementation.createHTMLDocument(""),
                canonicalXML;
            doc.body.innerHTML = '<img src="data:image/png;base64,sOmeFAKeBasE64="/>';

            var svgCode = rasterizeHTML.getSvgForDocument(doc);

            expect(svgCode).not.toBeNull();
            canonicalXML = svgCode.replace(/ +\/>/, '/>');
            expect(canonicalXML).toEqual(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
                    '<foreignObject width="100%" height="100%">' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                            '<head>' +
                                '<title>' +
                                '</title>' +
                            '</head>' +
                            '<body>' +
                                '<img src="data:image/png;base64,sOmeFAKeBasE64="/>' +
                            '</body>' +
                        '</html>' +
                    '</foreignObject>' +
                '</svg>'
            );
        });

        it("should return a SVG with the given size", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var svgCode = rasterizeHTML.getSvgForDocument(doc, 123, 987);

            expect(svgCode).toEqual(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="987">' +
                    '<foreignObject width="100%" height="100%">' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                            '<head>' +
                                '<title>' +
                                '</title>' +
                            '</head>' +
                            '<body>' +
                                "content" +
                            '</body>' +
                        '</html>' +
                    '</foreignObject>' +
                '</svg>'
            );
        });

    });

    describe("SVG rendering", function () {
        beforeEach(function () {
            this.addMatchers(imagediff.jasmine);
        });

        ifNotInWebkitIt("should render the SVG into the canvas", function () {
            var renderFinished = false,
                canvas = $('<canvas width="100" height="100"></canvas>'),
                referenceImg = $('<img src="fixtures/rednblue.png" alt="test image"/>'),
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

            rasterizeHTML.drawSvgToCanvas(twoColorSvg, canvas.get(0), function () { renderFinished = true; });

            waitsFor(function () {
                return renderFinished;
            }, "rasterizeHTML.drawSvgToCanvas", 2000);

            runs(function () {
                // This fails in Chrome & Safari, possibly due to a bug with same origin policy stuff
                try {
                    expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0));
                } catch (err) {
                    expect(err.message).toBeNull();
                }
            });
        });

        ifNotInWebkitIt("should render an SVG with inline image into the canvas", function () {
            var renderFinished = false,
                canvas = $('<canvas width="100" height="100"></canvas>'),
                referenceImg = $('<img src="fixtures/rednblue.png" alt="test image"/>'),
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

            rasterizeHTML.drawSvgToCanvas(twoColorSvg, canvas.get(0), function () { renderFinished = true; });

            waitsFor(function () {
                return renderFinished;
            }, "rasterizeHTML.drawSvgToCanvas", 2000);

            runs(function () {
                // This fails in Chrome & Safari, possibly due to a bug with same origin policy stuff
                try {
                    expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0));
                } catch (err) {
                    expect(err.message).toBeNull();
                }
            });
        });

        xit("should call the callback with the canvas if finished", function () {
            var canvas = document.createElement("canvas"),
                svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>',
                callback = jasmine.createSpy("callback");

            rasterizeHTML.drawSvgToCanvas(svg, canvas, callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.drawSvgToCanvas", 2000);

            runs(function () {
                expect(callback).toHaveBeenCalledWith(canvas);
            });
        });

        it("should add a workaround for Firefox and Chrome to fix background-images not being rendered", function () {
            var renderFinished = false,
                canvas = document.createElement("canvas"),
                svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

            rasterizeHTML.drawSvgToCanvas(svg, canvas, function () { renderFinished = true; });

            waitsFor(function () {
                return renderFinished;
            }, "rasterizeHTML.drawSvgToCanvas", 2000);

            runs(function () {
                if (window.navigator.userAgent.indexOf("Firefox") >= 0 || window.navigator.userAgent.indexOf("Chrome") >= 0) {
                    expect($("#rasterizeHTML_js_FirefoxWorkaround")).toExist();
                    expect($("#rasterizeHTML_js_FirefoxWorkaround svg")).toExist();
                    expect($("#rasterizeHTML_js_FirefoxWorkaround svg").css("visibility")).toEqual("hidden");
                } else {
                    expect($("#rasterizeHTML_js_FirefoxWorkaround")).not.toExist();
                }
            });
        });
    });
});
