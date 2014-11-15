var rasterize = (function (util, browser, documentHelper, document2svg, svg2image, inlineresources) {
    "use strict";

    var module = {};

    var generalDrawError = function () {
        return {message: "Error rendering page"};
    };

    var drawSvgAsImg = function (svg) {
        return svg2image.renderSvg(svg)
            .then(function (image) {
                return {
                    image: image,
                    svg: svg
                };
            }, function () {
                throw generalDrawError();
            });
    };

    var drawImageOnCanvas = function (image, canvas) {
        try {
            canvas.getContext("2d").drawImage(image, 0, 0);
        } catch (e) {
            // Firefox throws a 'NS_ERROR_NOT_AVAILABLE' if the SVG is faulty
            throw generalDrawError();
        }
    };

    var doDraw = function (doc, size, canvas, options) {
        var svg = document2svg.drawDocumentAsSvg(doc, size, options);
        return drawSvgAsImg(svg)
            .then(function (result) {
                if (canvas) {
                    drawImageOnCanvas(result.image, canvas);
                }

                return result;
            });
    };

    module.rasterize = function (doc, canvas, options) {
        var inlineOptions;

        inlineOptions = util.clone(options);
        inlineOptions.inlineScripts = options.executeJs === true;

        return inlineresources.inlineReferences(doc, inlineOptions)
            .then(function (errors) {
                return prerender.prerender(doc, options)
                    .then(function (result) {
                        return {
                            document: result.document,
                            size: result.size,
                            errors: errors.concat(result.errors)
                        };
                    });
            })
            .then(function (result) {
                documentHelper.persistInputValues(result.document);
                return result;
            })
            .then(function (result) {
                return doDraw(result.document, result.size, canvas, options)
                    .then(function (drawResult) {
                        return {
                            image: drawResult.image,
                            svg: drawResult.svg,
                            errors: result.errors
                        };
                    });
            });
    };

    return module;
}(util, browser, documentHelper, document2svg, svg2image, inlineresources));
