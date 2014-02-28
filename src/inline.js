var inline = (function (inlineCss, inlineUtil) {
    "use strict";

    var module = {};

    var getUrlBasePath = function (url) {
        return inlineUtil.joinUrl(url, '.');
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
            return inlineUtil.memoize(func, parameterHashFunction, options.cacheBucket);
        } else {
            return func;
        }
    };

    /* Img Inlining */

    var encodeImageAsDataURI = function (image, options) {
        var url = image.attributes.src ? image.attributes.src.nodeValue : null,
            documentBase = inlineUtil.getDocumentBaseUrl(image.ownerDocument),
            ajaxOptions = inlineUtil.clone(options);

        if (!ajaxOptions.baseUrl && documentBase) {
            ajaxOptions.baseUrl = documentBase;
        }

        return inlineUtil.getDataURIForImageURL(url, ajaxOptions)
            .then(function (dataURI) {
                return dataURI;
            }, function (e) {
                throw {
                    resourceType: "image",
                    url: e.url,
                    msg: "Unable to load image " + e.url
                };
            });
    };

    var filterExternalImages = function (images) {
        return images.filter(function (image) {
            var url = image.attributes.src ? image.attributes.src.nodeValue : null;

            return url !== null && !inlineUtil.isDataUri(url);
        });
    };

    var filterInputsForImageType = function (inputs) {
        return Array.prototype.filter.call(inputs, function (input) {
            return input.type === "image";
        });
    };

    var toArray = function (arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    };

    module.loadAndInlineImages = function (doc, options) {
        var images = toArray(doc.getElementsByTagName("img")),
            imageInputs = filterInputsForImageType(doc.getElementsByTagName("input")),
            externalImages = filterExternalImages(images.concat(imageInputs));

        return inlineUtil.collectAndReportErrors(externalImages.map(function (image) {
            return encodeImageAsDataURI(image, options).then(function (dataURI) {
                image.attributes.src.nodeValue = dataURI;
            });
        }));
    };

    /* Style inlining */

    var requestExternalsForStylesheet = function (styleContent, alreadyLoadedCssUrls, options) {
        var cssRules = inlineCss.rulesForCssText(styleContent);

        return inlineCss.loadCSSImportsForRules(cssRules, alreadyLoadedCssUrls, options).then(function (cssImportResult) {
            return inlineCss.loadAndInlineCSSResourcesForRules(cssRules, options).then(function (cssResourcesResult) {
                var errors = cssImportResult.errors.concat(cssResourcesResult.errors),
                    hasChanges = cssImportResult.hasChanges || cssResourcesResult.hasChanges;

                if (hasChanges) {
                    styleContent = inlineCss.cssRulesToText(cssRules);
                }

                return {
                    hasChanges: hasChanges,
                    content: styleContent,
                    errors: errors
                };
            });
        });
    };

    var loadAndInlineCssForStyle = function (style, options, alreadyLoadedCssUrls) {
        var styleContent = style.textContent,
            processExternals = memoizeFunctionOnCaching(requestExternalsForStylesheet, options);

        return processExternals(styleContent, alreadyLoadedCssUrls, options).then(function (result) {
            if (result.hasChanges) {
                style.childNodes[0].nodeValue = result.content;
            }

            return inlineUtil.cloneArray(result.errors);
        });
    };

    var getCssStyleElements = function (doc) {
        var styles = doc.getElementsByTagName("style");

        return Array.prototype.filter.call(styles, function (style) {
            return !style.attributes.type || style.attributes.type.nodeValue === "text/css";
        });
    };

    module.loadAndInlineStyles = function (doc, options) {
        var styles = getCssStyleElements(doc),
            allErrors = [],
            alreadyLoadedCssUrls = [],
            inlineOptions;

        inlineOptions = inlineUtil.clone(options);
        inlineOptions.baseUrl = inlineOptions.baseUrl || inlineUtil.getDocumentBaseUrl(doc);

        return inlineUtil.all(styles.map(function (style) {
            return loadAndInlineCssForStyle(style, inlineOptions, alreadyLoadedCssUrls).then(function (errors) {
                allErrors = allErrors.concat(errors);
            });
        })).then(function () {
            return allErrors;
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

    var requestStylesheetAndInlineResources = function (url, options) {
        return inlineUtil.ajax(url, options)
            .then(function (content) {
                var cssRules = inlineCss.rulesForCssText(content);

                return {
                    content: content,
                    cssRules: cssRules
                };
            })
            .then(function (result) {
                var hasChangesFromPathAdjustment = inlineCss.adjustPathsOfCssResources(url, result.cssRules);

                return {
                    content: result.content,
                    cssRules: result.cssRules,
                    hasChanges: hasChangesFromPathAdjustment
                };
            })
            .then(function (result) {
                return inlineCss.loadCSSImportsForRules(result.cssRules, [], options)
                    .then(function (cssImportResult) {
                        return {
                            content: result.content,
                            cssRules: result.cssRules,
                            hasChanges: result.hasChanges || cssImportResult.hasChanges,
                            errors: cssImportResult.errors
                        };
                    });
            })
            .then(function (result) {
                return inlineCss.loadAndInlineCSSResourcesForRules(result.cssRules, options)
                    .then(function (cssResourcesResult) {
                        return {
                            content: result.content,
                            cssRules: result.cssRules,
                            hasChanges: result.hasChanges || cssResourcesResult.hasChanges,
                            errors: result.errors.concat(cssResourcesResult.errors)
                        };
                    });
            })
            .then(function (result) {
                var content = result.content;
                if (result.hasChanges) {
                    content = inlineCss.cssRulesToText(result.cssRules);
                }
                return {
                    content: content,
                    errors: result.errors
                };
            });
    };

    var loadLinkedCSS = function (link, options) {
        var cssHref = link.attributes.href.nodeValue,
            documentBaseUrl = inlineUtil.getDocumentBaseUrl(link.ownerDocument),
            ajaxOptions = inlineUtil.clone(options);

        if (!ajaxOptions.baseUrl && documentBaseUrl) {
            ajaxOptions.baseUrl = documentBaseUrl;
        }

        var processStylesheet = memoizeFunctionOnCaching(requestStylesheetAndInlineResources, options);

        return processStylesheet(cssHref, ajaxOptions).then(function (result) {
            return {
                content: result.content,
                errors: inlineUtil.cloneArray(result.errors)
            };
        });
    };

    var getCssStylesheetLinks = function (doc) {
        var links = doc.getElementsByTagName("link");

        return Array.prototype.filter.call(links, function (link) {
            return link.attributes.rel && link.attributes.rel.nodeValue === "stylesheet" &&
                (!link.attributes.type || link.attributes.type.nodeValue === "text/css");
        });
    };

    module.loadAndInlineCssLinks = function (doc, options) {
        var links = getCssStylesheetLinks(doc),
            errors = [];

        return inlineUtil.all(links.map(function (link) {
            return loadLinkedCSS(link, options).then(function(result) {
                substituteLinkWithInlineStyle(link, result.content + "\n");

                errors = errors.concat(result.errors);
            }, function (e) {
                errors.push({
                    resourceType: "stylesheet",
                    url: e.url,
                    msg: "Unable to load stylesheet " + e.url
                });
            });
        })).then(function () {
            return errors;
        });
    };

    /* Script inlining */

    var loadLinkedScript = function (script, options) {
        var src = script.attributes.src.nodeValue,
            documentBase = inlineUtil.getDocumentBaseUrl(script.ownerDocument),
            ajaxOptions = inlineUtil.clone(options);

        if (!ajaxOptions.baseUrl && documentBase) {
            ajaxOptions.baseUrl = documentBase;
        }

        return inlineUtil.ajax(src, ajaxOptions)
            .fail(function (e) {
                throw {
                    resourceType: "script",
                    url: e.url,
                    msg: "Unable to load script " + e.url
                };
            });
    };

    var escapeClosingTags = function (text) {
        // http://stackoverflow.com/questions/9246382/escaping-script-tag-inside-javascript
        return text.replace(/<\//g, '<\\/');
    };

    var substituteExternalScriptWithInline = function (scriptNode, jsCode) {
        scriptNode.attributes.removeNamedItem('src');
        scriptNode.textContent = escapeClosingTags(jsCode);
    };

    var getScripts = function (doc) {
        var scripts = doc.getElementsByTagName("script");

        return Array.prototype.filter.call(scripts, function (script) {
            return !!script.attributes.src;
        });
    };

    module.loadAndInlineScript = function (doc, options) {
        var scripts = getScripts(doc);

        return inlineUtil.collectAndReportErrors(scripts.map(function (script) {
            return loadLinkedScript(script, options).then(function (jsCode) {
                substituteExternalScriptWithInline(script, jsCode);
            });
        }));
    };

    /* Main */

    module.inlineReferences = function (doc, options) {
        var allErrors = [],
            inlineFuncs = [
                module.loadAndInlineImages,
                module.loadAndInlineStyles,
                module.loadAndInlineCssLinks];

        if (options.inlineScripts !== false) {
            inlineFuncs.push(module.loadAndInlineScript);
        }

        return inlineUtil.all(inlineFuncs.map(function (func) {
            return func(doc, options)
                .then(function (errors) {
                    allErrors = allErrors.concat(errors);
                });
        })).then(function () {
            return allErrors;
        });
    };

    return module;
}(inlineCss, inlineUtil));
