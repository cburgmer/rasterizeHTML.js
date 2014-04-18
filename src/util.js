var util = (function (xhrproxies, ayepromise, url, theWindow) {
    "use strict";

    var module = {};

    var uniqueIdList = [];

    module = {};

    module.joinUrl = function (baseUrl, relUrl) {
        return url.resolve(baseUrl, relUrl);
    };

    module.getConstantUniqueIdFor = function (element) {
        // HACK, using a list results in O(n), but how do we hash e.g. a DOM node?
        if (uniqueIdList.indexOf(element) < 0) {
            uniqueIdList.push(element);
        }
        return uniqueIdList.indexOf(element);
    };

    module.clone = function (object) {
        var theClone = {},
            i;
        for (i in object) {
            if (object.hasOwnProperty(i)) {
                theClone[i] = object[i];
            }
        }
        return theClone;
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

    module.parseOptionalParameters = function (args) { // args: canvas, options, callback
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
                    parameters.options = module.clone(args[1]);
                    parameters.callback = args[2] || null;
                }

            } else {
                parameters.options = module.clone(args[0]);
                parameters.callback = args[1] || null;
            }
        }

        return parameters;
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

    module.executeJavascript = function (doc, baseUrl, timeout) {
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

        var xhr = iframe.contentWindow.XMLHttpRequest,
            baseUrlXhrProxy = xhrproxies.baseUrlRespecting(xhr, baseUrl);

        iframe.contentDocument.open();
        iframe.contentWindow.XMLHttpRequest = baseUrlXhrProxy;
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

    module.calculateDocumentContentSize = function (doc, viewportWidth, viewportHeight) {
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

    module.parseHTML = function (html) {
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

    var isParseError = function (parsedDocument) {
        // http://stackoverflow.com/questions/11563554/how-do-i-detect-xml-parsing-errors-when-using-javascripts-domparser-in-a-cross
        var p = new DOMParser(),
            errorneousParse = p.parseFromString('<', 'text/xml'),
            parsererrorNS = errorneousParse.getElementsByTagName("parsererror")[0].namespaceURI;

        if (parsererrorNS === 'http://www.w3.org/1999/xhtml') {
            // In PhantomJS the parseerror element doesn't seem to have a special namespace, so we are just guessing here :(
            return parsedDocument.getElementsByTagName("parsererror").length > 0;
        }

        return parsedDocument.getElementsByTagNameNS(parsererrorNS, 'parsererror').length > 0;
    };

    var failOnParseError = function (doc) {
        if (isParseError(doc)) {
            throw {
                message: "Invalid source"
            };
        }
    };

    module.validateXHTML = function (xhtml) {
        var p = new DOMParser(),
            doc = p.parseFromString(xhtml, "application/xml");

        failOnParseError(doc);
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

    var doDocumentLoad = function (url, options) {
        var ajaxRequest = new window.XMLHttpRequest(),
            joinedUrl = util.joinUrl(options.baseUrl, url),
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

    module.loadDocument = function (url, options) {
        return doDocumentLoad(url, options)
            .then(function (doc) {
                failOnParseError(doc);

                return doc;
            });
    };

    module.addClassNameRecursively = function (element, className) {
        element.className += ' ' + className;

        if (element.parentNode !== element.ownerDocument) {
            module.addClassNameRecursively(element.parentNode, className);
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

    module.rewriteStyleRuleSelector = function (doc, oldSelector, newSelector) {
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

    module.fakeHover = function (doc, hoverSelector) {
        var elem = doc.querySelector(hoverSelector),
            fakeHoverClass = 'rasterizehtmlhover';
        if (! elem) {
            return;
        }

        module.addClassNameRecursively(elem, fakeHoverClass);
        module.rewriteStyleRuleSelector(doc, ':hover', '.' + fakeHoverClass);
    };

    module.fakeActive = function (doc, activeSelector) {
        var elem = doc.querySelector(activeSelector),
            fakeActiveClass = 'rasterizehtmlactive';
        if (! elem) {
            return;
        }

        module.addClassNameRecursively(elem, fakeActiveClass);
        module.rewriteStyleRuleSelector(doc, ':active', '.' + fakeActiveClass);
    };

    module.persistInputValues = function (doc) {
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

    return module;
}(xhrproxies, ayepromise, url, window));
