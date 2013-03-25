/*! rasterizeHTML.js - v0.3.0 - 2013-03-25
* http://www.github.com/cburgmer/rasterizeHTML.js
* Copyright (c) 2013 Christoph Burgmer; Licensed MIT */

window.rasterizeHTMLInline = (function (module) {
    "use strict";

    /* Img Inlining */

    var encodeImageAsDataURI = function (image, baseUrl, cache, successCallback, errorCallback) {
        var url = image.attributes.src.nodeValue,
            base = baseUrl || image.ownerDocument.baseURI;

        if (module.util.isDataUri(url)) {
            successCallback();
            return;
        }

        url = module.util.getUrlRelativeToDocumentBase(url, base);

        module.util.getDataURIForImageURL(url, {
            cache: cache
        }, function (dataURI) {
            image.attributes.src.nodeValue = dataURI;
            successCallback();
        }, function () {
            errorCallback(url);
        });
    };

    var filterInputsForImageType = function (inputs) {
        var imageTypeInputs = [];
        Array.prototype.forEach.call(inputs, function (input) {
            if (input.type === "image") {
                imageTypeInputs.push(input);
            }
        });
        return imageTypeInputs;
    };

    module.loadAndInlineImages = function (doc, options, callback) {
        var params = module.util.parseOptionalParameters(options, callback),
            images = doc.getElementsByTagName("img"),
            inputs = doc.getElementsByTagName("input"),
            baseUrl = params.options.baseUrl,
            cache = params.options.cache !== false,
            imageLike = [],
            errors = [];

        imageLike = Array.prototype.slice.call(images);
        imageLike = imageLike.concat(filterInputsForImageType(inputs));

        module.util.map(imageLike, function (image, finish) {
            encodeImageAsDataURI(image, baseUrl, cache, finish, function (url) {
                errors.push({
                    resourceType: "image",
                    url: url,
                    msg: "Unable to load image " + url
                });
                finish();
            });
        }, function () {
            if (params.callback) {
                params.callback(errors);
            }
        });
    };

    /* Style inlining */

    var loadAndInlineCssForStyle = function (style, baseUrl, cache, alreadyLoadedCssUrls, callback) {
        var cssRules = module.css.rulesForCssText(style.textContent);

        module.css.loadCSSImportsForRules(cssRules, baseUrl, cache, alreadyLoadedCssUrls, function (changedFromImports, importErrors) {
            module.css.loadAndInlineCSSResourcesForRules(cssRules, baseUrl, cache, function (changedFromResources, resourceErrors) {
                var errors = importErrors.concat(resourceErrors),
                    content;

                if (changedFromImports || changedFromResources) {
                    content = module.css.cssRulesToText(cssRules);
                } else {
                    content = style.textContent;
                }

                content = module.css.workAroundWebkitBugIgnoringTheFirstRuleInCSS(content, cssRules);

                style.childNodes[0].nodeValue = content;

                callback(errors);
            });
        });
    };

    module.loadAndInlineStyles = function (doc, options, callback) {
        var params = module.util.parseOptionalParameters(options, callback),
            styles = doc.getElementsByTagName("style"),
            base = params.options.baseUrl || doc.baseURI,
            cache = params.options.cache !== false,
            allErrors = [],
            alreadyLoadedCssUrls = [];

        module.util.map(styles, function (style, finish) {
            if (!style.attributes.type || style.attributes.type.nodeValue === "text/css") {
                loadAndInlineCssForStyle(style, base, cache, alreadyLoadedCssUrls, function (errors) {
                    allErrors = allErrors.concat(errors);

                    finish();
                });
            } else {
                // We need to properly deal with non-css in this concurrent context
                finish();
            }
        }, function () {
            params.callback(allErrors);
        });
    };

    /* CSS link inlining */

    var substituteLinkWithInlineStyle = function (oldLinkNode, styleContent) {
        var parent = oldLinkNode.parentNode,
            styleNode;

        styleContent = styleContent.trim();
        if (styleContent) {
            styleNode = oldLinkNode.ownerDocument.createElement("style");
            styleNode.type = "text/css";
            styleNode.appendChild(oldLinkNode.ownerDocument.createTextNode(styleContent));

            parent.insertBefore(styleNode, oldLinkNode);
        }

        parent.removeChild(oldLinkNode);
    };

    var loadLinkedCSS = function (link, baseUrl, cache, successCallback, errorCallback) {
        var cssHref = link.attributes.href.nodeValue,
            documentBaseUrl = baseUrl || link.ownerDocument.baseURI,
            cssHrefRelativeToDoc = module.util.getUrlRelativeToDocumentBase(cssHref, documentBaseUrl);

        module.util.ajax(cssHrefRelativeToDoc, {
            cache: cache
        }, function (content) {
            var cssRules = module.css.rulesForCssText(content),
                changedFromPathAdjustment;

            changedFromPathAdjustment = module.css.adjustPathsOfCssResources(cssHref, cssRules);
            module.css.loadCSSImportsForRules(cssRules, documentBaseUrl, cache, [], function (changedFromImports, importErrors) {
                module.css.loadAndInlineCSSResourcesForRules(cssRules, documentBaseUrl, cache, function (changedFromResources, resourceErrors) {
                    var errors = importErrors.concat(resourceErrors);

                    if (changedFromPathAdjustment || changedFromImports || changedFromResources) {
                        content = module.css.cssRulesToText(cssRules);
                    }

                    content = module.css.workAroundWebkitBugIgnoringTheFirstRuleInCSS(content, cssRules);

                    successCallback(content, errors);
                });
            });
        }, function () {
            errorCallback(cssHrefRelativeToDoc);
        });
    };

    module.loadAndInlineCssLinks = function (doc, options, callback) {
        var params = module.util.parseOptionalParameters(options, callback),
            links = doc.getElementsByTagName("link"),
            baseUrl = params.options.baseUrl,
            cache = params.options.cache !== false,
            errors = [];

        module.util.map(links, function (link, finish) {
            if (link.attributes.rel && link.attributes.rel.nodeValue === "stylesheet" &&
                (!link.attributes.type || link.attributes.type.nodeValue === "text/css")) {
                loadLinkedCSS(link, baseUrl, cache, function(css, moreErrors) {
                    substituteLinkWithInlineStyle(link, css + "\n");

                    errors = errors.concat(moreErrors);
                    finish();
                }, function (url) {
                    errors.push({
                        resourceType: "stylesheet",
                        url: url,
                        msg: "Unable to load stylesheet " + url
                    });

                    finish();
                });
            } else {
                // We need to properly deal with non-stylesheet in this concurrent context
                finish();
            }
        }, function () {
            if (params.callback) {
                params.callback(errors);
            }
        });
    };

    /* Script inlining */

    var loadLinkedScript = function (script, baseUrl, cache, successCallback, errorCallback) {
        var base = baseUrl || script.ownerDocument.baseURI,
            scriptSrcRelativeToDoc = module.util.getUrlRelativeToDocumentBase(script.attributes.src.nodeValue, base);

        module.util.ajax(scriptSrcRelativeToDoc, {cache: cache}, successCallback, function () {
            errorCallback(scriptSrcRelativeToDoc);
        });
    };

    var substituteExternalScriptWithInline = function (oldScriptNode, jsCode) {
        var newScript = oldScriptNode.ownerDocument.createElement("script"),
            parent = oldScriptNode.parentNode;

        if (oldScriptNode.attributes.type) {
            newScript.type = oldScriptNode.attributes.type.nodeValue;
        }

        newScript.appendChild(oldScriptNode.ownerDocument.createTextNode(jsCode));

        parent.insertBefore(newScript, oldScriptNode);
        parent.removeChild(oldScriptNode);
    };

    module.loadAndInlineScript = function (doc, options, callback) {
        var params = module.util.parseOptionalParameters(options, callback),
            scripts = doc.getElementsByTagName("script"),
            cache = params.options.cache !== false,
            errors = [];

        module.util.map(scripts, function (script, finish) {
            if (script.attributes.src) {
                loadLinkedScript(script, params.options.baseUrl, cache, function (jsCode) {
                    substituteExternalScriptWithInline(script, jsCode);

                    finish();
                }, function (url) {
                    errors.push({
                        resourceType: "script",
                        url: url,
                        msg: "Unable to load script " + url
                    });

                    finish();
                });
            } else {
                finish();
            }
        }, function () {
            if (params.callback) {
                params.callback(errors);
            }
        });
    };

    /* Main */

    module.inlineReferences = function (doc, options, callback) {
        var allErrors = [];

        module.loadAndInlineImages(doc, options, function (errors) {
            allErrors = allErrors.concat(errors);
            module.loadAndInlineStyles(doc, options, function (errors) {
                allErrors = allErrors.concat(errors);
                module.loadAndInlineCssLinks(doc, options, function (errors) {
                    allErrors = allErrors.concat(errors);
                    module.loadAndInlineScript(doc, options, function (errors) {
                        allErrors = allErrors.concat(errors);

                        callback(allErrors);
                    });
                });
            });
        });
    };

    return module;
}(window.rasterizeHTMLInline || {}));

window.rasterizeHTML = (function (rasterizeHTMLInline, hTMLtoXML, theWindow) {
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
        if (theWindow.console && theWindow.console.log) {
            theWindow.console.log(msg);
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
            html = doc.getElementsByTagName("html")[0].innerHTML,
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
        iframe.contentDocument.write("<html>" + injectErrorHandling + html + "</html>");
        iframe.contentDocument.close();
    };

    /* Rendering */

    var needsXMLParserWorkaround = function() {
        // See https://bugs.webkit.org/show_bug.cgi?id=47768
        return theWindow.navigator.userAgent.indexOf("WebKit") >= 0;
    };

    var serializeToXML = function (doc) {
        var xml;

        doc.documentElement.setAttribute("xmlns", doc.documentElement.namespaceURI);
        xml = (new theWindow.XMLSerializer()).serializeToString(doc.documentElement);
        if (needsXMLParserWorkaround()) {
            if (hTMLtoXML) {
                return hTMLtoXML(xml);
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

    var cleanUpAfterWorkAroundForBackgroundImages = function (svg, canvas) {
        var uniqueId = module.util.getConstantUniqueIdFor(svg),
            doc = canvas ? canvas.ownerDocument : theWindow.document,
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

    module.drawDocument = function (doc, canvas, options, callback) {
        var params = module.util.parseOptionalParameters(canvas, options, callback),
            fallbackWidth = params.canvas ? params.canvas.width : 300,
            fallbackHeight = params.canvas ? params.canvas.height : 200,
            width = params.options.width !== undefined ? params.options.width : fallbackWidth,
            height = params.options.height !== undefined ? params.options.height : fallbackHeight,
            executeJsTimeout = params.options.executeJsTimeout || 0;

        rasterizeHTMLInline.inlineReferences(doc, params.options, function (allErrors) {
            if (params.options.executeJs) {
                module.util.executeJavascript(doc, executeJsTimeout, function (doc, errors) {
                    doDraw(doc, width, height, params.canvas, params.callback, allErrors.concat(errors));
                });
            } else {
                doDraw(doc, width, height, params.canvas, params.callback, allErrors);
            }
        });
    };

    module.drawHTML = function (html, canvas, options, callback) {
        // TODO remove reference to rasterizeHTMLInline.util
        var params = module.util.parseOptionalParameters(canvas, options, callback),
            doc = theWindow.document.implementation.createHTMLDocument("");

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
                    url: url,
                    msg: "Unable to load page " + url
                }]);
            }
        });
    };

    return module;
}(window.rasterizeHTMLInline, window.HTMLtoXML, window));
