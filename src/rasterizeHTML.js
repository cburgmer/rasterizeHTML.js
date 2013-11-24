window.rasterizeHTML = (function (rasterizeHTMLInline, xmlserializer, theWindow) {
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

    module.util.parseOptionalParameters = function (args) { // args: canvas, options, callback
        var parameters = {
            canvas: null,
            options: {},
            callback: null
        };

        if (isFunction(args[0])) {
            parameters.callback = args[0];
        } else {
            if (args[0] == null || isCanvas(args[0])) {
                parameters.canvas = args[0] || null;

                if (isFunction(args[1])) {
                    parameters.callback = args[1];
                } else {
                    parameters.options = cloneObject(args[1]);
                    parameters.callback = args[2] || null;
                }

            } else {
                parameters.options = cloneObject(args[0]);
                parameters.callback = args[1] || null;
            }
        }

        return parameters;
    };

    var iframeJsErrorHandler = function (id) {
        return ("" + function (msg) {
            window.parent.rasterizeHTML.util.reportIframeJsError('put_unique_id_here', msg);
        }).replace("put_unique_id_here", id);
    };

    var iframeJsErrors = {};

    module.util.reportIframeJsError = function (id, msg) {
        var messages = iframeJsErrors[id] || [];
        messages.push(msg);
        iframeJsErrors[id] = messages;
    };

    var collectIframeErrors = function (id) {
        var errors = [];
        if (iframeJsErrors[id]) {
            iframeJsErrors[id].forEach(function (msg) {
                errors.push({
                    resourceType: "scriptExecution",
                    msg: msg
                });
            });
        }
        return errors;
    };

    module.util.executeJavascript = function (doc, timeout, callback) {
        var iframe = createHiddenElement(theWindow.document, "iframe"),
            html = doc.documentElement.outerHTML,
            documentId = module.util.getConstantUniqueIdFor(doc),
            injectErrorHandling = "<script>window.onerror = " + iframeJsErrorHandler(documentId) + ";</script>",
            doCallback = function () {
                var doc = iframe.contentDocument;
                theWindow.document.getElementsByTagName("body")[0].removeChild(iframe);
                callback(doc, collectIframeErrors(documentId));
            };

        if (timeout > 0) {
            iframe.onload = function () {
                setTimeout(doCallback, timeout);
            };
        } else {
            iframe.onload = doCallback;
        }

        iframe.contentDocument.open();
        iframe.contentDocument.write(injectErrorHandling + html);
        iframe.contentDocument.close();
    };

    var addHTMLTagAttributes = function (doc, html) {
        var attributeMatch = /<html((?:\s+[^>]*)?)>/im.exec(html),
            helperDoc = theWindow.document.implementation.createHTMLDocument(''),
            htmlTagSubstitute,
            i, elementSubstitute, attribute;

        if (!attributeMatch) {
            return;
        }

        htmlTagSubstitute = '<div' + attributeMatch[1] + '></div>';
        helperDoc.documentElement.innerHTML = htmlTagSubstitute;
        elementSubstitute = helperDoc.querySelector('div');

        for (i = 0; i < elementSubstitute.attributes.length; i++) {
            attribute = elementSubstitute.attributes[i];
            doc.documentElement.setAttribute(attribute.name, attribute.value);
        }
    };

    module.util.parseHTML = function (html) {
        var doc;
        if ((new DOMParser()).parseFromString('<a></a>', 'text/html')) {
            doc = (new DOMParser()).parseFromString(html, 'text/html');
        } else {
            doc = theWindow.document.implementation.createHTMLDocument('');
            doc.documentElement.innerHTML = html;

            addHTMLTagAttributes(doc, html);
        }
        return doc;
    };

    var lastCacheDate = null;

    var getUncachableURL = function (url, cache) {
        if (cache === false || cache === 'none' || cache === 'repeated') {
            if (lastCacheDate === null || cache !== 'repeated') {
                lastCacheDate = Date.now();
            }
            return url + "?_=" + lastCacheDate;
        } else {
            return url;
        }
    };

    module.util.loadDocument = function (url, options, successCallback, errorCallback) {
        var ajaxRequest = new window.XMLHttpRequest(),
            // TODO remove reference to rasterizeHTMLInline.util
            joinedUrl = rasterizeHTMLInline.util.joinUrl(options.baseUrl, url),
            augmentedUrl = getUncachableURL(joinedUrl, options.cache);

        ajaxRequest.addEventListener("load", function () {
            if (ajaxRequest.status === 200 || ajaxRequest.status === 0) {
                successCallback(ajaxRequest.responseXML);
            } else {
                errorCallback();
            }
        }, false);

        ajaxRequest.addEventListener("error", function () {
            errorCallback();
        }, false);

        try {
            ajaxRequest.open('GET', augmentedUrl, true);
            ajaxRequest.responseType = "document";
            ajaxRequest.send(null);
        } catch (err) {
            errorCallback();
        }
    };

    /* Rendering */

    var supportsBlobBuilding = function () {
        // Newer Safari (under PhantomJS) seems to support blob building, but loading an image with the blob fails
        if (theWindow.navigator.userAgent.indexOf("WebKit") >= 0 && theWindow.navigator.userAgent.indexOf("Chrome") < 0) {
            return false;
        }
        if (theWindow.BlobBuilder || theWindow.MozBlobBuilder || theWindow.WebKitBlobBuilder) {
            // Deprecated interface
            return true;
        } else {
            if (theWindow.Blob) {
                // Available as constructor only in newer builds for all Browsers
                try {
                    new theWindow.Blob(['<b></b>'], { "type" : "text\/xml" });
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
           BLOBBUILDER = theWindow.BlobBuilder || theWindow.MozBlobBuilder || theWindow.WebKitBlobBuilder,
           svg;
       if (BLOBBUILDER) {
           svg = new BLOBBUILDER();
           svg.append(data);
           return svg.getBlob(imageType);
       } else {
           return new theWindow.Blob([data], {"type": imageType});
       }
    };

    var buildImageUrl = function (svg) {
        var DOMURL = theWindow.URL || theWindow.webkitURL || window;
        if (supportsBlobBuilding()) {
            return DOMURL.createObjectURL(getBlob(svg));
        } else {
            return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        }
    };

    var cleanUpUrl = function (url) {
        var DOMURL = theWindow.URL || theWindow.webkitURL || window;
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
        var firefoxMatch = theWindow.navigator.userAgent.match(/Firefox\/(\d+).0/);
        return !firefoxMatch || !firefoxMatch[1] || parseInt(firefoxMatch[1], 10) < 17;
    };

    var workAroundBrowserBugForBackgroundImages = function (svg, canvas) {
        // Firefox < 17, Chrome & Safari will (sometimes) not show an inlined background-image until the svg is
        // connected to the DOM it seems.
        var uniqueId = module.util.getConstantUniqueIdFor(svg),
            doc = canvas ? canvas.ownerDocument : theWindow.document,
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
            Array.prototype.forEach.call(doc.getElementsByTagName("style"), function (style) {
                style.textContent = "span {}\n" + style.textContent;
            });
        }
    };

    var cleanUpAfterWorkAroundForBackgroundImages = function (svg, canvas) {
        var uniqueId = module.util.getConstantUniqueIdFor(svg),
            doc = canvas ? canvas.ownerDocument : theWindow.document,
            div = doc.getElementById(WORKAROUND_ID + uniqueId);
        if (div) {
            div.parentNode.removeChild(div);
        }
    };

    module.getSvgForDocument = function (doc, width, height) {
        var xhtml;

        workAroundWebkitBugIgnoringTheFirstRuleInCSS(doc);
        xhtml = xmlserializer.serializeToString(doc);

        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                '<foreignObject width="100%" height="100%">' +
                    xhtml +
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

        image = new theWindow.Image();
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

    var doDraw = function (doc, width, height, canvas, callback, allErrors) {
        var svg = module.getSvgForDocument(doc, width, height),
            handleInternalError = function (errors) {
                errors.push({
                    resourceType: "document",
                    msg: "Error rendering page"
                });
            },
            successful;

        module.renderSvg(svg, canvas, function (image) {
            if (canvas) {
                successful = module.drawImageOnCanvas(image, canvas);

                if (!successful) {
                    handleInternalError(allErrors);
                    image = null;   // Set image to null so that Firefox behaves similar to Webkit
                }
            }

            if (callback) {
                callback(image, allErrors);
            }
        }, function () {
            handleInternalError(allErrors);

            if (callback) {
                callback(null, allErrors);
            }

        });
    };

    var getImageSize = function (canvas, options) {
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

    var drawDocument = function (doc, canvas, options, callback) {
        var imageSize = getImageSize(canvas, options),
            executeJsTimeout = options.executeJsTimeout || 0,
            inlineOptions;

        inlineOptions = rasterizeHTMLInline.util.clone(options);
        inlineOptions.inlineScripts = options.executeJs === true;

        rasterizeHTMLInline.inlineReferences(doc, inlineOptions, function (allErrors) {
            if (options.executeJs) {
                module.util.executeJavascript(doc, executeJsTimeout, function (doc, errors) {
                    doDraw(doc, imageSize.width, imageSize.height, canvas, callback, allErrors.concat(errors));
                });
            } else {
                doDraw(doc, imageSize.width, imageSize.height, canvas, callback, allErrors);
            }
        });
    };

    /**
     * Draws a Document to the canvas.
     * rasterizeHTML.drawDocument( document [, canvas] [, options] [, callback] );
     */
    module.drawDocument = function () {
        var doc = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = module.util.parseOptionalParameters(optionalArguments);

        drawDocument(doc, params.canvas, params.options, params.callback);
    };

    var drawHTML = function (html, canvas, options, callback) {
        var doc = module.util.parseHTML(html);

        module.drawDocument(doc, canvas, options, callback);
    };

    /**
     * Draws a HTML string to the canvas.
     * rasterizeHTML.drawHTML( html [, canvas] [, options] [, callback] );
     */
    module.drawHTML = function () {
        var html = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = module.util.parseOptionalParameters(optionalArguments);

        drawHTML(html, params.canvas, params.options, params.callback);
    };

    var drawURL = function (url, canvas, options, callback) {
        module.util.loadDocument(url, options, function (doc) {
            module.drawDocument(doc, canvas, options, callback);
        }, function () {
            if (callback) {
                callback(null, [{
                    resourceType: "page",
                    url: url,
                    msg: "Unable to load page " + url
                }]);
            }
        });
    };

    /**
     * Draws a page to the canvas.
     * rasterizeHTML.drawURL( url [, canvas] [, options] [, callback] );
     */
    module.drawURL = function () {
        var url = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = module.util.parseOptionalParameters(optionalArguments);

        drawURL(url, params.canvas, params.options, params.callback);
    };

    return module;
}(window.rasterizeHTMLInline, window.xmlserializer, window));
