var document2svg = (function (util, browser, documentHelper, xmlserializer) {
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
        var xhtml = xmlserializer.serializeToString(doc);

        browser.validateXHTML(xhtml);

        var attributes = zoomedElementSizingAttributes(size, zoomFactor);

        workAroundCollapsingMarginsAcrossSVGElementInWebKitLike(attributes);

        var fontSize = window.getComputedStyle ?
            // All modern/decent browsers
            window.getComputedStyle(doc.documentElement).fontSize :
            // IE
            doc.documentElement ?
                // Standards Mode IE
                doc.documentElement.currentStyle.fontSize :
                // Compatibility Mode IE
                doc.body.currentStyle.fontSize;

        if (!fontSize) {
          // If the document is detached, getComputedStyle may fail
          // See https://bugs.webkit.org/show_bug.cgi?id=14563
          // Fallback to using the font-size declared on the element, if any
          fontSize = doc.documentElement ?
              doc.documentElement.style.fontSize :
              doc.body.style.fontSize;
        }

        var fontSizeAttr = fontSize ? ' font-size="' + fontSize + '"' : '';

        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + size.width + '" height="' + size.height + '"' + fontSizeAttr + '>' +
                '<foreignObject' + serializeAttributes(attributes) + '>' +
                xhtml +
                '</foreignObject>' +
            '</svg>'
        );
    };

    module.drawDocumentAsSvg = function (doc, options) {
        if (options.hover) {
            documentHelper.fakeHover(doc, options.hover);
        }
        if (options.active) {
            documentHelper.fakeActive(doc, options.active);
        }

        return browser.calculateDocumentContentSize(doc, options)
            .then(function (size) {
                return module.getSvgForDocument(doc, size, options.zoom);
            });
    };

    return module;
}(util, browser, documentHelper, xmlserializer));
