var render = (function (util, browser, documentHelper, xmlserializer, ayepromise, window) {
    "use strict";

    var module = {};

    var asArray = function (arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    };

    var supportsBlobBuilding = function () {
        // Newer WebKit (under PhantomJS) seems to support blob building, but loading an image with the blob fails
        if (window.navigator.userAgent.indexOf("WebKit") >= 0 && window.navigator.userAgent.indexOf("Chrome") < 0) {
            return false;
        }
        if (window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder) {
            // Deprecated interface
            return true;
        } else {
            if (window.Blob) {
                // Available as constructor only in newer builds for all Browsers
                try {
                    new window.Blob(['<b></b>'], { "type" : "text\/xml" });
                    return true;
                } catch (err) {
                    return false;
                }
            }
        }
        return false;
    };

    var getBlob = function (data) {
       var imageType = "image/svg+xml;charset=utf-8",
           BLOBBUILDER = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder,
           svg;
       if (BLOBBUILDER) {
           svg = new BLOBBUILDER();
           svg.append(data);
           return svg.getBlob(imageType);
       } else {
           return new window.Blob([data], {"type": imageType});
       }
    };

    var buildImageUrl = function (svg) {
        var DOMURL = window.URL || window.webkitURL || window;
        if (supportsBlobBuilding()) {
            return DOMURL.createObjectURL(getBlob(svg));
        } else {
            return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        }
    };

    var cleanUpUrl = function (url) {
        var DOMURL = window.URL || window.webkitURL || window;
        if (supportsBlobBuilding()) {
            DOMURL.revokeObjectURL(url);
        }
    };

    var createHiddenElement = function (doc, tagName) {
        var element = doc.createElement(tagName);
        // 'display: none' doesn't cut it, as browsers seem to be lazy loading CSS
        element.style.visibility = "hidden";
        element.style.width = "0px";
        element.style.height = "0px";
        element.style.position = "absolute";
        element.style.top = "-10000px";
        element.style.left = "-10000px";
        // We need to add the element to the document so that its content gets loaded
        doc.getElementsByTagName("body")[0].appendChild(element);
        return element;
    };

    var getOrCreateHiddenDivWithId = function (doc, id) {
        var div = doc.getElementById(id);
        if (! div) {
            div = createHiddenElement(doc, "div");
            div.id = id;
        }

        return div;
    };

    var WORKAROUND_ID = "rasterizeHTML_js_FirefoxWorkaround";

    var needsBackgroundImageWorkaround = function () {
        var firefoxMatch = window.navigator.userAgent.match(/Firefox\/(\d+).0/);
        return !firefoxMatch || !firefoxMatch[1] || parseInt(firefoxMatch[1], 10) < 17;
    };

    var workAroundBrowserBugForBackgroundImages = function (svg, canvas) {
        // Firefox < 17, Chrome & Safari will (sometimes) not show an inlined background-image until the svg is
        // connected to the DOM it seems.
        var uniqueId = util.getConstantUniqueIdFor(svg),
            doc = canvas ? canvas.ownerDocument : window.document,
            workaroundDiv;

        if (needsBackgroundImageWorkaround()) {
            workaroundDiv = getOrCreateHiddenDivWithId(doc, WORKAROUND_ID + uniqueId);
            workaroundDiv.innerHTML = svg;
            workaroundDiv.className = WORKAROUND_ID; // Make if findable for debugging & testing purposes
        }
    };

    var workAroundWebkitBugIgnoringTheFirstRuleInCSS = function (doc) {
        // Works around bug with webkit ignoring the first rule in each style declaration when rendering the SVG to the
        // DOM. While this does not directly affect the process when rastering to canvas, this is needed for the
        // workaround found in workAroundBrowserBugForBackgroundImages();
        if (window.navigator.userAgent.indexOf("WebKit") >= 0) {
            asArray(doc.getElementsByTagName("style")).forEach(function (style) {
                style.textContent = "span {}\n" + style.textContent;
            });
        }
    };

    var cleanUpAfterWorkAroundForBackgroundImages = function (svg, canvas) {
        var uniqueId = util.getConstantUniqueIdFor(svg),
            doc = canvas ? canvas.ownerDocument : window.document,
            div = doc.getElementById(WORKAROUND_ID + uniqueId);
        if (div) {
            div.parentNode.removeChild(div);
        }
    };

    var zoomedElementSizingAttributes = function (width, height, zoomFactor) {
        var zoomHtmlInject = '',
            closestScaledWith, closestScaledHeight;

        zoomFactor = zoomFactor || 1;
        closestScaledWith = Math.round(width / zoomFactor);
        closestScaledHeight = Math.round(height / zoomFactor);

        if (zoomFactor !== 1) {
            zoomHtmlInject = ' style="' +
                '-webkit-transform: scale(' + zoomFactor + '); ' +
                '-webkit-transform-origin: top left; ' +
                'transform: scale(' + zoomFactor + '); ' +
                'transform-origin: top left;"';
        }

        return ' width="' + closestScaledWith + '" height="' + closestScaledHeight + '"' +
                zoomHtmlInject;
    };

    module.getSvgForDocument = function (doc, width, height, zoomFactor) {
        var xhtml;

        workAroundWebkitBugIgnoringTheFirstRuleInCSS(doc);
        xhtml = xmlserializer.serializeToString(doc);

        browser.validateXHTML(xhtml);

        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                '<foreignObject' + zoomedElementSizingAttributes(width, height, zoomFactor) + '>' +
                xhtml +
                '</foreignObject>' +
            '</svg>'
        );
    };

    var generalDrawError = function () {
        return {message: "Error rendering page"};
    };

    module.renderSvg = function (svg, canvas) {
        var url, image,
            defer = ayepromise.defer(),
            resetEventHandlers = function () {
                image.onload = null;
                image.onerror = null;
            },
            cleanUp = function () {
                if (url) {
                    cleanUpUrl(url);
                }
                cleanUpAfterWorkAroundForBackgroundImages(svg, canvas);
            };

        workAroundBrowserBugForBackgroundImages(svg, canvas);

        url = buildImageUrl(svg);

        image = new window.Image();
        image.onload = function() {
            resetEventHandlers();
            cleanUp();

            defer.resolve(image);
        };
        image.onerror = function () {
            cleanUp();

            // Webkit calls the onerror handler if the SVG is faulty
            defer.reject(generalDrawError());
        };
        image.src = url;

        return defer.promise;
    };

    module.drawImageOnCanvas = function (image, canvas) {
        try {
            canvas.getContext("2d").drawImage(image, 0, 0);
        } catch (e) {
            // Firefox throws a 'NS_ERROR_NOT_AVAILABLE' if the SVG is faulty
            throw generalDrawError();
        }
    };

    var getViewportSize = function (canvas, options) {
        var defaultWidth = 300,
            defaultHeight = 200,
            fallbackWidth = canvas ? canvas.width : defaultWidth,
            fallbackHeight = canvas ? canvas.height : defaultHeight,
            width = options.width !== undefined ? options.width : fallbackWidth,
            height = options.height !== undefined ? options.height : fallbackHeight;

        return {
            width: width,
            height: height
        };
    };

    module.drawDocumentImage = function (doc, canvas, options) {
        var viewportSize = getViewportSize(canvas, options);

        if (options.hover) {
            documentHelper.fakeHover(doc, options.hover);
        }
        if (options.active) {
            documentHelper.fakeActive(doc, options.active);
        }

        return browser.calculateDocumentContentSize(doc, viewportSize.width, viewportSize.height)
            .then(function (size) {
                return module.getSvgForDocument(doc, size.width, size.height, options.zoom);
            })
            .then(function (svg) {
                return module.renderSvg(svg, canvas);
            });
    };

    return module;
}(util, browser, documentHelper, xmlserializer, ayepromise, window));
