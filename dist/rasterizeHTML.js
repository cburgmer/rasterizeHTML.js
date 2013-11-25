/*! rasterizeHTML.js - v0.6.0 - 2013-11-25
* http://www.github.com/cburgmer/rasterizeHTML.js
* Copyright (c) 2013 Christoph Burgmer; Licensed MIT */
window.rasterizeHTMLInline = (function (module) {
    "use strict";

    var getUrlBasePath = function (url) {
        return module.util.joinUrl(url, '.');
    };

    var parameterHashFunction = function (params) {
        // HACK JSON.stringify is poor man's hashing;
        // same objects might not receive same result as key order is not guaranteed
        var a = params.map(function (param, idx) {
            // Only include options relevant for method
            if (idx === (params.length - 1)) {
                param = {
                    // Two different HTML pages on the same path level have the same base path, but a different URL
                    baseUrl: getUrlBasePath(param.baseUrl)
                };
            }
            return JSON.stringify(param);
        });
        return a;
    };

    var memoizeFunctionOnCaching = function (func, options) {
        if ((options.cache !== false && options.cache !== 'none') && options.cacheBucket) {
            return module.util.memoize(func, parameterHashFunction, options.cacheBucket);
        } else {
            return func;
        }
    };

    /* Img Inlining */

    var encodeImageAsDataURI = function (image, options, successCallback, errorCallback) {
        var url = image.attributes.src ? image.attributes.src.nodeValue : null,
            documentBase = module.util.getDocumentBaseUrl(image.ownerDocument),
            ajaxOptions = module.util.clone(options);

        if (url === null || module.util.isDataUri(url)) {
            successCallback();
            return;
        }

        if (!ajaxOptions.baseUrl && documentBase) {
            ajaxOptions.baseUrl = documentBase;
        }

        module.util.getDataURIForImageURL(url, ajaxOptions, function (dataURI) {
            image.attributes.src.nodeValue = dataURI;
            successCallback();
        }, function () {
            errorCallback(module.util.joinUrl(ajaxOptions.baseUrl, url));
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
            imageLike = [],
            errors = [];

        imageLike = Array.prototype.slice.call(images);
        imageLike = imageLike.concat(filterInputsForImageType(inputs));

        module.util.map(imageLike, function (image, finish) {
            encodeImageAsDataURI(image, params.options, finish, function (url) {
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

    var requestExternalsForStylesheet = function (styleContent, alreadyLoadedCssUrls, options, callback) {
        var cssRules = module.css.rulesForCssText(styleContent);

        module.css.loadCSSImportsForRules(cssRules, alreadyLoadedCssUrls, options, function (changedFromImports, importErrors) {
            module.css.loadAndInlineCSSResourcesForRules(cssRules, options, function (changedFromResources, resourceErrors) {
                var errors = importErrors.concat(resourceErrors),
                    hasChanges = changedFromImports || changedFromResources;

                if (hasChanges) {
                    styleContent = module.css.cssRulesToText(cssRules);
                }

                callback(hasChanges, styleContent, errors);
            });
        });
    };

    var loadAndInlineCssForStyle = function (style, options, alreadyLoadedCssUrls, callback) {
        var styleContent = style.textContent,
            processExternals = memoizeFunctionOnCaching(requestExternalsForStylesheet, options);

        processExternals(styleContent, alreadyLoadedCssUrls, options, function (hasChanges, inlinedStyleContent, errors) {
            errors = module.util.cloneArray(errors);
            if (hasChanges) {
                style.childNodes[0].nodeValue = inlinedStyleContent;
            }

            callback(errors);
        });
    };

    var getArrayForArrayLike = function (list) {
        return Array.prototype.slice.call(list);
    };

    var getCssStyleElements = function (doc) {
        var styles = getArrayForArrayLike(doc.getElementsByTagName("style")),
            cssStyles = [];

        styles.forEach(function (style) {
            if (!style.attributes.type || style.attributes.type.nodeValue === "text/css") {
                cssStyles.push(style);
            }
        });

        return cssStyles;
    };

    module.loadAndInlineStyles = function (doc, options, callback) {
        var params = module.util.parseOptionalParameters(options, callback),
            styles = getCssStyleElements(doc),
            allErrors = [],
            alreadyLoadedCssUrls = [],
            inlineOptions;

        inlineOptions = module.util.clone(params.options);
        inlineOptions.baseUrl = inlineOptions.baseUrl || module.util.getDocumentBaseUrl(doc);

        module.util.map(styles, function (style, finish) {
            loadAndInlineCssForStyle(style, inlineOptions, alreadyLoadedCssUrls, function (errors) {
                allErrors = allErrors.concat(errors);

                finish();
            });
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

    var requestStylesheetAndInlineResources = function (url, options, successCallback, errorCallback) {
        module.util.ajax(url, options, function (content) {
            var cssRules = module.css.rulesForCssText(content),
                changedFromPathAdjustment;

            changedFromPathAdjustment = module.css.adjustPathsOfCssResources(url, cssRules);
            module.css.loadCSSImportsForRules(cssRules, [], options, function (changedFromImports, importErrors) {
                module.css.loadAndInlineCSSResourcesForRules(cssRules, options, function (changedFromResources, resourceErrors) {
                    var errors = importErrors.concat(resourceErrors);

                    if (changedFromPathAdjustment || changedFromImports || changedFromResources) {
                        content = module.css.cssRulesToText(cssRules);
                    }

                    successCallback(content, errors);
                });
            });
        }, errorCallback);
    };

    var loadLinkedCSS = function (link, options, successCallback, errorCallback) {
        var cssHref = link.attributes.href.nodeValue,
            documentBaseUrl = module.util.getDocumentBaseUrl(link.ownerDocument),
            ajaxOptions = module.util.clone(options);

        if (!ajaxOptions.baseUrl && documentBaseUrl) {
            ajaxOptions.baseUrl = documentBaseUrl;
        }

        var processStylesheet = memoizeFunctionOnCaching(requestStylesheetAndInlineResources, options);

        processStylesheet(cssHref, ajaxOptions, function (content, errors) {
            errors = module.util.cloneArray(errors);

            successCallback(content, errors);
        }, function () {
            errorCallback(module.util.joinUrl(ajaxOptions.baseUrl, cssHref));
        });
    };

    module.loadAndInlineCssLinks = function (doc, options, callback) {
        var params = module.util.parseOptionalParameters(options, callback),
            links = doc.getElementsByTagName("link"),
            errors = [];

        module.util.map(links, function (link, finish) {
            if (link.attributes.rel && link.attributes.rel.nodeValue === "stylesheet" &&
                (!link.attributes.type || link.attributes.type.nodeValue === "text/css")) {
                loadLinkedCSS(link, params.options, function(css, moreErrors) {
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

    var loadLinkedScript = function (script, options, successCallback, errorCallback) {
        var src = script.attributes.src.nodeValue,
            documentBase = module.util.getDocumentBaseUrl(script.ownerDocument),
            ajaxOptions = module.util.clone(options);

        if (!ajaxOptions.baseUrl && documentBase) {
            ajaxOptions.baseUrl = documentBase;
        }

        module.util.ajax(src, ajaxOptions, successCallback, function () {
            errorCallback(module.util.joinUrl(ajaxOptions.baseUrl, src));
        });
    };

    var escapeClosingTags = function (text) {
        // http://stackoverflow.com/questions/9246382/escaping-script-tag-inside-javascript
        return text.replace(/<\//g, '<\\/');
    };

    var substituteExternalScriptWithInline = function (oldScriptNode, jsCode) {
        var newScript = oldScriptNode.ownerDocument.createElement("script"),
            parent = oldScriptNode.parentNode;

        if (oldScriptNode.attributes.type) {
            newScript.type = oldScriptNode.attributes.type.nodeValue;
        }

        jsCode = escapeClosingTags(jsCode);

        newScript.appendChild(oldScriptNode.ownerDocument.createTextNode(jsCode));

        parent.insertBefore(newScript, oldScriptNode);
        parent.removeChild(oldScriptNode);
    };

    module.loadAndInlineScript = function (doc, options, callback) {
        var params = module.util.parseOptionalParameters(options, callback),
            scripts = doc.getElementsByTagName("script"),
            errors = [];

        module.util.map(scripts, function (script, finish) {
            if (script.attributes.src) {
                loadLinkedScript(script, params.options, function (jsCode) {
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

                    if (options.inlineScripts === false) {
                        callback(allErrors);
                    } else {
                        module.loadAndInlineScript(doc, options, function (errors) {
                            allErrors = allErrors.concat(errors);

                            callback(allErrors);
                        });
                    }
                });
            });
        });
    };

    return module;
}(window.rasterizeHTMLInline || {}));

window.rasterizeHTMLInline = (function (module, window, CSSOM) {
    "use strict";

    module.css = {};

    var getArrayForArrayLike = function (list) {
        return Array.prototype.slice.call(list);
    };

    var rulesForCssTextFromBrowser = function (styleContent) {
        var doc = document.implementation.createHTMLDocument(""),
            styleElement = document.createElement("style"),
            rules;

        styleElement.textContent = styleContent;
        // the style will only be parsed once it is added to a document
        doc.body.appendChild(styleElement);
        rules = styleElement.sheet.cssRules;

        return getArrayForArrayLike(rules);
    };

    var browserHasBackgroundImageUrlIssue = (function () {
        // Checks for http://code.google.com/p/chromium/issues/detail?id=161644
        var rules = rulesForCssTextFromBrowser('a{background:url(i)}');
        return !rules.length || rules[0].cssText.indexOf('url()') >= 0;
    }());

    module.css.rulesForCssText = function (styleContent) {
        if (browserHasBackgroundImageUrlIssue && CSSOM.parse) {
            return CSSOM.parse(styleContent).cssRules;
        } else {
            return rulesForCssTextFromBrowser(styleContent);
        }
    };

    var findBackgroundImageRules = function (cssRules) {
        var rulesToInline = [];

        cssRules.forEach(function (rule) {
            if (rule.type === window.CSSRule.STYLE_RULE && (rule.style.getPropertyValue('background-image') || rule.style.getPropertyValue('background'))) {
                rulesToInline.push(rule);
            }
        });

        return rulesToInline;
    };

    var findFontFaceRules = function (cssRules) {
        var rulesToInline = [];

        cssRules.forEach(function (rule) {
            if (rule.type === window.CSSRule.FONT_FACE_RULE && rule.style.getPropertyValue("src")) {
                rulesToInline.push(rule);
            }
        });

        return rulesToInline;
    };

    module.css.cssRulesToText = function (cssRules) {
        var cssText = "";

        cssRules.forEach(function (rule) {
            cssText += rule.cssText;
        });
        return cssText;
    };

    var unquoteString = function (quotedUrl) {
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

    module.css.extractCssUrl = function (cssUrl) {
        var urlRegex = /^url\(([^\)]+)\)/,
            quotedUrl;

        if (!urlRegex.test(cssUrl)) {
            throw new Error("Invalid url");
        }

        quotedUrl = urlRegex.exec(cssUrl)[1];
        return unquoteString(trimCSSWhitespace(quotedUrl));
    };

    var findFontFaceFormat = function (value) {
        var fontFaceFormatRegex = /^format\(([^\)]+)\)/,
            quotedFormat;

        if (!fontFaceFormatRegex.test(value)) {
            return null;
        }

        quotedFormat = fontFaceFormatRegex.exec(value)[1];
        return unquoteString(quotedFormat);
    };

    var extractFontFaceSrcUrl = function (reference) {
        var url, format = null;

        try {
            url = module.css.extractCssUrl(reference[0]);
            if (reference[1]) {
                format = findFontFaceFormat(reference[1]);
            }
            return {
                url: url,
                format: format
            };
        } catch (e) {}
    };

    // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=443978
    var changeFontFaceRuleSrc = function (cssRules, rule, newSrc) {
        var ruleIdx = cssRules.indexOf(rule),
            newRule = '@font-face { font-family: ' + rule.style.getPropertyValue("font-family") + '; src: ' + newSrc + '}',
            styleSheet = rule.parentStyleSheet;

        // Generate a new rule
        styleSheet.insertRule(newRule, ruleIdx+1);
        styleSheet.deleteRule(ruleIdx);
        // Exchange with the new
        cssRules[ruleIdx] = styleSheet.cssRules[ruleIdx];
    };

    module.css.adjustPathsOfCssResources = function (baseUrl, cssRules) {
        var change = false,
            joinedBackgroundDeclarations;

        findBackgroundImageRules(cssRules).forEach(function (rule) {
            var backgroundValue = rule.style.getPropertyValue('background-image') || rule.style.getPropertyValue('background'),
                backgroundDeclarations = sliceBackgroundDeclarations(backgroundValue),
                declarationChanged = false;

            backgroundDeclarations.forEach(function (singleBackgroundValues) {
                var bgUrl = findBackgroundImageUrlInValues(singleBackgroundValues),
                    url;

                if (bgUrl && !module.util.isDataUri(bgUrl.url)) {
                    url = module.util.joinUrl(baseUrl, bgUrl.url);
                    singleBackgroundValues[bgUrl.idx] = 'url("' + url + '")';
                    declarationChanged = true;
                }
            });

            joinedBackgroundDeclarations = joinBackgroundDeclarations(backgroundDeclarations);
            if (rule.style.getPropertyValue('background-image')) {
                rule.style.setProperty('background-image', joinedBackgroundDeclarations);
            } else {
                rule.style.setProperty('background', joinedBackgroundDeclarations);
            }
            change = change || declarationChanged;
        });
        findFontFaceRules(cssRules).forEach(function (rule) {
            var fontReferences = sliceFontFaceSrcReferences(rule.style.getPropertyValue("src")),
                declarationChanged = false;

            fontReferences.forEach(function (reference) {
                var fontSrc = extractFontFaceSrcUrl(reference),
                    url;

                if (fontSrc && !module.util.isDataUri(fontSrc.url)) {
                    url = module.util.joinUrl(baseUrl, fontSrc.url);
                    reference[0] = 'url("' + url + '")';
                    declarationChanged = true;
                }
            });

            if (declarationChanged) {
                changeFontFaceRuleSrc(cssRules, rule, joinFontFaceSrcReferences(fontReferences));
            }
            change = change || declarationChanged;
        });

        return change;
    };

    /* CSS import inlining */

    var findCSSImportRules = function (cssRules) {
        var rulesToInline = [];

        cssRules.forEach(function (rule) {
            if (rule.type === window.CSSRule.IMPORT_RULE && rule.href) {
                rulesToInline.push(rule);
            }
        });
        return rulesToInline;
    };

    var substituteRule = function (cssRules, rule, newCssRules) {
        var position = cssRules.indexOf(rule);

        cssRules.splice(position, 1);

        newCssRules.forEach(function (newRule, i) {
            cssRules.splice(position + i, 0, newRule);
        });
    };

    var isQuotedString = function (string) {
        var doubleQuoteRegex = /^"(.*)"$/,
            singleQuoteRegex = /^'(.*)'$/;

        return doubleQuoteRegex.test(string) || singleQuoteRegex.test(string);
    };

    var loadAndInlineCSSImport = function (cssRules, rule, alreadyLoadedCssUrls, options, successCallback, errorCallback) {
        var url = rule.href,
            cssHrefRelativeToDoc;

        if (isQuotedString(url)) {
            url = unquoteString(url);
        }

        cssHrefRelativeToDoc = module.util.joinUrl(options.baseUrl, url);

        if (alreadyLoadedCssUrls.indexOf(cssHrefRelativeToDoc) >= 0) {
            // Remove URL by adding empty string
            substituteRule(cssRules, rule, []);
            successCallback([]);
            return;
        } else {
            alreadyLoadedCssUrls.push(cssHrefRelativeToDoc);
        }

        module.util.ajax(url, options, function (cssText) {
            var externalCssRules = module.css.rulesForCssText(cssText);

            // Recursively follow @import statements
            module.css.loadCSSImportsForRules(externalCssRules, alreadyLoadedCssUrls, options, function (hasChanges, errors) {
                module.css.adjustPathsOfCssResources(url, externalCssRules);

                substituteRule(cssRules, rule, externalCssRules);

                successCallback(errors);
            });
        }, function () {
            errorCallback(cssHrefRelativeToDoc);
        });
    };

    module.css.loadCSSImportsForRules = function (cssRules, alreadyLoadedCssUrls, options, callback) {
        var errors = [],
            rulesToInline;

        rulesToInline = findCSSImportRules(cssRules);

        module.util.map(rulesToInline, function (rule, finish) {
            loadAndInlineCSSImport(cssRules, rule, alreadyLoadedCssUrls, options, function (moreErrors) {
                errors = errors.concat(moreErrors);

                finish(true);
            }, function (url) {
                errors.push({
                    resourceType: "stylesheet",
                    url: url,
                    msg: "Unable to load stylesheet " + url
                });

                finish(false);
            });
        }, function (changeStatus) {
            var hasChanges = changeStatus.indexOf(true) >= 0;

            callback(hasChanges, errors);
        });
    };

    /* CSS linked resource inlining */

    var sliceBackgroundDeclarations = function (backgroundDeclarationText) {
        var functionParamRegexS = "\\s*(?:\"[^\"]*\"|'[^']*'|[^\\(]+)\\s*",
            valueRegexS = "(" + "url\\(" + functionParamRegexS + "\\)" + "|" + "[^,\\s]+" + ")",
            simpleSingularBackgroundRegexS = "(?:\\s*" + valueRegexS + ")+",
            simpleBackgroundRegexS = "^\\s*(" + simpleSingularBackgroundRegexS + ")" +
                                      "(?:\\s*,\\s*(" + simpleSingularBackgroundRegexS + "))*" +
                                      "\\s*$",
            simpleSingularBackgroundRegex = new RegExp(simpleSingularBackgroundRegexS, "g"),
            outerRepeatedMatch,
            backgroundDeclarations = [],
            getValues = function (singularBackgroundDeclaration) {
                var valueRegex = new RegExp(valueRegexS, "g"),
                    backgroundValues = [],
                    repeatedMatch;

                repeatedMatch = valueRegex.exec(singularBackgroundDeclaration);
                while (repeatedMatch) {
                    backgroundValues.push(repeatedMatch[1]);
                    repeatedMatch = valueRegex.exec(singularBackgroundDeclaration);
                }
                return backgroundValues;
            };

        if (backgroundDeclarationText.match(new RegExp(simpleBackgroundRegexS))) {
            outerRepeatedMatch = simpleSingularBackgroundRegex.exec(backgroundDeclarationText);
            while (outerRepeatedMatch) {
                backgroundDeclarations.push(getValues(outerRepeatedMatch[0]));
                outerRepeatedMatch = simpleSingularBackgroundRegex.exec(backgroundDeclarationText);
            }

            return backgroundDeclarations;
        }
        return [];
    };

    var findBackgroundImageUrlInValues = function (values) {
        var i, url;

        for(i = 0; i < values.length; i++) {
            try {
                url = module.css.extractCssUrl(values[i]);
                return {
                    url: url,
                    idx: i
                };
            } catch (e) {}
        }
    };

    var joinBackgroundDeclarations = function (valuesList) {
        var backgroundDeclarations = [];
        valuesList.forEach(function (values) {
            backgroundDeclarations.push(values.join(' '));
        });
        return backgroundDeclarations.join(', ');
    };


    var loadAndInlineBackgroundImage = function (rule, options, callback) {
        var errorUrls = [],
            backgroundDeclarations,
            backgroundValue = rule.style.getPropertyValue('background-image') || rule.style.getPropertyValue('background'),
            joinedBackgroundDeclarations;

        backgroundDeclarations = sliceBackgroundDeclarations(backgroundValue);

        module.util.map(backgroundDeclarations, function (singleBackgroundValues, finish) {
            var bgUrl = findBackgroundImageUrlInValues(singleBackgroundValues);

            if (!bgUrl || module.util.isDataUri(bgUrl.url)) {
                finish(false);
                return;
            }

            module.util.getDataURIForImageURL(bgUrl.url, options, function (dataURI) {
                singleBackgroundValues[bgUrl.idx] = 'url("' + dataURI + '")';

                finish(true);
            }, function () {
                errorUrls.push(module.util.joinUrl(options.baseUrl, bgUrl.url));
                finish(false);
            });
        }, function (changedStates) {
            var changed = changedStates.indexOf(true) >= 0;

            if (changed) {
                joinedBackgroundDeclarations = joinBackgroundDeclarations(backgroundDeclarations);
                if (rule.style.getPropertyValue('background-image')) {
                    rule.style.setProperty('background-image', joinedBackgroundDeclarations);
                } else {
                    rule.style.setProperty('background', joinedBackgroundDeclarations);
                }
            }

            callback(changed, errorUrls);
        });
    };

    var iterateOverRulesAndInlineBackgroundImage = function (cssRules, options, callback) {
        var rulesToInline = findBackgroundImageRules(cssRules),
            errors = [],
            cssHasChanges;

        module.util.map(rulesToInline, function (rule, finish) {
            loadAndInlineBackgroundImage(rule, options, function (changed, errorUrls) {
                errorUrls.forEach(function (url) {
                    errors.push({
                        resourceType: "backgroundImage",
                        url: url,
                        msg: "Unable to load background-image " + url
                    });
                });
                finish(changed);
            });

        }, function (changedStates) {
            cssHasChanges = changedStates.indexOf(true) >= 0;
            callback(cssHasChanges, errors);
        });
    };

    var sliceFontFaceSrcReferences = function (fontFaceSrc) {
        var functionParamRegexS = "\\s*(?:\"[^\"]*\"|'[^']*'|[^\\(]+)\\s*",
            referenceRegexS = "(local\\(" + functionParamRegexS + "\\))" + "|" +
                              "(url\\(" + functionParamRegexS + "\\))" + "(?:\\s+(format\\(" + functionParamRegexS + "\\)))?",
            simpleFontFaceSrcRegexS = "^\\s*(" + referenceRegexS + ")" +
                                      "(?:\\s*,\\s*(" + referenceRegexS + "))*" +
                                      "\\s*$",
            referenceRegex = new RegExp(referenceRegexS, "g"),
            repeatedMatch,
            fontFaceSrcReferences = [],
            getReferences = function (match) {
                var references = [];
                match.slice(1).forEach(function (elem) {
                    if (elem) {
                        references.push(elem);
                    }
                });
                return references;
            };

        if (fontFaceSrc.match(new RegExp(simpleFontFaceSrcRegexS))) {
            repeatedMatch = referenceRegex.exec(fontFaceSrc);
            while (repeatedMatch) {
                fontFaceSrcReferences.push(getReferences(repeatedMatch));
                repeatedMatch = referenceRegex.exec(fontFaceSrc);
            }
            return fontFaceSrcReferences;
        }
        return [];
    };

    var joinFontFaceSrcReferences = function (references) {
        var fontFaceReferences = [];
        references.forEach(function (reference) {
            fontFaceReferences.push(reference.join(' '));
        });
        return fontFaceReferences.join(', ');
    };

    var loadAndInlineFontFace = function (cssRules, rule, options, successCallback) {
        var fontReferences, fontSrc, format, base64Content,
            errors = [];

        fontReferences = sliceFontFaceSrcReferences(rule.style.getPropertyValue("src"));
        module.util.map(fontReferences, function (reference, finish) {
            fontSrc = extractFontFaceSrcUrl(reference);

            if (!fontSrc || module.util.isDataUri(fontSrc.url)) {
                finish(false);
                return;
            }

            format = fontSrc.format || "woff";

            module.util.binaryAjax(fontSrc.url, options, function (content) {
                base64Content = btoa(content);
                reference[0] = 'url("data:font/' + format + ';base64,' + base64Content + '")';

                finish(true);
            }, function () {
                errors.push(module.util.joinUrl(options.baseUrl, fontSrc.url));
                finish(false);
            });
        }, function (changedStates) {
            var changed = changedStates.indexOf(true) >= 0;

            if (changed) {
                changeFontFaceRuleSrc(cssRules, rule, joinFontFaceSrcReferences(fontReferences));
            }

            successCallback(changed, errors);
        });
    };

    var iterateOverRulesAndInlineFontFace = function (cssRules, options, callback) {
        var rulesToInline = findFontFaceRules(cssRules),
            errors = [],
            cssHasChanges;

        module.util.map(rulesToInline, function (rule, finish) {
            loadAndInlineFontFace(cssRules, rule, options, function (changed, errorUrls) {
                errorUrls.forEach(function (url) {
                    errors.push({
                        resourceType: "fontFace",
                        url: url,
                        msg: "Unable to load font-face " + url
                    });
                });
                finish(changed);
            });

        }, function (changedStates) {
            cssHasChanges = changedStates.indexOf(true) >= 0;
            callback(cssHasChanges, errors);
        });
    };

    module.css.loadAndInlineCSSResourcesForRules = function (cssRules, options, callback) {
        iterateOverRulesAndInlineBackgroundImage(cssRules, options, function (bgImagesHaveChanges, bgImageErrors) {
            iterateOverRulesAndInlineFontFace(cssRules, options, function (fontsHaveChanges, fontFaceErrors) {
                var hasChanges = bgImagesHaveChanges || fontsHaveChanges;

                callback(hasChanges, bgImageErrors.concat(fontFaceErrors));
            });
        });
    };

    return module;
}(window.rasterizeHTMLInline || {}, window, window.CSSOM || {}));

window.rasterizeHTMLInline = (function (module, window, url) {
    "use strict";

    module.util = {};

    module.util.getDocumentBaseUrl = function (doc) {
        if (doc.baseURI !== 'about:blank') {
            return doc.baseURI;
        }

        return null;
    };

    module.util.clone = function (object) {
        var theClone = {},
            i;
        for (i in object) {
            if (object.hasOwnProperty(i)) {
               theClone[i] = object[i];
            }
        }
        return theClone;
    };

    module.util.cloneArray = function (nodeList) {
        return Array.prototype.slice.apply(nodeList, [0]);
    };

    module.util.joinUrl = function (baseUrl, relUrl) {
        return url.resolve(baseUrl, relUrl);
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

    module.util.ajax = function (url, options, successCallback, errorCallback) {
        var ajaxRequest = new window.XMLHttpRequest(),
            joinedUrl = module.util.joinUrl(options.baseUrl, url),
            augmentedUrl;

        augmentedUrl = getUncachableURL(joinedUrl, options.cache);

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

        try {
            ajaxRequest.open('GET', augmentedUrl, true);
            ajaxRequest.overrideMimeType(options.mimeType);
            ajaxRequest.send(null);
        } catch (err) {
            errorCallback();
        }
    };

    module.util.binaryAjax = function (url, options, successCallback, errorCallback) {
        var binaryContent = "",
            ajaxOptions = module.util.clone(options);

        ajaxOptions.mimeType = 'text/plain; charset=x-user-defined';

        module.util.ajax(url, ajaxOptions, function (content) {
            for (var i = 0; i < content.length; i++) {
                binaryContent += String.fromCharCode(content.charCodeAt(i) & 0xFF);
            }
            successCallback(binaryContent);
        }, errorCallback);
    };

    var detectMimeType = function (content) {
        var startsWith = function (string, substring) {
            return string.substring(0, substring.length) === substring;
        };

        if (startsWith(content, '<?xml') || startsWith(content, '<svg')) {
            return 'image/svg+xml';
        }
        return 'image/png';
    };

    module.util.getDataURIForImageURL = function (url, options, successCallback, errorCallback) {
        var base64Content, mimeType;

        module.util.binaryAjax(url, options, function (content) {
            base64Content = btoa(content);

            mimeType = detectMimeType(content);

            successCallback('data:' + mimeType + ';base64,' + base64Content);
        }, function () {
            errorCallback();
        });
    };

    var uniqueIdList = [];

    var constantUniqueIdFor = function (element) {
        // HACK, using a list results in O(n), but how do we hash a function?
        if (uniqueIdList.indexOf(element) < 0) {
            uniqueIdList.push(element);
        }
        return uniqueIdList.indexOf(element);
    };

    module.util.memoize = function (func, hasher, memo) {
        if (typeof memo !== "object") {
            throw new Error("cacheBucket is not an object");
        }

        return function () {
            var args = Array.prototype.slice.call(arguments),
                successCallback, errorCallback;

            if (args.length > 2 && typeof args[args.length-2] === 'function') {
                 errorCallback = args.pop();
                 successCallback = args.pop();
            } else {
                successCallback = args.pop();
            }

            var argumentHash = hasher(args),
                funcHash = constantUniqueIdFor(func),
                allArgs;

            if (memo[funcHash] && memo[funcHash][argumentHash]) {
                successCallback.apply(null, memo[funcHash][argumentHash]);
            } else {
                allArgs = args.concat(function () {
                    memo[funcHash] = memo[funcHash] || {};
                    memo[funcHash][argumentHash] = arguments;
                    successCallback.apply(null, arguments);
                });
                if (errorCallback) {
                    allArgs = allArgs.concat(errorCallback);
                }
                func.apply(null, allArgs);
            }
        };
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

    return module;
}(window.rasterizeHTMLInline || {}, window, url));

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
