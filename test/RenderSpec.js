describe("The rendering process", function () {
    describe("on document to SVG conversion", function () {
        it("should return a SVG with embeded HTML", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "Test content";

            var svgCode = rasterizeHTML.getSvgForDocument(doc, 123, 456);

            expect(svgCode).toEqual(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="456">' +
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

            var svgCode = rasterizeHTML.getSvgForDocument(doc, 123, 456);

            expect(svgCode).not.toBeNull();
            canonicalXML = svgCode.replace(/ +\/>/, '/>');
            expect(canonicalXML).toEqual(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="456">' +
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

    describe("on SVG rendering", function () {
        beforeEach(function () {
            this.addMatchers(imagediff.jasmine);
        });

        ifNotInWebkitIt("should render the SVG", function () {
            var image = null,
                referenceImg = $('<img src="' + jasmine.getFixtures().fixturesPath + 'rednblue.png" alt="test image"/>'),
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

            rasterizeHTML.renderSvg(twoColorSvg, null, function (the_image) {
                image = the_image;
            });

            waitsFor(function () {
                return image != null;
            }, "rasterizeHTML.renderSvg", 2000);

            runs(function () {
                // This fails in Chrome & Safari, possibly due to a bug with same origin policy stuff
                try {
                    expect(image).toImageDiffEqual(referenceImg.get(0));
                } catch (err) {
                    expect(err.message).toBeNull();
                }
            });
        });

        ifNotInWebkitIt("should render an SVG with inline image", function () {
            var image = null,
                referenceImg = $('<img src="' + jasmine.getFixtures().fixturesPath + 'rednblue.png" alt="test image"/>'),
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

            rasterizeHTML.renderSvg(twoColorSvg, null, function (the_image) {
                image = the_image;
            });

            waitsFor(function () {
                return image != null;
            }, "rasterizeHTML.renderSvg", 2000);

            runs(function () {
                // This fails in Chrome & Safari, possibly due to a bug with same origin policy stuff
                try {
                    expect(image).toImageDiffEqual(referenceImg.get(0));
                } catch (err) {
                    expect(err.message).toBeNull();
                }
            });
        });

        it("should return an error when the SVG cannot be rendered", function () {
            var imageSpy = {},
                successCallback = jasmine.createSpy("successCallback"),
                errorCallback = jasmine.createSpy("errorCallback");

            // We need to mock, as only Chrome & Safari seem to throw errors on a faulty SVG
            spyOn(window, "Image").andReturn(imageSpy);

            rasterizeHTML.renderSvg("svg", null, successCallback, errorCallback);

            imageSpy.onerror();

            expect(errorCallback).toHaveBeenCalled();
            expect(successCallback).not.toHaveBeenCalled(); // Quite possibly depends on the underlying JS implementation to actually work :{
        });
    });

    describe("on drawing the image on the canvas", function () {
        it("should render the image and return true", function () {
            var image = "the_image",
                canvas = jasmine.createSpyObj("canvas", ["getContext"]),
                context = jasmine.createSpyObj("context", ["drawImage"]);

            canvas.getContext.andCallFake(function (howManyD) {
                if (howManyD === "2d") {
                    return context;
                }
            });

            var result = rasterizeHTML.drawImageOnCanvas(image, canvas, function () {});

            expect(result).toBeTruthy();
            expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0);
        });

        it("should handle an error and return false", function () {
            var image = "the_image",
                canvas = jasmine.createSpyObj("canvas", ["getContext"]),
                context = jasmine.createSpyObj("context", ["drawImage"]);

            canvas.getContext.andReturn(context);
            context.drawImage.andThrow("error");

            var result = rasterizeHTML.drawImageOnCanvas(image, canvas, function () {}, function () {});

            expect(result).toBeFalsy();
        });
    });

    describe("working around on Firefox and Webkit to fix resources not being rendered consistently", function () {
        beforeEach(function () {
            $(".rasterizeHTML_js_FirefoxWorkaround").remove();
        });

        it("should add hidden svg", function () {
            var canvas = document.createElement("canvas"),
                svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

            // Stop method of finishing and removing div
            spyOn(window, "Image").andReturn({});

            rasterizeHTML.renderSvg(svg, canvas);

            expect($(".rasterizeHTML_js_FirefoxWorkaround")).toExist();
            expect($(".rasterizeHTML_js_FirefoxWorkaround svg")).toExist();
            expect($(".rasterizeHTML_js_FirefoxWorkaround").css("visibility")).toEqual("hidden");
            expect($(".rasterizeHTML_js_FirefoxWorkaround").css("position")).toEqual("absolute");
            expect($(".rasterizeHTML_js_FirefoxWorkaround").css("top")).toEqual("-10000px");
            expect($(".rasterizeHTML_js_FirefoxWorkaround").css("left")).toEqual("-10000px");
        });

        it("should add the workaround for each canvas", function () {
            var canvas1 = document.createElement("canvas"),
                canvas2 = document.createElement("canvas"),
                svg1 = '<svg xmlns="http://www.w3.org/2000/svg" width="101" height="101"></svg>',
                svg2 = '<svg xmlns="http://www.w3.org/2000/svg" width="102" height="102"></svg>';

            // Stop method of finishing and removing div
            spyOn(window, "Image").andReturn({});

            rasterizeHTML.renderSvg(svg1, canvas1);
            rasterizeHTML.renderSvg(svg2, canvas2);

            expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(2);
        });

        it("should update the workaround when re-rendering the canvas", function () {
            var canvas = document.createElement("canvas"),
                svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

            // Stop method of finishing and removing div
            spyOn(window, "Image").andReturn({});

            rasterizeHTML.renderSvg(svg, canvas);
            rasterizeHTML.renderSvg(svg, canvas);

            expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(1);
        });

        it("should remove the workaround div once the canvas has been rendered", function () {
            var renderFinished = false,
                canvas = document.createElement("canvas"),
                svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

            rasterizeHTML.renderSvg(svg, canvas, function () { renderFinished = true; });

            waitsFor(function () {
                return renderFinished;
            }, "rasterizeHTML.renderSvg", 2000);

            runs(function () {
                expect($(".rasterizeHTML_js_FirefoxWorkaround")).not.toExist();
            });
        });

        it("should remove the workaround div once the canvas has been rendered even if an error occurs when drawing on the canvas", function () {
            var canvas = jasmine.createSpyObj("canvas", ["getContext"]),
                context = jasmine.createSpyObj("context", ["drawImage"]);

            canvas.getContext.andReturn(context);
            context.drawImage.andThrow("exception");

            rasterizeHTML.drawImageOnCanvas("svg", canvas);

            expect($(".rasterizeHTML_js_FirefoxWorkaround")).not.toExist();
        });

        it("should remove the workaround div once the canvas has been rendered even if an error occurs when drawing the image", function () {
            var renderFinished = false,
                canvas = document.createElement("canvas"),
                svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>',
                imageInstance = {},
                windowImageSpy = spyOn(window, "Image").andReturn(imageInstance);

            rasterizeHTML.renderSvg(svg, canvas, function () {}, function () { renderFinished = true; });

            imageInstance.onerror();

            expect(renderFinished).toBeTruthy();

            expect($(".rasterizeHTML_js_FirefoxWorkaround")).not.toExist();
        });
    });
});
