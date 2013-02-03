window.rasterizeHTMLInline = (function (window, URI, CSSParser) {
    "use strict";

    var module = {};

    /* Utilities */

    module.util = {};

    module.util.cloneArray = function (nodeList) {
        return Array.prototype.slice.apply(nodeList, [0]);
    };

    module.util.joinUrl = function (baseUrl, url) {
        var theUrl = new URI(url);
        if (theUrl.is("relative")) {
            theUrl = theUrl.absoluteTo(baseUrl);
        }
        return theUrl.toString();
    };

    module.util.isDataUri = function (url) {
        return (/^data:/).test(url);
    };

    module.util.map = function (list, func, callback) {
        var completedCount = 0,
            // Operating inline on array-like structures like document.getElementByTagName() (e.g. deleting a node),
            // will change the original list
            clonedList = module.util.cloneArray(list),
            results = [],
            i;

        if (clonedList.length === 0) {
            callback(results);
        }

        var callForItem = function (idx) {
            function funcFinishCallback(result) {
                completedCount += 1;

                results[idx] = result;

                if (completedCount === clonedList.length) {
                    callback(results);
                }
            }

            func(clonedList[idx], funcFinishCallback);
        };

        for(i = 0; i < clonedList.length; i++) {
            callForItem(i);
        }
    };

    var getUncachableURL = function (url) {
        return url + "?_=" + Date.now();
    };

    module.util.ajax = function (url, options, successCallback, errorCallback) {
        var ajaxRequest = new window.XMLHttpRequest(),
            augmentedUrl;

        options = options || {};
        augmentedUrl = options.cache === false ? getUncachableURL(url) : url;

        ajaxRequest.addEventListener("load", function () {
            if (ajaxRequest.status === 200 || ajaxRequest.status === 0) {
                successCallback(ajaxRequest.response);
            } else {
                errorCallback();
            }
        }, false);

        ajaxRequest.addEventListener("error", function () {
            errorCallback();
        }, false);

        ajaxRequest.open('GET', augmentedUrl, true);
        ajaxRequest.overrideMimeType(options.mimeType);
        try {
            ajaxRequest.send(null);
        } catch (err) {
            errorCallback();
        }
    };

    module.util.binaryAjax = function (url, options, successCallback, errorCallback) {
        var binaryContent = "";

        options = options || {};

        module.util.ajax(url, {
            mimeType: 'text/plain; charset=x-user-defined',
            cache: options.cache
        }, function (content) {
            for (var i = 0; i < content.length; i++) {
                binaryContent += String.fromCharCode(content.charCodeAt(i) & 0xFF);
            }
            successCallback(binaryContent);
        }, errorCallback);
    };

    var unquoteUrl = function (quotedUrl) {
        var doubleQuoteRegex = /^"(.*)"$/,
            singleQuoteRegex = /^'(.*)'$/;

        if (doubleQuoteRegex.test(quotedUrl)) {
            return quotedUrl.replace(doubleQuoteRegex, "$1");
        } else {
            if (singleQuoteRegex.test(quotedUrl)) {
                return quotedUrl.replace(singleQuoteRegex, "$1");
            } else {
                return quotedUrl;
            }
        }
    };

    var trimCSSWhitespace = function (url) {
        var whitespaceRegex = /^[\t\r\f\n ]*(.+?)[\t\r\f\n ]*$/;

        return url.replace(whitespaceRegex, "$1");
    };

    module.util.extractCssUrl = function (cssUrl) {
        var urlRegex = /^url\(([^\)]+)\)/,
            quotedUrl;

        if (!urlRegex.test(cssUrl)) {
            throw new Error("Invalid url");
        }

        quotedUrl = urlRegex.exec(cssUrl)[1];
        return unquoteUrl(trimCSSWhitespace(quotedUrl));
    };

    module.util.getDataURIForImageURL = function (url, options, successCallback, errorCallback) {
        var base64Content;

        module.util.binaryAjax(url, options, function (content) {
            base64Content = btoa(content);

            successCallback('data:image/png;base64,' + base64Content);
        }, function () {
            errorCallback();
        });
    };

    /* Inlining */

    var getUrlRelativeToDocumentBase = function (url, baseUrl) {
        if (baseUrl && baseUrl !== "about:blank") {
            url = module.util.joinUrl(baseUrl, url);
        }

        return url;
    };

    var parseCss = function (styleContent) {
        var parser = new CSSParser(),
            parsedCSS = parser.parse(styleContent, false, true);

        return parsedCSS;
    };

    var findBackgroundImageDeclarations = function (parsedCSS) {
        var declarationsToInline = [],
            i, j, rule;

        if (! parsedCSS) {
            return [];
        }

        for (i = 0; i < parsedCSS.cssRules.length; i++) {
            rule = parsedCSS.cssRules[i];
            if (rule.type === window.kJscsspSTYLE_RULE) {
                for (j = 0; j < rule.declarations.length; j++) {
                    if (rule.declarations[j].property === "background-image") {
                        declarationsToInline.push(rule.declarations[j]);
                    }
                }
            }
        }

        return declarationsToInline;
    };

    var findFontFaceDescriptors = function (parsedCSS) {
        var descriptorsToInline = [],
            i, j, rule;

        if (! parsedCSS) {
            return [];
        }

        for (i = 0; i < parsedCSS.cssRules.length; i++) {
            rule = parsedCSS.cssRules[i];
            if (rule.type === window.kJscsspFONT_FACE_RULE) {
                for (j = 0; j < rule.descriptors.length; j++) {
                    if (rule.descriptors[j].property === "src") {
                        descriptorsToInline.push(rule.descriptors[j]);
                    }
                }
            }
        }

        return descriptorsToInline;
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

    var isFunction = function (func) {
        return typeof func === "function";
    };

    module.util.parseOptionalParameters = function () { // args: options, callback
        var parameters = {
            options: {},
            callback: null
        };

        if (isFunction(arguments[0])) {
            parameters.callback = arguments[0];
        } else {
            parameters.options = cloneObject(arguments[0]);
            parameters.callback = arguments[1] || null;
        }

        return parameters;
    };

    /* Img Inlining */

    var encodeImageAsDataURI = function (image, baseUrl, cache, successCallback, errorCallback) {
        var url = image.attributes.src.nodeValue,
            base = baseUrl || image.ownerDocument.baseURI;

        if (module.util.isDataUri(url)) {
            successCallback();
            return;
        }

        url = getUrlRelativeToDocumentBase(url, base);

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
                    url: url
                });
                finish();
            });
        }, function () {
            if (params.callback) {
                params.callback(errors);
            }
        });
    };

    /* CSS inlining */

    var adjustPathOfDeclarationAndReportChange = function (baseUrl, cssDeclaration) {
        var url;
        try {
            url = module.util.extractCssUrl(cssDeclaration.values[0].cssText());
        } catch (e) {
            return false;
        }

        if (module.util.isDataUri(url)) {
            return false;
        }

        url = module.util.joinUrl(baseUrl, url);
        cssDeclaration.values[0].setCssText('url("' + url + '")');

        return true;
    };

    var adjustPathsOfCssResources = function (baseUrl, styleContent) {
        var parsedCss = parseCss(styleContent),
            declarationsToInline = [],
            change = false,
            i;

        declarationsToInline = declarationsToInline.concat(findBackgroundImageDeclarations(parsedCss));
        declarationsToInline = declarationsToInline.concat(findFontFaceDescriptors(parsedCss));

        for(i = 0; i < declarationsToInline.length; i++) {
            change = adjustPathOfDeclarationAndReportChange(baseUrl, declarationsToInline[i]) || change;
        }

        if (change) {
            return parsedCss.cssText();
        } else {
            return styleContent;
        }
    };

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
            cssHrefRelativeToDoc = getUrlRelativeToDocumentBase(cssHref, documentBaseUrl),
            cssContent;

        module.util.ajax(cssHrefRelativeToDoc, {
            cache: cache
        }, function (content) {
            cssContent = adjustPathsOfCssResources(cssHref, content);

            successCallback(cssContent);
        }, function () {
            errorCallback(cssHrefRelativeToDoc);
        });
    };

    module.loadAndInlineCSS = function (doc, options, callback) {
        var params = module.util.parseOptionalParameters(options, callback),
            links = doc.getElementsByTagName("link"),
            baseUrl = params.options.baseUrl,
            cache = params.options.cache !== false,
            errors = [];

        module.util.map(links, function (link, finish) {
            if (link.attributes.rel && link.attributes.rel.nodeValue === "stylesheet" &&
                (!link.attributes.type || link.attributes.type.nodeValue === "text/css")) {
                loadLinkedCSS(link, baseUrl, cache, function(css) {
                    substituteLinkWithInlineStyle(link, css + "\n");
                    finish();
                }, function (url) {
                    errors.push({
                        resourceType: "stylesheet",
                        url: url
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

    /* CSS import inlining */

    var findCSSImportDeclarations = function (parsedCSS) {
        var rulesToInline = [],
            i, rule;

        for (i = 0; i < parsedCSS.cssRules.length; i++) {
            rule = parsedCSS.cssRules[i];
            if (rule.type === window.kJscsspIMPORT_RULE) {
                rulesToInline.push(rule);
            }
        }

        return rulesToInline;
    };

    var fakeCssParserRule = function (cssText) {
        return {
            cssText: function () {
                return cssText;
            }
        };
    };

    var substituteRuleWithText = function (rule, cssHref, cssText) {
        var cssContent = adjustPathsOfCssResources(cssHref, cssText),
            newRule = fakeCssParserRule(cssContent),
            stylesheet = rule.parentStyleSheet,
            position = stylesheet.cssRules.indexOf(rule);

        stylesheet.cssRules.splice(position, 1, newRule);
    };

    var isQuotedString = function (string) {
        var doubleQuoteRegex = /^"(.*)"$/,
            singleQuoteRegex = /^'(.*)'$/;

        return doubleQuoteRegex.test(string) || singleQuoteRegex.test(string);
    };

    var loadAndInlineCSSImport = function (declaration, documentBaseUrl, cache, alreadyLoadedCssUrls, successCallback, errorCallback) {
        var href = declaration.href,
            cssHrefRelativeToDoc, url;

        if (isQuotedString(href)) {
            url = unquoteUrl(href);
        } else {
            try {
                url = module.util.extractCssUrl(href);
            } catch (e) {
                successCallback(false);
                return;
            }
        }

        cssHrefRelativeToDoc = getUrlRelativeToDocumentBase(url, documentBaseUrl);

        if (alreadyLoadedCssUrls.indexOf(cssHrefRelativeToDoc) >= 0) {
            // Remove URL by adding empty string
            substituteRuleWithText(declaration, url, "");
            successCallback(true, []);
            return;
        } else {
            alreadyLoadedCssUrls.push(cssHrefRelativeToDoc);
        }

        module.util.ajax(cssHrefRelativeToDoc, {cache: cache}, function (cssText) {
            // Recursively follow @import statements
            loadCSSImportsForString(cssText, documentBaseUrl, cache, alreadyLoadedCssUrls, function (newCssText, errors) {
                substituteRuleWithText(declaration, url, newCssText);

                successCallback(true, errors);
            });
        }, function () {
            errorCallback(cssHrefRelativeToDoc);
        });
    };

    var loadCSSImportsForString = function (cssContent, baseUrl, cache, alreadyLoadedCssUrls, callback) {
        var parsedCss = parseCss(cssContent),
            errors = [],
            declarationsToInline;

        if (!parsedCss) {
            callback(cssContent, errors);
            return;
        }

        declarationsToInline = findCSSImportDeclarations(parsedCss);

        module.util.map(declarationsToInline, function (declaration, finish) {
            loadAndInlineCSSImport(declaration, baseUrl, cache, alreadyLoadedCssUrls, function (changed, moreErrors) {
                errors = errors.concat(moreErrors);

                finish(changed);
            }, function (url) {
                errors.push({
                    resourceType: "stylesheet",
                    url: url
                });

                finish();
            });
        }, function (changedStates) {
            // CSSParser is invasive, if no changes are needed, we leave the text as it is
            if (changedStates.indexOf(true) >= 0) {
                cssContent = parsedCss.cssText().trim();
            }

            callback(cssContent, errors);
        });
    };

    var loadAndInlineCSSImportsForStyle = function (style, baseUrl, cache, alreadyLoadedCssUrls, callback) {
        loadCSSImportsForString(style.textContent, baseUrl, cache, alreadyLoadedCssUrls, function (newCssContent, errors) {
            if (style.textContent !== newCssContent) {
                style.childNodes[0].nodeValue = newCssContent;
            }

            callback(errors);
        });
    };

    module.loadAndInlineCSSImports = function (doc, options, callback) {
        var params = module.util.parseOptionalParameters(options, callback),
            styles = doc.getElementsByTagName("style"),
            base = params.options.baseUrl || doc.baseURI,
            cache = params.options.cache !== false,
            allErrors = [],
            alreadyLoadedCssUrls = [];

        module.util.map(styles, function (style, finish) {
            if (!style.attributes.type || style.attributes.type.nodeValue === "text/css") {
                loadAndInlineCSSImportsForStyle(style, base, cache, alreadyLoadedCssUrls, function (errors) {
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

    /* CSS linked resource inlining */

    var loadAndInlineBackgroundImage = function (cssDeclaration, baseUri, cache, successCallback, errorCallback) {
        var url;
        try {
            url = module.util.extractCssUrl(cssDeclaration.values[0].cssText());
        } catch (e) {
            successCallback(false);
            return;
        }

        if (module.util.isDataUri(url)) {
            successCallback(false);
            return;
        }

        url = getUrlRelativeToDocumentBase(url, baseUri);

        module.util.getDataURIForImageURL(url, {
            cache: cache
        }, function (dataURI) {
            cssDeclaration.values[0].setCssText('url("' + dataURI + '")');

            successCallback(true);
        }, function () {
            errorCallback(url);
        });
    };

    var iterateOverRulesAndInlineBackgroundImage = function (parsedCss, baseUri, cache, callback) {
        var declarationsToInline = findBackgroundImageDeclarations(parsedCss),
            errors = [],
            cssHasChanges;

        module.util.map(declarationsToInline, function (declaration, finish) {
            loadAndInlineBackgroundImage(declaration, baseUri, cache, finish, function (url) {
                errors.push({
                    resourceType: "backgroundImage",
                    url: url
                });
                finish();
            });

        }, function (changedStates) {
            cssHasChanges = changedStates.indexOf(true) >= 0;
            callback(cssHasChanges, errors);
        });
    };

    var loadAndInlineFontFace = function (cssDeclaration, baseUri, cache, successCallback, errorCallback) {
        var url, base64Content;
        try {
            url = module.util.extractCssUrl(cssDeclaration.values[0].cssText());
        } catch (e) {
            successCallback(false);
            return;
        }

        if (module.util.isDataUri(url)) {
            successCallback(false);
            return;
        }

        url = getUrlRelativeToDocumentBase(url, baseUri);

        module.util.binaryAjax(url, {
            cache: cache
        }, function (content) {
            base64Content = btoa(content);
            cssDeclaration.values[0].setCssText('url("data:font/woff;base64,' + base64Content + '")');

            successCallback(true);
        }, function () {
            errorCallback(url);
        });
    };

    var iterateOverRulesAndInlineFontFace = function (parsedCss, baseUri, cache, callback) {
        var descriptorsToInline = findFontFaceDescriptors(parsedCss),
            errors = [],
            cssHasChanges;

        module.util.map(descriptorsToInline, function (declaration, finish) {
            loadAndInlineFontFace(declaration, baseUri, cache, finish, function (url) {
                errors.push({
                    resourceType: "fontFace",
                    url: url
                });
                finish();
            });

        }, function (changedStates) {
            cssHasChanges = changedStates.indexOf(true) >= 0;
            callback(cssHasChanges, errors);
        });
    };

    var workAroundWebkitBugIgnoringTheFirstRuleInCSS = function (cssContent, parsedCss) {
        // Works around bug with webkit ignoring the first rule in each style declaration when rendering the SVG to the
        // DOM. While this does not directly affect the process when rastering to canvas, this is needed for the
        // workaround found in workAroundBrowserBugForBackgroundImages();
        var hasBackgroundImageDeclarations = (findBackgroundImageDeclarations(parsedCss).length +
                findFontFaceDescriptors(parsedCss).length) > 0;

        if (hasBackgroundImageDeclarations && window.navigator.userAgent.indexOf("WebKit") >= 0) {
            return "span {}\n" + cssContent;
        } else {
            return cssContent;
        }
    };

    var loadAndInlineCSSResourcesForStyle = function (style, baseUrl, cache, callback) {
        var cssContent = style.textContent,
            base = baseUrl || style.ownerDocument.baseURI,
            parsedCss = parseCss(cssContent);

        iterateOverRulesAndInlineBackgroundImage(parsedCss, base, cache, function (bgImagesHaveChanges, bgImageErrors) {
            iterateOverRulesAndInlineFontFace(parsedCss, base, cache, function (fontsHaveChanges, fontFaceErrors) {
                // CSSParser is invasive, if no changes are needed, we leave the text as it is
                if (bgImagesHaveChanges || fontsHaveChanges) {
                    cssContent = parsedCss.cssText();
                }
                cssContent = workAroundWebkitBugIgnoringTheFirstRuleInCSS(cssContent, parsedCss);
                style.childNodes[0].nodeValue = cssContent;

                callback(bgImageErrors.concat(fontFaceErrors));
            });
        });
    };

    module.loadAndInlineCSSReferences = function (doc, options, callback) {
        var params = module.util.parseOptionalParameters(options, callback),
            allErrors = [],
            baseUrl = params.options.baseUrl,
            cache = params.options.cache !== false,
            styles = doc.getElementsByTagName("style");

        module.util.map(styles, function (style, finish) {
            if (!style.attributes.type || style.attributes.type.nodeValue === "text/css") {
                loadAndInlineCSSResourcesForStyle(style, baseUrl, cache, function (errors) {
                    allErrors = allErrors.concat(errors);
                    finish();
                });
            } else {
                // We need to properly deal with non-css in this concurrent context
                finish();
            }
        }, function () {
            if (params.callback) {
                params.callback(allErrors);
            }
        });
    };

    /* Script inlining */

    var loadLinkedScript = function (script, baseUrl, cache, successCallback, errorCallback) {
        var base = baseUrl || script.ownerDocument.baseURI,
            scriptSrcRelativeToDoc = getUrlRelativeToDocumentBase(script.attributes.src.nodeValue, base);

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
                        url: url
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

        // TODO introduce parseOptionalParameters
        module.loadAndInlineImages(doc, options, function (errors) {
            allErrors = allErrors.concat(errors);
            module.loadAndInlineCSS(doc, options, function (errors) {
                allErrors = allErrors.concat(errors);
                module.loadAndInlineCSSImports(doc, options, function (errors) {
                    allErrors = allErrors.concat(errors);
                    module.loadAndInlineCSSReferences(doc, options, function (errors) {
                        allErrors = allErrors.concat(errors);
                        module.loadAndInlineScript(doc, options, function (errors) {
                            allErrors = allErrors.concat(errors);

                            callback(allErrors);
                        });
                    });
                });
            });
        });
    };

    return module;
}(window, URI, CSSParser));
