window.rasterizeHTML = (function (rasterizeHTMLInline, xmlserializer, ayepromise, theWindow) {
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

    var baseUrlRespectingXMLHttpRequestProxy = function (XHRObject, baseUrl) {
        return function () {
            var xhr = new XHRObject(),
                open = xhr.open;

            xhr.open = function () {
                var args = Array.prototype.slice.call(arguments),
                    method = args.shift(),
                    url = args.shift(),
                    // TODO remove reference to rasterizeHTMLInline.util
                    joinedUrl = rasterizeHTMLInline.util.joinUrl(baseUrl, url);

                return open.apply(this, [method, joinedUrl].concat(args));
            };

            return xhr;
        };
    };

    module.util.executeJavascript = function (doc, baseUrl, timeout) {
        var iframe = createHiddenElement(theWindow.document, "iframe"),
            html = doc.documentElement.outerHTML,
            iframeErrorsMessages = [],
            defer = ayepromise.defer(),
            doResolve = function () {
                var doc = iframe.contentDocument;
                theWindow.document.getElementsByTagName("body")[0].removeChild(iframe);
                defer.resolve({
                    document: doc,
                    errors: iframeErrorsMessages
                });
            };

        if (timeout > 0) {
            iframe.onload = function () {
                setTimeout(doResolve, timeout);
            };
        } else {
            iframe.onload = doResolve;
        }

        iframe.contentDocument.open();
        iframe.contentWindow.XMLHttpRequest = baseUrlRespectingXMLHttpRequestProxy(iframe.contentWindow.XMLHttpRequest, baseUrl);
        iframe.contentWindow.onerror = function (msg) {
            iframeErrorsMessages.push({
                resourceType: "scriptExecution",
                msg: msg
            });
        };

        iframe.contentDocument.write(html);
        iframe.contentDocument.close();

        return defer.promise;
    };

    var createHiddenSandboxedIFrame = function (doc, width, height) {
        var iframe = doc.createElement('iframe');
        iframe.style.width = width + "px";
        iframe.style.height = height + "px";
        // 'display: none' doesn't cut it, as browsers seem to be lazy loading content
        iframe.style.visibility = "hidden";
        iframe.style.position = "absolute";
        iframe.style.top = (-10000 - height) + "px";
        iframe.style.left = (-10000 - width) + "px";
        // Don't execute JS, all we need from sandboxing is access to the iframe's document
        iframe.sandbox = 'allow-same-origin';
        // We need to add the element to the document so that its content gets loaded
        doc.getElementsByTagName("body")[0].appendChild(iframe);
        return iframe;
    };

    module.util.calculateDocumentContentSize = function (doc, viewportWidth, viewportHeight) {
        var html = doc.documentElement.outerHTML,
            iframe = createHiddenSandboxedIFrame(theWindow.document, viewportWidth, viewportHeight),
            defer = ayepromise.defer();

        iframe.onload = function () {
            var doc = iframe.contentDocument,
                // clientWidth/clientHeight needed for PhantomJS
                canvasWidth = Math.max(doc.documentElement.scrollWidth, doc.body.clientWidth),
                canvasHeight = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, doc.body.clientHeight);

            theWindow.document.getElementsByTagName("body")[0].removeChild(iframe);

            defer.resolve({
                width: canvasWidth,
                height: canvasHeight
            });
        };

        // srcdoc doesn't work in PhantomJS yet
        iframe.contentDocument.open();
        iframe.contentDocument.write(html);
        iframe.contentDocument.close();

        return defer.promise;
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

    module.util.loadDocument = function (url, options) {
        var ajaxRequest = new window.XMLHttpRequest(),
            // TODO remove reference to rasterizeHTMLInline.util
            joinedUrl = rasterizeHTMLInline.util.joinUrl(options.baseUrl, url),
            augmentedUrl = getUncachableURL(joinedUrl, options.cache),
            defer = ayepromise.defer(),
            doReject = function () {
                defer.reject({message: "Unable to load page"});
            };

        ajaxRequest.addEventListener("load", function () {
            if (ajaxRequest.status === 200 || ajaxRequest.status === 0) {
                defer.resolve(ajaxRequest.responseXML);
            } else {
                doReject();
            }
        }, false);

        ajaxRequest.addEventListener("error", function () {
            doReject();
        }, false);

        try {
            ajaxRequest.open('GET', augmentedUrl, true);
            ajaxRequest.responseType = "document";
            ajaxRequest.send(null);
        } catch (err) {
            doReject();
        }

        return defer.promise;
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

    module.util.addClassNameRecursively = function (element, className) {
        element.className += ' ' + className;

        if (element.parentNode !== element.ownerDocument) {
            module.util.addClassNameRecursively(element.parentNode, className);
        }
    };

    var changeCssRule = function (rule, newRuleText) {
        var styleSheet = rule.parentStyleSheet,
            ruleIdx = Array.prototype.indexOf.call(styleSheet.cssRules, rule);

        // Exchange rule with the new text
        styleSheet.insertRule(newRuleText, ruleIdx+1);
        styleSheet.deleteRule(ruleIdx);
    };

    var updateRuleSelector = function (rule, updatedSelector) {
        var styleDefinitions = rule.cssText.replace(/^[^\{]+/, ''),
            newRule = updatedSelector + ' ' + styleDefinitions;

        changeCssRule(rule, newRule);
    };

    var cssRulesToText = function (cssRules) {
        return Array.prototype.reduce.call(cssRules, function (cssText, rule) {
            return cssText + rule.cssText;
        }, '');
    };

    var rewriteStyleContent = function (styleElement) {
        styleElement.textContent = cssRulesToText(styleElement.sheet.cssRules);
    };

    module.util.rewriteStyleRuleSelector = function (doc, oldSelector, newSelector) {
        // Assume that oldSelector is always prepended with a ':' or '.' for now, so no special handling needed
        var oldSelectorRegex = oldSelector + '(?=\\W|$)';

        Array.prototype.forEach.call(doc.querySelectorAll('style'), function (styleElement) {
            var matchingRules = Array.prototype.filter.call(styleElement.sheet.cssRules, function (rule) {
                    return rule.selectorText && new RegExp(oldSelectorRegex).test(rule.selectorText);
                });

            if (matchingRules.length) {
                matchingRules.forEach(function (rule) {
                    var selector = rule.selectorText.replace(new RegExp(oldSelectorRegex, 'g'), newSelector);

                    updateRuleSelector(rule, selector);
                });

                rewriteStyleContent(styleElement);
            }
        });
    };

    module.util.fakeHover = function (doc, hoverSelector) {
        var elem = doc.querySelector(hoverSelector),
            fakeHoverClass = 'rasterizehtmlhover';
        if (! elem) {
            return;
        }

        module.util.addClassNameRecursively(elem, fakeHoverClass);
        module.util.rewriteStyleRuleSelector(doc, ':hover', '.' + fakeHoverClass);
    };

    module.util.fakeActive = function (doc, activeSelector) {
        var elem = doc.querySelector(activeSelector),
            fakeActiveClass = 'rasterizehtmlactive';
        if (! elem) {
            return;
        }

        module.util.addClassNameRecursively(elem, fakeActiveClass);
        module.util.rewriteStyleRuleSelector(doc, ':active', '.' + fakeActiveClass);
    };

    module.util.persistInputValues = function (doc) {
        var inputs = Array.prototype.slice.call(doc.querySelectorAll('input')),
            textareas = Array.prototype.slice.call(doc.querySelectorAll('textarea')),
            isCheckable = function (input) {
                return input.type === 'checkbox' || input.type === 'radio';
            };

        inputs.filter(isCheckable)
            .forEach(function (input) {
                if (input.checked) {
                    input.setAttribute('checked', '');
                } else {
                    input.removeAttribute('checked');
                }
            });

        inputs.filter(function (input) { return !isCheckable(input); })
            .forEach(function (input) {
                input.setAttribute('value', input.value);
            });

        textareas
            .forEach(function (textarea) {
                textarea.textContent = textarea.value;
            });
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

        image = new theWindow.Image();
        image.onload = function() {
            resetEventHandlers();
            cleanUp();

            defer.resolve(image);
        };
        image.onerror = function () {
            cleanUp();

            // Webkit calls the onerror handler if the SVG is faulty
            defer.reject();
        };
        image.src = url;

        return defer.promise;
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

    module.drawDocumentImage = function (doc, canvas, options) {
        var viewportSize = getViewportSize(canvas, options);

        if (options.hover) {
            module.util.fakeHover(doc, options.hover);
        }
        if (options.active) {
            module.util.fakeActive(doc, options.active);
        }

        return module.util.calculateDocumentContentSize(doc, viewportSize.width, viewportSize.height)
            .then(function (size) {
                return module.getSvgForDocument(doc, size.width, size.height);
            })
            .then(function (svg) {
                return module.renderSvg(svg, canvas);
            });
    };

    /* "Public" API */

    var doDraw = function (doc, canvas, options) {
        var drawError = {message: "Error rendering page"};

        return module.drawDocumentImage(doc, canvas, options).then(function (image) {
            var successful;

            if (canvas) {
                successful = module.drawImageOnCanvas(image, canvas);

                if (!successful) {
                    throw drawError;
                }
            }

            return image;
        }, function () {
            throw drawError;
        });
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

    var drawDocument = function (doc, canvas, options) {
        var executeJsTimeout = options.executeJsTimeout || 0,
            inlineOptions;

        inlineOptions = rasterizeHTMLInline.util.clone(options);
        inlineOptions.inlineScripts = options.executeJs === true;

        return rasterizeHTMLInline.inlineReferences(doc, inlineOptions)
            .then(function (errors) {
                if (options.executeJs) {
                    return module.util.executeJavascript(doc, options.baseUrl, executeJsTimeout)
                        .then(function (result) {
                            var document = result.document;
                            module.util.persistInputValues(document);

                            return {
                                document: document,
                                errors: errors.concat(result.errors)
                            };
                        });
                } else {
                    return {
                        document: doc,
                        errors: errors
                    };
                }
            }).then(function (result) {
                return doDraw(result.document, canvas, options)
                    .then(function (image) {
                        return {
                            image: image,
                            errors: result.errors
                        };
                    });
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

        var promise = drawDocument(doc, params.canvas, params.options);

        // legacy API
        if (params.callback) {
            promise.then(function (result) {
                params.callback(result.image, result.errors);
            }, function (e) {
                params.callback(null, [{
                    resourceType: "document",
                    msg: e.message
                }]);
            });
        }

        return promise;
    };

    var drawHTML = function (html, canvas, options, callback) {
        var doc = module.util.parseHTML(html);

        return module.drawDocument(doc, canvas, options, callback);
    };

    /**
     * Draws a HTML string to the canvas.
     * rasterizeHTML.drawHTML( html [, canvas] [, options] [, callback] );
     */
    module.drawHTML = function () {
        var html = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = module.util.parseOptionalParameters(optionalArguments);

        return drawHTML(html, params.canvas, params.options, params.callback);
    };

    var drawURL = function (url, canvas, options, callback) {
        var promise = module.util.loadDocument(url, options)
            .then(function (doc) {
                return module.drawDocument(doc, canvas, options);
            });

        // legacy API
        if (callback) {
            promise.then(function (result) {
                    callback(result.image, result.errors);
                }, function (e) {
                    callback(null, [{
                        resourceType: "page",
                        url: url,
                        msg: e.message + ' ' + url
                    }]);
                });
        }

        return promise;
    };

    /**
     * Draws a page to the canvas.
     * rasterizeHTML.drawURL( url [, canvas] [, options] [, callback] );
     */
    module.drawURL = function () {
        var url = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = module.util.parseOptionalParameters(optionalArguments);

        return drawURL(url, params.canvas, params.options, params.callback);
    };

    return module;
}(window.rasterizeHTMLInline, window.xmlserializer, ayepromise, window));
