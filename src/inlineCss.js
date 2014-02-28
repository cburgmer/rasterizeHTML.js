window.rasterizeHTMLInline = (function (module, window, cssom, ayepromise) {
    "use strict";

    module.css = {};

    var updateCssPropertyValue = function (rule, property, value) {
        rule.style.setProperty(property, value, rule.style.getPropertyPriority(property));
    };

    var rulesForCssTextFromBrowser = function (styleContent) {
        var doc = document.implementation.createHTMLDocument(""),
            styleElement = document.createElement("style"),
            rules;

        styleElement.textContent = styleContent;
        // the style will only be parsed once it is added to a document
        doc.body.appendChild(styleElement);
        rules = styleElement.sheet.cssRules;

        return Array.prototype.slice.call(rules);
    };

    var browserHasBackgroundImageUrlIssue = (function () {
        // Checks for http://code.google.com/p/chromium/issues/detail?id=161644
        var rules = rulesForCssTextFromBrowser('a{background:url(i)}');
        return !rules.length || rules[0].cssText.indexOf('url()') >= 0;
    }());

    module.css.rulesForCssText = function (styleContent) {
        if (browserHasBackgroundImageUrlIssue && cssom.parse) {
            return cssom.parse(styleContent).cssRules;
        } else {
            return rulesForCssTextFromBrowser(styleContent);
        }
    };

    var findBackgroundImageRules = function (cssRules) {
        return cssRules.filter(function (rule) {
            return rule.type === window.CSSRule.STYLE_RULE && (rule.style.getPropertyValue('background-image') || rule.style.getPropertyValue('background'));
        });
    };

    var findBackgroundDeclarations = function (rules) {
        var backgroundDeclarations = [];

        rules.forEach(function (rule) {
            if (rule.style.getPropertyValue('background-image')) {
                backgroundDeclarations.push({
                    property: 'background-image',
                    value: rule.style.getPropertyValue('background-image'),
                    rule: rule
                });
            } else if (rule.style.getPropertyValue('background')) {
                backgroundDeclarations.push({
                    property: 'background',
                    value: rule.style.getPropertyValue('background'),
                    rule: rule
                });
            }
        });

        return backgroundDeclarations;
    };

    var findFontFaceRules = function (cssRules) {
        return cssRules.filter(function (rule) {
            return rule.type === window.CSSRule.FONT_FACE_RULE && rule.style.getPropertyValue("src");
        });
    };

    module.css.cssRulesToText = function (cssRules) {
        return cssRules.reduce(function (cssText, rule) {
            return cssText + rule.cssText;
        }, '');
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
        var newRuleText = '@font-face { font-family: ' + rule.style.getPropertyValue("font-family") + '; ';

        if (rule.style.getPropertyValue("font-style")) {
            newRuleText += 'font-style: ' + rule.style.getPropertyValue("font-style") + '; ';
        }

        if (rule.style.getPropertyValue("font-weight")) {
            newRuleText += 'font-weight: ' + rule.style.getPropertyValue("font-weight") + '; ';
        }

        newRuleText += 'src: ' + newSrc + '}';
        exchangeRule(cssRules, rule, newRuleText);
    };

    var exchangeRule = function (cssRules, rule, newRuleText) {
        var ruleIdx = cssRules.indexOf(rule),
            styleSheet = rule.parentStyleSheet;

        // Generate a new rule
        styleSheet.insertRule(newRuleText, ruleIdx+1);
        styleSheet.deleteRule(ruleIdx);
        // Exchange with the new
        cssRules[ruleIdx] = styleSheet.cssRules[ruleIdx];
    };

    module.css.adjustPathsOfCssResources = function (baseUrl, cssRules) {
        var backgroundRules = findBackgroundImageRules(cssRules),
            backgroundDeclarations = findBackgroundDeclarations(backgroundRules),
            change = false;

        backgroundDeclarations.forEach(function (declaration) {
            var parsedBackground = parseBackgroundDeclaration(declaration.value),
                externalBackgroundIndices = findExternalBackgroundUrls(parsedBackground),
                backgroundValue;

            if (externalBackgroundIndices.length > 0) {
                externalBackgroundIndices.forEach(function (backgroundLayerIndex) {
                    var relativeUrl = parsedBackground[backgroundLayerIndex].url,
                        url = module.util.joinUrl(baseUrl, relativeUrl);
                    parsedBackground[backgroundLayerIndex].url = url;
                });

                backgroundValue = parsedBackgroundDeclarationToText(parsedBackground);

                updateCssPropertyValue(declaration.rule, declaration.property, backgroundValue);

                change = true;
            }
        });
        findFontFaceRules(cssRules).forEach(function (rule) {
            var fontFaceSrcDeclaration = rule.style.getPropertyValue("src"),
                parsedFontFaceSources = parseFontFaceSrcDeclaration(fontFaceSrcDeclaration),
                externalFontFaceUrlIndices = findExternalFontFaceUrls(parsedFontFaceSources);

            if (externalFontFaceUrlIndices.length > 0) {
                externalFontFaceUrlIndices.forEach(function (fontFaceUrlIndex) {
                    var relativeUrl = parsedFontFaceSources[fontFaceUrlIndex].url,
                        url = module.util.joinUrl(baseUrl, relativeUrl);

                    parsedFontFaceSources[fontFaceUrlIndex].url = url;
                });

                changeFontFaceRuleSrc(cssRules, rule, parsedFontFaceSrcDeclarationToText(parsedFontFaceSources));

                change = true;
            }
        });
        findCSSImportRules(cssRules).forEach(function (rule) {
            var cssUrl = rule.href,
                url = module.util.joinUrl(baseUrl, cssUrl);

            exchangeRule(cssRules, rule, "@import url(" + url + ");");

            change = true;
        });

        return change;
    };

    /* CSS import inlining */

    var findCSSImportRules = function (cssRules) {
        return cssRules.filter(function (rule) {
            return rule.type === window.CSSRule.IMPORT_RULE && rule.href;
        });
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

    var fulfilledPromise = function (value) {
        var defer = ayepromise.defer();
        defer.resolve(value);
        return defer.promise;
    };

    var loadAndInlineCSSImport = function (cssRules, rule, alreadyLoadedCssUrls, options) {
        var url = rule.href,
            cssHrefRelativeToDoc;

        if (isQuotedString(url)) {
            url = unquoteString(url);
        }

        cssHrefRelativeToDoc = module.util.joinUrl(options.baseUrl, url);

        if (alreadyLoadedCssUrls.indexOf(cssHrefRelativeToDoc) >= 0) {
            // Remove URL by adding empty string
            substituteRule(cssRules, rule, []);
            return fulfilledPromise([]);
        } else {
            alreadyLoadedCssUrls.push(cssHrefRelativeToDoc);
        }

        return module.util.ajax(url, options)
            .then(function (cssText) {
                var externalCssRules = module.css.rulesForCssText(cssText);

                // Recursively follow @import statements
                return module.css.loadCSSImportsForRules(externalCssRules, alreadyLoadedCssUrls, options)
                    .then(function (result) {
                        module.css.adjustPathsOfCssResources(url, externalCssRules);

                        substituteRule(cssRules, rule, externalCssRules);

                        return result.errors;
                    });
            }, function (e) {
                throw {
                    resourceType: "stylesheet",
                    url: e.url,
                    msg: "Unable to load stylesheet " + e.url
                };
            });
    };

    module.css.loadCSSImportsForRules = function (cssRules, alreadyLoadedCssUrls, options) {
        var rulesToInline = findCSSImportRules(cssRules),
            errors = [],
            hasChanges = false;

        return module.util.all(rulesToInline.map(function (rule) {
            return loadAndInlineCSSImport(cssRules, rule, alreadyLoadedCssUrls, options).then(function (moreErrors) {
                errors = errors.concat(moreErrors);

                hasChanges = true;
            }, function (e) {
                errors.push(e);
            });
        })).then(function () {
            return {
                hasChanges: hasChanges,
                errors: errors
            };
        });
    };

    /* CSS linked resource inlining */

    var sliceBackgroundDeclaration = function (backgroundDeclarationText) {
        var functionParamRegexS = "\\s*(?:\"[^\"]*\"|'[^']*'|[^\\(]+)\\s*",
            valueRegexS = "(" + "url\\(" + functionParamRegexS + "\\)" + "|" + "[^,\\s]+" + ")",
            simpleSingularBackgroundRegexS = "(?:\\s*" + valueRegexS + ")+",
            simpleBackgroundRegexS = "^\\s*(" + simpleSingularBackgroundRegexS + ")" +
                                      "(?:\\s*,\\s*(" + simpleSingularBackgroundRegexS + "))*" +
                                      "\\s*$",
            simpleSingularBackgroundRegex = new RegExp(simpleSingularBackgroundRegexS, "g"),
            outerRepeatedMatch,
            backgroundLayers = [],
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
                backgroundLayers.push(getValues(outerRepeatedMatch[0]));
                outerRepeatedMatch = simpleSingularBackgroundRegex.exec(backgroundDeclarationText);
            }

            return backgroundLayers;
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

    var parseBackgroundDeclaration = function (backgroundValue) {
        var backgroundLayers = sliceBackgroundDeclaration(backgroundValue);

        return backgroundLayers.map(function (backgroundLayerValues) {
            var urlMatch = findBackgroundImageUrlInValues(backgroundLayerValues);

            if (urlMatch) {
                return {
                    preUrl: backgroundLayerValues.slice(0, urlMatch.idx),
                    url: urlMatch.url,
                    postUrl: backgroundLayerValues.slice(urlMatch.idx+1),
                };
            } else {
                return {
                    preUrl: backgroundLayerValues
                };
            }
        });
    };

    var findExternalBackgroundUrls = function (parsedBackground) {
        var matchIndices = [];

        parsedBackground.forEach(function (backgroundLayer, i) {
            if (backgroundLayer.url && !module.util.isDataUri(backgroundLayer.url)) {
                matchIndices.push(i);
            }
        });

        return matchIndices;
    };

    var parsedBackgroundDeclarationToText = function (parsedBackground) {
        var backgroundLayers = parsedBackground.map(function (backgroundLayer) {
            var values = [].concat(backgroundLayer.preUrl);

            if (backgroundLayer.url) {
                values.push('url("' + backgroundLayer.url + '")');
            }
            if (backgroundLayer.postUrl) {
                values = values.concat(backgroundLayer.postUrl);
            }

            return values.join(' ');
        });

        return backgroundLayers.join(', ');
    };

    var loadAndInlineBackgroundImages = function (backgroundValue, options) {
        var parsedBackground = parseBackgroundDeclaration(backgroundValue),
            externalBackgroundLayerIndices = findExternalBackgroundUrls(parsedBackground),
            hasChanges = false;

        return module.util.collectAndReportErrors(externalBackgroundLayerIndices.map(function (backgroundLayerIndex) {
            var url = parsedBackground[backgroundLayerIndex].url;

            return module.util.getDataURIForImageURL(url, options)
                .then(function (dataURI) {
                    parsedBackground[backgroundLayerIndex].url = dataURI;

                    hasChanges = true;
                }, function (e) {
                    throw {
                        resourceType: "backgroundImage",
                        url: e.url,
                        msg: "Unable to load background-image " + e.url
                    };
                });
        })).then(function (errors) {
            return {
                backgroundValue: parsedBackgroundDeclarationToText(parsedBackground),
                hasChanges: hasChanges,
                errors: errors
            };
        });
    };

    var iterateOverRulesAndInlineBackgroundImages = function (cssRules, options) {
        var rulesToInline = findBackgroundImageRules(cssRules),
            backgroundDeclarations = findBackgroundDeclarations(rulesToInline),
            errors = [],
            cssHasChanges = false;

        return module.util.all(backgroundDeclarations.map(function (declaration) {
            return loadAndInlineBackgroundImages(declaration.value, options)
                .then(function (result) {
                    if (result.hasChanges) {
                        updateCssPropertyValue(declaration.rule, declaration.property, result.backgroundValue);

                        cssHasChanges = true;
                    }

                    errors = errors.concat(result.errors);
                });
        })).then(function () {
            return {
                hasChanges: cssHasChanges,
                errors: errors
            };
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
        // we should probably throw an exception here
        return [];
    };

    var parseFontFaceSrcDeclaration = function (fontFaceSourceValue) {
        var fontReferences = sliceFontFaceSrcReferences(fontFaceSourceValue);

        return fontReferences.map(function (reference) {
            var fontSrc = extractFontFaceSrcUrl(reference);

            if (fontSrc) {
                return fontSrc;
            } else {
                return {
                    local: reference
                };
            }
        });
    };

    var findExternalFontFaceUrls = function (parsedFontFaceSources) {
        var sourceIndices = [];
        parsedFontFaceSources.forEach(function (sourceItem, i) {
            if (sourceItem.url && !module.util.isDataUri(sourceItem.url)) {
                sourceIndices.push(i);
            }
        });
        return sourceIndices;
    };

    var parsedFontFaceSrcDeclarationToText = function (parsedFontFaceSources) {
        return parsedFontFaceSources.map(function (sourceItem) {
            var itemValue;

            if (sourceItem.url) {
                itemValue = 'url("' + sourceItem.url + '")';
                if (sourceItem.format) {
                    itemValue += ' format("' + sourceItem.format + '")';
                }
            } else {
                itemValue = sourceItem.local;
            }
            return itemValue;
        }).join(', ');
    };

    var loadAndInlineFontFace = function (srcDeclarationValue, options) {
        var parsedFontFaceSources = parseFontFaceSrcDeclaration(srcDeclarationValue),
            externalFontFaceUrlIndices = findExternalFontFaceUrls(parsedFontFaceSources),
            hasChanges = false;

        return module.util.collectAndReportErrors(externalFontFaceUrlIndices.map(function (urlIndex) {
            var fontSrc = parsedFontFaceSources[urlIndex],
                format = fontSrc.format || "woff";

            return module.util.binaryAjax(fontSrc.url, options)
                .then(function (content) {
                    var base64Content = btoa(content);
                    fontSrc.url = 'data:font/' + format + ';base64,' + base64Content;

                    hasChanges = true;
                }, function (e) {
                    throw {
                        resourceType: "fontFace",
                        url: e.url,
                        msg: "Unable to load font-face " + e.url
                    };
                });
        })).then(function (errors) {
            return {
                srcDeclarationValue: parsedFontFaceSrcDeclarationToText(parsedFontFaceSources),
                hasChanges: hasChanges,
                errors: errors
            };
        });
    };

    var iterateOverRulesAndInlineFontFace = function (cssRules, options) {
        var rulesToInline = findFontFaceRules(cssRules),
            errors = [],
            hasChanges = false;

        return module.util.all(rulesToInline.map(function (rule) {
            var srcDeclarationValue = rule.style.getPropertyValue("src");

            return loadAndInlineFontFace(srcDeclarationValue, options).then(function (result) {
                if (result.hasChanges) {
                    changeFontFaceRuleSrc(cssRules, rule, result.srcDeclarationValue);

                    hasChanges = true;
                }

                errors = errors.concat(result.errors);
            });
        })).then(function () {
            return {
                hasChanges: hasChanges,
                errors: errors
            };
        });
    };

    module.css.loadAndInlineCSSResourcesForRules = function (cssRules, options) {
        var hasChanges = false,
            errors = [];

        return module.util.all([iterateOverRulesAndInlineBackgroundImages, iterateOverRulesAndInlineFontFace].map(function (func) {
            return func(cssRules, options)
                .then(function (result) {
                    hasChanges = hasChanges || result.hasChanges;
                    errors = errors.concat(result.errors);
                });
        })).then(function () {
            return {
                hasChanges: hasChanges,
                errors: errors
            };
        });
    };

    return module;
}(window.rasterizeHTMLInline || {}, window, window.cssom || {}, ayepromise));
