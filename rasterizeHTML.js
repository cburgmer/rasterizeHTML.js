// rasterizeHTML.js
// Distributed under the MIT License
// For source and documentation visit:
// http://www.github.com/cburgmer/rasterizeHTML.js
/*global window, CSSParser, URI*/

var rasterizeHTML = (function () {
    "use strict";

    var module = {};

    /* Utilities */

    module.util = {};

    module.util.cloneArray = function (nodeList) {
        return Array.prototype.slice.apply(nodeList, [0]);
    };

    module.util.log = function (msg) {
        if (window.console && window.console.log) {
            window.console.log(msg);
        }
    };

    module.util.joinUrl = function (baseUrl, url) {
        var theUrl = new URI(url);
        if (theUrl.is("relative") && baseUrl.indexOf("/") >= 0) {
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

    var unquoteUrl = function (quotedUrl) {
        var doubleQuoteRegex = /^"(.+)*"$/,
            singleQuoteRegex = /^'(.+)*'$/;

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

    module.util.extractCssUrl = function (cssUrl) {
        var urlRegex = /^url\(([^\)]+)\)/,
            quotedUrl;

        if (!urlRegex.test(cssUrl)) {
            throw new Error("Invalid url");
        }

        quotedUrl = urlRegex.exec(cssUrl)[1];
        return unquoteUrl(quotedUrl);
    };

    /* Inlining */

    var getDataURIForImage = function (image) {
        var canvas = window.document.createElement("canvas"),
            context = canvas.getContext("2d");

        canvas.width = image.width;
        canvas.height = image.height;

        context.drawImage(image, 0, 0);

        return canvas.toDataURL("image/png");
    };

    var getDataURIForImageURL = function (url, callback) {
        var img = new window.Image(),
            dataURI;

        img.onload = function () {
            dataURI = getDataURIForImage(img);

            callback(dataURI);
        };
        img.src = url;
    };

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

    var parseOptionalParameters = function (baseUrl, callback) {
        var parameters = {
            baseUrl: null,
            callback: null
        };

        if (typeof callback === "undefined" && typeof baseUrl === "function") {
            parameters.callback = baseUrl;
        } else {
            if (typeof baseUrl !== "undefined") {
                parameters.baseUrl = baseUrl;
            }
            if (typeof callback !== "undefined") {
                parameters.callback = callback;
            }
        }
        return parameters;
    };

    /* Img Inlining */

    var encodeImageAsDataURI = function (image, baseUrl, callback) {
        var url = image.attributes.src.nodeValue,  // Chrome 19 sets image.src to ""
            base = baseUrl || image.ownerDocument.baseURI;

        if (module.util.isDataUri(url)) {
            callback();
        }

        url = getUrlRelativeToDocumentBase(url, base);

        getDataURIForImageURL(url, function (dataURI) {
            image.attributes.src.nodeValue = dataURI;
            callback();
        });
    };

    module.loadAndInlineImages = function (doc, baseUrl, callback) {
        var params = parseOptionalParameters(baseUrl, callback),
            images = doc.getElementsByTagName("img");

        module.util.map(images, function (image, finish) {
            encodeImageAsDataURI(image, params.baseUrl, finish);
        }, function () {
            if (params.callback) {
                params.callback();
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
            declarationsToInline = findBackgroundImageDeclarations(parsedCss),
            change = false,
            i;

        for(i = 0; i < declarationsToInline.length; i++) {
            change = adjustPathOfDeclarationAndReportChange(baseUrl, declarationsToInline[i]) || change;
        }

        if (change) {
            return parsedCss.cssText();
        } else {
            return styleContent;
        }
    };

    var addInlineCSSToDocument = function (doc, styleContent) {
        var styleNode = doc.createElement("style"),
            head = doc.getElementsByTagName("head")[0];

        styleNode.type = "text/css";
        styleNode.appendChild(doc.createTextNode(styleContent));

        head.appendChild(styleNode);
    };

    var loadLinkedCSSAndRemoveNode = function (link, baseUrl, callback) {
        var cssHref = link.attributes.href.nodeValue, // Chrome 19 sets link.href to ""
            documentBaseUrl = baseUrl || link.ownerDocument.baseURI,
            cssHrefRelativeToDoc = getUrlRelativeToDocumentBase(cssHref, documentBaseUrl),
            ajaxRequest = new window.XMLHttpRequest(),
            cssContent;

        ajaxRequest.onreadystatechange = function () {
            if (ajaxRequest.readyState == 4) {
                cssContent = adjustPathsOfCssResources(cssHref, ajaxRequest.responseText);

                link.parentNode.removeChild(link);
                callback(cssContent);
            }
        };
        ajaxRequest.open('GET', cssHrefRelativeToDoc, true);
        ajaxRequest.send(null);
    };

    var mergeAndAddInlineStyle = function (doc, styles) {
        var aggregatedStyleContent = styles.join("").trim();
        if (aggregatedStyleContent) {
            addInlineCSSToDocument(doc, aggregatedStyleContent);
        }
    };

    module.loadAndInlineCSS = function (doc, baseUrl, callback) {
        var params = parseOptionalParameters(baseUrl, callback),
            links = doc.getElementsByTagName("link");

        module.util.map(links, function (link, finish) {
            if (link.attributes.rel && link.attributes.rel.nodeValue === "stylesheet" &&
                link.attributes.type && link.attributes.type.nodeValue === "text/css") {
                loadLinkedCSSAndRemoveNode(link, params.baseUrl, function(css) {
                    if (css.trim()) {
                        finish(css + "\n");
                    } else {
                        finish('');
                    }
                });
            } else {
                // We need to properly deal with non-stylesheet in this concurrent context
                finish('');
            }
        }, function (styles) {
            mergeAndAddInlineStyle(doc, styles);

            if (params.callback) {
                params.callback();
            }
        });
    };

    /* CSS linked resource inlining */

    var loadAndInlineBackgroundImage = function (cssDeclaration, baseUri, callback) {
        var url;
        try {
            url = module.util.extractCssUrl(cssDeclaration.values[0].cssText());
        } catch (e) {
            callback(false);
            return;
        }

        if (module.util.isDataUri(url)) {
            callback(false);
            return;
        }

        url = getUrlRelativeToDocumentBase(url, baseUri);

        getDataURIForImageURL(url, function (dataURI) {
            cssDeclaration.values[0].setCssText('url("' + dataURI + '")');

            callback(true);
        });
    };

    var iterateOverRulesAndInlineBackgroundImage = function (parsedCss, baseUri, callback) {
        var declarationsToInline = findBackgroundImageDeclarations(parsedCss),
            cssHasChanges;

        rasterizeHTML.util.map(declarationsToInline, function (declaration, callback) {
            loadAndInlineBackgroundImage(declaration, baseUri, callback);

        }, function (changedStates) {
            cssHasChanges = changedStates.indexOf(true) >= 0;
            callback(cssHasChanges);
        });
    };

    var workAroundWebkitBugIgnoringTheFirstRuleInCSS = function (cssContent, parsedCss) {
        // Works around bug with webkit ignoring the first rule in each style declaration when rendering the SVG to the
        // DOM. While this does not directly affect the process when rastering to canvas, this is needed for the
        // workaround found in workAroundBrowserBugForBackgroundImages();
        var hasBackgroundImageDeclarations = findBackgroundImageDeclarations(parsedCss).length > 0;

        if (hasBackgroundImageDeclarations && window.navigator.userAgent.indexOf("WebKit") >= 0) {
            return "span {}\n" + cssContent;
        } else {
            return cssContent;
        }
    };

    var loadAndInlineCSSResources = function (style, baseUrl, callback) {
        var cssContent = style.textContent,
            base = baseUrl || style.ownerDocument.baseURI,
            parsedCss = parseCss(cssContent);

        iterateOverRulesAndInlineBackgroundImage(parsedCss, base, function (hasChanges) {
            if (hasChanges) {
                // CSSParser is invasive, if no changes are needed, we leave the text as it is
                cssContent = parsedCss.cssText();
            }
            cssContent = workAroundWebkitBugIgnoringTheFirstRuleInCSS(cssContent, parsedCss);
            style.childNodes[0].nodeValue = cssContent;

            callback();
        });
    };

    module.loadAndInlineCSSReferences = function (doc, baseUrl, callback) {
        var params = parseOptionalParameters(baseUrl, callback),
            styles = doc.getElementsByTagName("style");

        module.util.map(styles, function (style, finish) {
            if (style.attributes.type && style.attributes.type.nodeValue === "text/css") {
                loadAndInlineCSSResources(style, params.baseUrl, finish);
            } else {
                // We need to properly deal with non-css in this concurrent context
                finish();
            }
        }, function () {
            if (params.callback) {
                params.callback();
            }
        });
    };

    /* Rendering */

    var needsXMLParserWorkaround = function() {
        // See https://bugs.webkit.org/show_bug.cgi?id=47768
        return window.navigator.userAgent.indexOf("WebKit") >= 0;
    };

    var serializeToXML = function (doc) {
        var xml;

        doc.documentElement.setAttribute("xmlns", doc.documentElement.namespaceURI);
        xml = (new window.XMLSerializer()).serializeToString(doc.documentElement);
        if (needsXMLParserWorkaround()) {
            if (window.HTMLtoXML) {
                return window.HTMLtoXML(xml);
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
        if (window.navigator.userAgent.indexOf("WebKit") >= 0 && window.navigator.userAgent.indexOf("Chrome") < 0) {
            return false;
        }
        if (window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder) {
            // Deprecated interface
            return true;
        } else {
            if (window.Blob) {
                // Available as constructor only in newer builds for all Browsers
                try {
                    new window.Blob('<b></b>', { "type" : "text\/xml" });
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
           BLOBBUILDER = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder,
           svg;
       if (BLOBBUILDER) {
           svg = new BLOBBUILDER();
           svg.append(data);
           return svg.getBlob(imageType);
       } else {
           return new window.Blob(data, {"type": imageType});
       }
    };

    var buildImageUrl = function (svg) {
        var DOMURL = window.URL || window.webkitURL || window;
        if (supportsBlobBuilding()) {
            return DOMURL.createObjectURL(getBlob(svg));
        } else {
            return "data:image/svg+xml;charset=utf-8," + svg;
        }
    };

    var cleanUpUrl = function (url) {
        var DOMURL = window.URL || window.webkitURL || window;
        if (supportsBlobBuilding()) {
            DOMURL.revokeObjectURL(url);
        }
    };

    var workAroundBrowserBugForBackgroundImages = function (doc, svg) {
        // Firefox and Chrome will (sometimes) not show an inlined background-image until the svg is connected to
        // the DOM it seems.
        var workaroundId = "rasterizeHTML_js_FirefoxWorkaround",
            doNotGarbageCollect;

        if (window.navigator.userAgent.indexOf("Firefox") >= 0 || window.navigator.userAgent.indexOf("Chrome") >= 0) {
            doNotGarbageCollect = doc.getElementById(workaroundId);
            if (doNotGarbageCollect) {
                doNotGarbageCollect.parentNode.removeChild(doNotGarbageCollect);
            }
            doNotGarbageCollect = doc.createElement("div");
            doNotGarbageCollect.innerHTML = svg;
            doNotGarbageCollect.style.visibility = "hidden";
            doNotGarbageCollect.style.width = "0px";
            doNotGarbageCollect.style.height = "0px";
            doNotGarbageCollect.id = workaroundId;
            doc.getElementsByTagName("body")[0].appendChild(doNotGarbageCollect);
        }
    };

    module.getSvgForDocument = function (doc, width, height) {
        var html = serializeToXML(doc),
            imgWidth = width || 100,
            imgHeight = height || 100;

        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + imgWidth + '" height="' + imgHeight + '">' +
                '<foreignObject width="100%" height="100%">' +
                    html +
                '</foreignObject>' +
            '</svg>'
        );
    };

    module.drawSvgToCanvas = function (svg, canvas, callback) {
        var context, DOMURL, url, image;

        context = canvas.getContext("2d");

        url = buildImageUrl(svg);

        image = new window.Image();
        image.onload = function() {
            context.drawImage(image, 0, 0);
            cleanUpUrl(url);

            if (typeof callback !== "undefined") {
                callback(canvas);
            }
        };
        image.src = url;

        workAroundBrowserBugForBackgroundImages(canvas.ownerDocument, svg);
    };

    /* "Public" API */

    module.drawDocument = function (doc, canvas, callback) {
        var svg;

        module.loadAndInlineImages(doc, function () {
            module.loadAndInlineCSS(doc, function () {
                module.loadAndInlineCSSReferences(doc, function () {
                    svg = module.getSvgForDocument(doc, canvas.width, canvas.height);

                    module.drawSvgToCanvas(svg, canvas, callback);
                });
            });
        });

    };

    return module;
}());
