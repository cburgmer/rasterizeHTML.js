window.rasterizeHTMLInline = (function (module, window, URI, CSSOM) {
    "use strict";

    /* Inlining */

    var getUrlRelativeToDocumentBase = function (url, baseUrl) {
        if (baseUrl && baseUrl !== "about:blank") {
            url = module.util.joinUrl(baseUrl, url);
        }

        return url;
    };

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

    var rulesForCssText = function (styleContent) {
        if (CSSOM.parse && window.navigator.userAgent.indexOf("Chrome") >= 0) {
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

    var cssRulesToText = function (cssRules) {
        var cssText = "";

        cssRules.forEach(function (rule) {
            cssText += rule.cssText;
        });
        return cssText;
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

    /* CSS inlining */

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

    module.adjustPathsOfCssResources = function (baseUrl, cssRules) {
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
                var fontSrc = module.util.extractFontFaceSrcUrl(reference),
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
            cssHrefRelativeToDoc = getUrlRelativeToDocumentBase(cssHref, documentBaseUrl);

        module.util.ajax(cssHrefRelativeToDoc, {
            cache: cache
        }, function (content) {
            var cssRules = rulesForCssText(content),
                changedFromPathAdjustment;

            changedFromPathAdjustment = module.adjustPathsOfCssResources(cssHref, cssRules);
            module.loadCSSImportsForRules(cssRules, documentBaseUrl, cache, [], function (changedFromImports, importErrors) {
                module.loadAndInlineCSSResourcesForRules(cssRules, documentBaseUrl, cache, function (changedFromResources, resourceErrors) {
                    var errors = importErrors.concat(resourceErrors);

                    if (changedFromPathAdjustment || changedFromImports || changedFromResources) {
                        content = cssRulesToText(cssRules);
                    }

                    content = module.workAroundWebkitBugIgnoringTheFirstRuleInCSS(content, cssRules);

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

    var loadAndInlineCSSImport = function (cssRules, rule, documentBaseUrl, cache, alreadyLoadedCssUrls, successCallback, errorCallback) {
        var url = rule.href,
            cssHrefRelativeToDoc;

        if (isQuotedString(url)) {
            url = module.util.unquoteString(url);
        }

        cssHrefRelativeToDoc = getUrlRelativeToDocumentBase(url, documentBaseUrl);

        if (alreadyLoadedCssUrls.indexOf(cssHrefRelativeToDoc) >= 0) {
            // Remove URL by adding empty string
            substituteRule(cssRules, rule, []);
            successCallback([]);
            return;
        } else {
            alreadyLoadedCssUrls.push(cssHrefRelativeToDoc);
        }

        module.util.ajax(cssHrefRelativeToDoc, {cache: cache}, function (cssText) {
            var externalCssRules = rulesForCssText(cssText);

            // Recursively follow @import statements
            module.loadCSSImportsForRules(externalCssRules, documentBaseUrl, cache, alreadyLoadedCssUrls, function (hasChanges, errors) {
                module.adjustPathsOfCssResources(url, externalCssRules);

                substituteRule(cssRules, rule, externalCssRules);

                successCallback(errors);
            });
        }, function () {
            errorCallback(cssHrefRelativeToDoc);
        });
    };

    module.loadCSSImportsForRules = function (cssRules, baseUrl, cache, alreadyLoadedCssUrls, callback) {
        var errors = [],
            rulesToInline;

        rulesToInline = findCSSImportRules(cssRules);

        module.util.map(rulesToInline, function (rule, finish) {
            loadAndInlineCSSImport(cssRules, rule, baseUrl, cache, alreadyLoadedCssUrls, function (moreErrors) {
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

    var loadAndInlineCssForStyle = function (style, baseUrl, cache, alreadyLoadedCssUrls, callback) {
        var cssRules = rulesForCssText(style.textContent);

        module.loadCSSImportsForRules(cssRules, baseUrl, cache, alreadyLoadedCssUrls, function (changedFromImports, importErrors) {
            module.loadAndInlineCSSResourcesForRules(cssRules, baseUrl, cache, function (changedFromResources, resourceErrors) {
                var errors = importErrors.concat(resourceErrors),
                    content;

                if (changedFromImports || changedFromResources) {
                    content = cssRulesToText(cssRules);
                } else {
                    content = style.textContent;
                }

                content = module.workAroundWebkitBugIgnoringTheFirstRuleInCSS(content, cssRules);

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
                url = module.util.extractCssUrl(values[i]);
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


    var loadAndInlineBackgroundImage = function (rule, baseUri, cache, callback) {
        var errorUrls = [],
            backgroundDeclarations,
            backgroundValue = rule.style.getPropertyValue('background-image') || rule.style.getPropertyValue('background'),
            joinedBackgroundDeclarations;

        backgroundDeclarations = sliceBackgroundDeclarations(backgroundValue);

        module.util.map(backgroundDeclarations, function (singleBackgroundValues, finish) {
            var bgUrl = findBackgroundImageUrlInValues(singleBackgroundValues),
                url;

            if (!bgUrl || module.util.isDataUri(bgUrl.url)) {
                finish(false);
                return;
            }

            url = getUrlRelativeToDocumentBase(bgUrl.url, baseUri);

            module.util.getDataURIForImageURL(url, {
                cache: cache
            }, function (dataURI) {
                singleBackgroundValues[bgUrl.idx] = 'url("' + dataURI + '")';

                finish(true);
            }, function () {
                errorUrls.push(url);
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

    var iterateOverRulesAndInlineBackgroundImage = function (cssRules, baseUri, cache, callback) {
        var rulesToInline = findBackgroundImageRules(cssRules),
            errors = [],
            cssHasChanges;

        module.util.map(rulesToInline, function (rule, finish) {
            loadAndInlineBackgroundImage(rule, baseUri, cache, function (changed, errorUrls) {
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

    var loadAndInlineFontFace = function (cssRules, rule, baseUri, cache, successCallback) {
        var fontReferences, fontSrc, url, format, base64Content,
            errors = [];

        fontReferences = sliceFontFaceSrcReferences(rule.style.getPropertyValue("src"));
        module.util.map(fontReferences, function (reference, finish) {
            fontSrc = module.util.extractFontFaceSrcUrl(reference);

            if (!fontSrc || module.util.isDataUri(fontSrc.url)) {
                finish(false);
                return;
            }

            url = getUrlRelativeToDocumentBase(fontSrc.url, baseUri);
            format = fontSrc.format || "woff";

            module.util.binaryAjax(url, {
                cache: cache
            }, function (content) {
                base64Content = btoa(content);
                reference[0] = 'url("data:font/' + format + ';base64,' + base64Content + '")';

                finish(true);
            }, function () {
                errors.push(url);
                finish(false);
            });
        }, function (changedStates) {
            var changed = changedStates.indexOf(true) >= 0;

            if (changed) {
                changeFontFaceRuleSrc(cssRules, rule, joinFontFaceSrcReferences(fontReferences));
            }

            // TODO handle errors
            successCallback(changed, errors);
        });
    };

    var iterateOverRulesAndInlineFontFace = function (cssRules, baseUri, cache, callback) {
        var rulesToInline = findFontFaceRules(cssRules),
            errors = [],
            cssHasChanges;

        module.util.map(rulesToInline, function (rule, finish) {
            loadAndInlineFontFace(cssRules, rule, baseUri, cache, function (changed, errorUrls) {
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

    module.workAroundWebkitBugIgnoringTheFirstRuleInCSS = function (cssContent, cssRules) {
        // Works around bug with webkit ignoring the first rule in each style declaration when rendering the SVG to the
        // DOM. While this does not directly affect the process when rastering to canvas, this is needed for the
        // workaround found in workAroundBrowserBugForBackgroundImages();
        var hasResourceDeclarations = (findBackgroundImageRules(cssRules).length +
                findFontFaceRules(cssRules).length) > 0;

        if (hasResourceDeclarations && window.navigator.userAgent.indexOf("WebKit") >= 0) {
            return "span {}\n" + cssContent;
        } else {
            return cssContent;
        }
    };

    module.loadAndInlineCSSResourcesForRules = function (cssRules, baseUrl, cache, callback) {
        iterateOverRulesAndInlineBackgroundImage(cssRules, baseUrl, cache, function (bgImagesHaveChanges, bgImageErrors) {
            iterateOverRulesAndInlineFontFace(cssRules, baseUrl, cache, function (fontsHaveChanges, fontFaceErrors) {
                var hasChanges = bgImagesHaveChanges || fontsHaveChanges;

                callback(hasChanges, bgImageErrors.concat(fontFaceErrors));
            });
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

        // TODO introduce parseOptionalParameters
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
}(window.rasterizeHTMLInline || {}, window, URI, window.CSSOM || {}));
