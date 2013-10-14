window.rasterizeHTMLInline = (function (module) {
    "use strict";

    /* Img Inlining */

    var encodeImageAsDataURI = function (image, options, successCallback, errorCallback) {
        var url = image.attributes.src.nodeValue,
            base = options.baseUrl || image.ownerDocument.baseURI,
            ajaxOptions;

        if (module.util.isDataUri(url)) {
            successCallback();
            return;
        }

        ajaxOptions = module.util.selectOptions(options, ['cache', 'cacheRepeated']);

        url = module.util.getUrlRelativeToDocumentBase(url, base);

        module.util.getDataURIForImageURL(url, ajaxOptions, function (dataURI) {
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

    var loadAndInlineCssForStyle = function (style, options, alreadyLoadedCssUrls, callback) {
        var cssRules = module.css.rulesForCssText(style.textContent);

        module.css.loadCSSImportsForRules(cssRules, alreadyLoadedCssUrls, options, function (changedFromImports, importErrors) {
            module.css.loadAndInlineCSSResourcesForRules(cssRules, options, function (changedFromResources, resourceErrors) {
                var errors = importErrors.concat(resourceErrors);

                if (changedFromImports || changedFromResources) {
                    style.childNodes[0].nodeValue = module.css.cssRulesToText(cssRules);
                }

                callback(errors);
            });
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
        inlineOptions.baseUrl = inlineOptions.baseUrl || doc.baseURI;

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

    var loadLinkedCSS = function (link, options, successCallback, errorCallback) {
        var cssHref = link.attributes.href.nodeValue,
            documentBaseUrl = options.baseUrl || link.ownerDocument.baseURI,
            cssHrefRelativeToDoc = module.util.getUrlRelativeToDocumentBase(cssHref, documentBaseUrl),
            inlineOptions, ajaxOptions;

        inlineOptions = module.util.clone(options);
        inlineOptions.baseUrl = documentBaseUrl;

        ajaxOptions = module.util.selectOptions(options, ['cache', 'cacheRepeated']);

        module.util.ajax(cssHrefRelativeToDoc, ajaxOptions, function (content) {
            var cssRules = module.css.rulesForCssText(content),
                changedFromPathAdjustment;

            changedFromPathAdjustment = module.css.adjustPathsOfCssResources(cssHref, cssRules);
            module.css.loadCSSImportsForRules(cssRules, [], inlineOptions, function (changedFromImports, importErrors) {
                module.css.loadAndInlineCSSResourcesForRules(cssRules, inlineOptions, function (changedFromResources, resourceErrors) {
                    var errors = importErrors.concat(resourceErrors);

                    if (changedFromPathAdjustment || changedFromImports || changedFromResources) {
                        content = module.css.cssRulesToText(cssRules);
                    }

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
        var base = options.baseUrl || script.ownerDocument.baseURI,
            scriptSrcRelativeToDoc = module.util.getUrlRelativeToDocumentBase(script.attributes.src.nodeValue, base),
            ajaxOptions;

        ajaxOptions = module.util.selectOptions(options, ['cache', 'cacheRepeated']);

        module.util.ajax(scriptSrcRelativeToDoc, ajaxOptions, successCallback, function () {
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
