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

    var encodeImageAsDataURI = function (image, options) {
        var url = image.attributes.src ? image.attributes.src.nodeValue : null,
            documentBase = module.util.getDocumentBaseUrl(image.ownerDocument),
            ajaxOptions = module.util.clone(options);

        if (!ajaxOptions.baseUrl && documentBase) {
            ajaxOptions.baseUrl = documentBase;
        }

        return module.util.getDataURIForImageURL(url, ajaxOptions)
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

            return url !== null && !module.util.isDataUri(url);
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

        return module.util.collectAndReportErrors(externalImages.map(function (image) {
            return encodeImageAsDataURI(image, options).then(function (dataURI) {
                image.attributes.src.nodeValue = dataURI;
            });
        }));
    };

    /* Style inlining */

    var requestExternalsForStylesheet = function (styleContent, alreadyLoadedCssUrls, options, callback) {
        var cssRules = module.css.rulesForCssText(styleContent);

        module.css.loadCSSImportsForRules(cssRules, alreadyLoadedCssUrls, options).then(function (cssImportResult) {
            module.css.loadAndInlineCSSResourcesForRules(cssRules, options).then(function (cssResourcesResult) {
                var errors = cssImportResult.errors.concat(cssResourcesResult.errors),
                    hasChanges = cssImportResult.hasChanges || cssResourcesResult.hasChanges;

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

    var getCssStyleElements = function (doc) {
        var styles = doc.getElementsByTagName("style");

        return Array.prototype.filter.call(styles, function (style) {
            return !style.attributes.type || style.attributes.type.nodeValue === "text/css";
        });
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
        module.util.ajax(url, options)
            .then(function (content) {
                var cssRules = module.css.rulesForCssText(content),
                    changedFromPathAdjustment;

                changedFromPathAdjustment = module.css.adjustPathsOfCssResources(url, cssRules);
                module.css.loadCSSImportsForRules(cssRules, [], options).then(function (cssImportResult) {
                    module.css.loadAndInlineCSSResourcesForRules(cssRules, options).then(function (cssResourcesResult) {
                        var errors = cssImportResult.errors.concat(cssResourcesResult.errors);

                        if (changedFromPathAdjustment || cssImportResult.hasChanges || cssResourcesResult.hasChanges) {
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

    var getCssStylesheetLinks = function (doc) {
        var links = doc.getElementsByTagName("link");

        return Array.prototype.filter.call(links, function (link) {
            return link.attributes.rel && link.attributes.rel.nodeValue === "stylesheet" &&
                (!link.attributes.type || link.attributes.type.nodeValue === "text/css");
        });
    };

    module.loadAndInlineCssLinks = function (doc, options, callback) {
        var params = module.util.parseOptionalParameters(options, callback),
            links = getCssStylesheetLinks(doc),
            errors = [];

        module.util.map(links, function (link, finish) {
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
        }, function () {
            if (params.callback) {
                params.callback(errors);
            }
        });
    };

    /* Script inlining */

    var loadLinkedScript = function (script, options) {
        var src = script.attributes.src.nodeValue,
            documentBase = module.util.getDocumentBaseUrl(script.ownerDocument),
            ajaxOptions = module.util.clone(options);

        if (!ajaxOptions.baseUrl && documentBase) {
            ajaxOptions.baseUrl = documentBase;
        }

        return module.util.ajax(src, ajaxOptions)
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

        return module.util.collectAndReportErrors(scripts.map(function (script) {
            return loadLinkedScript(script, options).then(function (jsCode) {
                substituteExternalScriptWithInline(script, jsCode);
            });
        }));
    };

    /* Main */

    module.inlineReferences = function (doc, options, callback) {
        var allErrors = [];

        module.loadAndInlineImages(doc, options).then(function (errors) {
            allErrors = allErrors.concat(errors);
            module.loadAndInlineStyles(doc, options, function (errors) {
                allErrors = allErrors.concat(errors);
                module.loadAndInlineCssLinks(doc, options, function (errors) {
                    allErrors = allErrors.concat(errors);

                    if (options.inlineScripts === false) {
                        callback(allErrors);
                    } else {
                        module.loadAndInlineScript(doc, options).then(function (errors) {
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
