window.rasterizeHTML = (function (rasterizeHTMLInline, window) {
    "use strict";

    var module = {};

    /* Utilities */

    var uniqueIdList = [];

    module.util = {};

    module.util.getConstantUniqueIdFor = function (element) {
        // HACK, using a list results in O(n), but how do we hash e.g. a DOM node?
        if (uniqueIdList.indexOf(element) < 0) {
            uniqueIdList.push(element);
        }
        return uniqueIdList.indexOf(element);
    };

    module.util.log = function (msg) {
        if (window.console && window.console.log) {
            window.console.log(msg);
        }
    };

    var cloneObject = function(object) {
        var newObject = {},
            i;
        for (i in object) {
            if (object.hasOwnProperty(i)) {
                newObject[i] = object[i];
            }
        }
        return newObject;
    };

    var isObject = function (obj) {
        return typeof obj === "object" && obj !== null;
    };

    var isCanvas = function (obj) {
        return isObject(obj) &&
            Object.prototype.toString.apply(obj).match(/\[object (Canvas|HTMLCanvasElement)\]/i);
    };

    var isFunction = function (func) {
        return typeof func === "function";
    };

    module.util.parseOptionalParameters = function () { // args: canvas, options, callback
        var parameters = {
            canvas: null,
            options: {},
            callback: null
        };

        if (isFunction(arguments[0])) {
            parameters.callback = arguments[0];
        } else {
            if (arguments[0] == null || isCanvas(arguments[0])) {
                parameters.canvas = arguments[0] || null;

                if (isFunction(arguments[1])) {
                    parameters.callback = arguments[1];
                } else {
                    parameters.options = cloneObject(arguments[1]);
                    parameters.callback = arguments[2] || null;
                }

            } else {
                parameters.options = cloneObject(arguments[0]);
                parameters.callback = arguments[1] || null;
            }
        }

        return parameters;
    };

    /* Rendering */

    var needsXMLParserWorkaround = function() {
        // See https://bugs.webkit.org/show_bug.cgi?id=47768
        return window.navigator.userAgent.indexOf("WebKit") >= 0;
    };

    var serializeToXML = function (doc) {
        var xml;

        doc.documentElement.setAttribute("xmlns", doc.documentElement.namespaceURI);
        xml = (new window.XMLSerializer()).serializeToString(doc.documentElement);
        if (needsXMLParserWorkaround()) {
            if (window.HTMLtoXML) {
                return window.HTMLtoXML(xml);
            } else {
                module.util.log("Looks like your browser needs htmlparser.js as workaround for writing XML. " +
                    "Please include it.");
                return xml;
            }
        } else {
            return xml;
        }
    };

    var supportsBlobBuilding = function () {
        // Newer Safari (under PhantomJS) seems to support blob building, but loading an image with the blob fails
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
                    new window.Blob('<b></b>', { "type" : "text\/xml" });
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
           return new window.Blob(data, {"type": imageType});
       }
    };

    var buildImageUrl = function (svg) {
        var DOMURL = window.URL || window.webkitURL || window;
        if (supportsBlobBuilding()) {
            return DOMURL.createObjectURL(getBlob(svg));
        } else {
            return "data:image/svg+xml;charset=utf-8," + svg;
        }
    };

    var cleanUpUrl = function (url) {
        var DOMURL = window.URL || window.webkitURL || window;
        if (supportsBlobBuilding()) {
            DOMURL.revokeObjectURL(url);
        }
    };

    var getOrCreateHiddenDivWithId = function (doc, id) {
        var div = doc.getElementById(id);
        if (! div) {
            div = doc.createElement("div");
            div.style.visibility = "hidden";
            div.style.width = "0px";
            div.style.height = "0px";
            div.style.position = "absolute";
            div.style.top = "-10000px";
            div.style.left = "-10000px";
            div.id = id;
            doc.getElementsByTagName("body")[0].appendChild(div);
        }

        return div;
    };

    var WORKAROUND_ID = "rasterizeHTML_js_FirefoxWorkaround";

    var workAroundBrowserBugForBackgroundImages = function (svg, canvas) {
        // Firefox, Chrome & Safari will (sometimes) not show an inlined background-image until the svg is connected to
        // the DOM it seems.
        var uniqueId = module.util.getConstantUniqueIdFor(svg),
            doc = canvas ? canvas.ownerDocument : window.document,
            doNotGarbageCollect = getOrCreateHiddenDivWithId(doc, WORKAROUND_ID + uniqueId);

        doNotGarbageCollect.innerHTML = svg;
        doNotGarbageCollect.className = WORKAROUND_ID; // Make if findable for debugging & testing purposes
    };

    var cleanUpAfterWorkAroundForBackgroundImages = function (svg, canvas) {
        var uniqueId = module.util.getConstantUniqueIdFor(svg),
            doc = canvas ? canvas.ownerDocument : window.document,
            div = doc.getElementById(WORKAROUND_ID + uniqueId);
        if (div) {
            div.parentNode.removeChild(div);
        }
    };

    module.getSvgForDocument = function (doc, width, height) {
        var html = serializeToXML(doc);

        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                '<foreignObject width="100%" height="100%">' +
                    html +
                '</foreignObject>' +
            '</svg>'
        );
    };

    module.renderSvg = function (svg, canvas, successCallback, errorCallback) {
        var url, image,
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
            successCallback(image);
        };
        image.onerror = function () {
            cleanUp();

            // Webkit calls the onerror handler if the SVG is faulty
            errorCallback();
        };
        image.src = url;
    };

    module.drawImageOnCanvas = function (image, canvas) {
        try {
            canvas.getContext("2d").drawImage(image, 0, 0);
        } catch (e) {
            // Firefox throws a 'NS_ERROR_NOT_AVAILABLE' if the SVG is faulty
            return false;
        }

        return true;
    };

    /* "Public" API */

    module.drawDocument = function (doc, canvas, options, callback) {
        var params = module.util.parseOptionalParameters(canvas, options, callback),
            handleInternalError = function (errors) {
                errors.push({
                    resourceType: "document"
                });
            },
            fallbackWidth = params.canvas ? params.canvas.width : 300,
            fallbackHeight = params.canvas ? params.canvas.height : 200,
            width = params.options.width !== undefined ? params.options.width : fallbackWidth,
            height = params.options.height !== undefined ? params.options.height : fallbackHeight;

        rasterizeHTMLInline.inlineReferences(doc, params.options, function (allErrors) {

            var svg = module.getSvgForDocument(doc, width, height),
                successful;

            module.renderSvg(svg, params.canvas, function (image) {
                if (params.canvas) {
                    successful = module.drawImageOnCanvas(image, params.canvas);

                    if (!successful) {
                        handleInternalError(allErrors);
                        image = null;   // Set image to null so that Firefox behaves similar to Webkit
                    }
                }

                if (params.callback) {
                    params.callback(image, allErrors);
                }
            }, function () {
                handleInternalError(allErrors);

                if (params.callback) {
                    params.callback(null, allErrors);
                }

            });
        });
    };

    module.drawHTML = function (html, canvas, options, callback) {
        // TODO remove reference to rasterizeHTMLInline.util
        var params = module.util.parseOptionalParameters(canvas, options, callback),
            doc = window.document.implementation.createHTMLDocument("");

        doc.documentElement.innerHTML = html;
        module.drawDocument(doc, params.canvas, params.options, params.callback);
    };

    module.drawURL = function (url, canvas, options, callback) {
        var params = module.util.parseOptionalParameters(canvas, options, callback),
            cache = params.options.cache;

        params.options.baseUrl = url;

        rasterizeHTMLInline.util.ajax(url, {
            cache: cache
        }, function (html) {
            module.drawHTML(html, params.canvas, params.options, params.callback);
        }, function () {
            if (params.callback) {
                params.callback(null, [{
                    resourceType: "page",
                    url: url
                }]);
            }
        });
    };

    return module;
}(window.rasterizeHTMLInline, window));
