var render = (function (util, browser, svgtoimage, documentHelper, xmlserializer) {
    "use strict";

    var module = {};

    var zoomedElementSizingAttributes = function (size, zoomFactor) {
        var closestScaledWith, closestScaledHeight,
            offsetX, offsetY;

        zoomFactor = zoomFactor || 1;
        closestScaledWith = Math.round(size.viewportWidth);
        closestScaledHeight = Math.round(size.viewportHeight);

        offsetX = -size.left;
        offsetY = -size.top;

        var attributes = {
             'x': offsetX,
             'y': offsetY,
             'width': closestScaledWith,
             'height': closestScaledHeight
        };

        if (zoomFactor !== 1) {
            attributes.style =
                '-webkit-transform: scale(' + zoomFactor + '); ' +
                '-webkit-transform-origin: 0 0; ' +
                'transform: scale(' + zoomFactor + '); ' +
                'transform-origin: 0 0;';
        }

        return attributes;
    };

    var workAroundCollapsingMarginsAcrossSVGElementInWebKitLike = function (attributes) {
        var style = attributes.style || '';
        attributes.style = style + 'float: left;';
    };

    var serializeAttributes = function (attributes) {
        var keys = Object.keys(attributes);
        if (!keys.length) {
            return '';
        }

        return ' ' + keys.map(function (key) {
            return key + '="' + attributes[key] + '"';
        }).join(' ');
    };

    module.getSvgForDocument = function (doc, size, zoomFactor) {
        var xhtml;

        xhtml = xmlserializer.serializeToString(doc);

        browser.validateXHTML(xhtml);

        var attributes = zoomedElementSizingAttributes(size, zoomFactor);

        workAroundCollapsingMarginsAcrossSVGElementInWebKitLike(attributes);

        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + size.width + '" height="' + size.height + '">' +
                '<foreignObject' + serializeAttributes(attributes) + '>' +
                xhtml +
                '</foreignObject>' +
            '</svg>'
        );
    };

    var generalDrawError = function () {
        return {message: "Error rendering page"};
    };

    module.drawImageOnCanvas = function (image, canvas) {
        try {
            canvas.getContext("2d").drawImage(image, 0, 0);
        } catch (e) {
            // Firefox throws a 'NS_ERROR_NOT_AVAILABLE' if the SVG is faulty
            throw generalDrawError();
        }
    };

    module.drawDocumentImage = function (doc, options) {
        if (options.hover) {
            documentHelper.fakeHover(doc, options.hover);
        }
        if (options.active) {
            documentHelper.fakeActive(doc, options.active);
        }

        return browser.calculateDocumentContentSize(doc, options)
            .then(function (size) {
                return module.getSvgForDocument(doc, size, options.zoom);
            })
            .then(function (svg) {
                return svgtoimage.renderSvg(svg);
            });
    };

    return module;
}(util, browser, svgtoimage, documentHelper, xmlserializer));
