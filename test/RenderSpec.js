describe("Rendering the Canvas", function () {
    var getRGBAForPixel = function (canvas, x, y) {
        var context = canvas.getContext("2d"),
            imageData = context.getImageData(0, 0, 100, 100),
            pixelList = imageData.data,
            offset = (y * imageData.width + x) * 4;

        return [pixelList[offset], pixelList[offset+1], pixelList[offset+2], pixelList[offset+3]];
    };

    it("should return a SVG with embeded HTML", function () {
        var doc = document.implementation.createHTMLDocument("");
        doc.body.innerHTML = "Test content";

        var svgCode = HTML2Canvas.getSvgForDocument(doc);

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

    it("should render the SVG into the canvas", function () {
        var renderFinished = false,
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

        setFixtures('<canvas id="canvas"></canvas>');
        var canvas = document.getElementById("canvas");

        HTML2Canvas.drawSvgToCanvas(twoColorSvg, canvas, function () { renderFinished = true; });

        waitsFor(function () {
            return renderFinished;
        }, "HTML2Canvas.drawSvgToCanvas", 2000);

        runs(function () {
            // This fails in Chrome & Safari, possibly a bug with same origin policy stuff
            try {
                expect(getRGBAForPixel(canvas, 0, 0)).toEqual([255, 119, 0, 255]);
                expect(getRGBAForPixel(canvas, 99, 99)).toEqual([16, 0, 255, 255]);
            } catch (err) {
                expect(err.message).toBeNull();
            }
        });
    });
});
