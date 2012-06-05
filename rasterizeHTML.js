// rasterizeHTML.js
// Distributed under the MIT License
// For source and documentation visit:
// http://www.github.com/cburgmer/rasterizeHTML.js
/*global window, CSSParser*/

var rasterizeHTML = (function () {
    "use strict";

    var module = {};

    /* Inlining */

    var isDataUrl = function (url) {
        return (/^data:/).test(url);
    };

    var getDataURIForImage = function (image) {
        var canvas = window.document.createElement("canvas"),
            context = canvas.getContext("2d");

        canvas.width = image.width;
        canvas.height = image.height;

        context.drawImage(image, 0, 0);

        return canvas.toDataURL("image/png");
    };

    var getDataURIForImageURL = function (url, finishHandler) {
        var img = new window.Image(),
            dataURI;

        img.onload = function () {
            dataURI = getDataURIForImage(img);

            finishHandler(dataURI);
        };
        img.src = url;
    };

    /* Img Inlining */

    var encodeImageAsDataURI = function (image, finishHandler) {
        var url = image.attributes.src.nodeValue; // Chrome 19 sets image.src to "";

        if (isDataUrl(url)) {
            finishHandler();
        }

        getDataURIForImageURL(url, function (dataURI) {
            image.src = dataURI;
            finishHandler();
        });
    };

    module.loadAndInlineImages = function (doc, finishHandler) {
        var images = doc.getElementsByTagName("img"),
            imagesToFinalize = images.length,
            i;

        var finishWorker = function () {
            imagesToFinalize--;

            if (finishHandler && imagesToFinalize === 0) {
                finishHandler();
            }
        };

        if (images.length === 0) {
            finishHandler();
            return;
        }

        for(i = 0; i < images.length; i++) {
            encodeImageAsDataURI(images[i], finishWorker);
        }
    };

    /* CSS inlining */

    var addInlineCSSToDocument = function (doc, styleContent) {
        var styleNode = doc.createElement("style");

        styleNode.type = "text/css";
        styleNode.appendChild(doc.createTextNode(styleContent));

        doc.head.appendChild(styleNode);
    };

    var loadLinkedCSSAndRemoveNode = function (link, finishHandler) {
        var href = link.attributes.href.nodeValue; // Chrome 19 sets link.href to ""

        window.jQuery.ajax({
            dataType: 'text',
            url: href,
            success: function(data) {
                link.parentNode.removeChild(link);
                finishHandler(data);
            }
        });
    };

    module.loadAndInlineCSS = function (doc, finishHandler) {
        var links = doc.getElementsByTagName("link"),
            linksToFinalize = links.length,
            aggregatedStyleContent = "",
            i;

        var addLoadedStyleAndFinalize = function (styleContent) {
            aggregatedStyleContent += styleContent + "\n";
            linksToFinalize--;

            if (linksToFinalize === 0) {
                if (aggregatedStyleContent.trim()) {
                    addInlineCSSToDocument(doc, aggregatedStyleContent.trim());
                }

                if (finishHandler) {
                    finishHandler();
                }
            }
        };

        if (links.length === 0) {
            finishHandler();
            return;
        }

        for(i = 0; i < links.length; i++) {
            if (links[i].rel === "stylesheet" && links[i].type === "text/css") {
                loadLinkedCSSAndRemoveNode(links[i], addLoadedStyleAndFinalize);
            } else {
                // We need to properly deal with non-stylesheet in this concurrent context
                addLoadedStyleAndFinalize('');
            }
        }
    };

    /* CSS linked resource inlining */

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

    var extractCssUrl = function (cssUrl) {
        var urlRegex = /^url\(([^\)]+)\)/,
            quotedUrl;

        if (!urlRegex.test(cssUrl)) {
            throw "Invalid url";
        }

        quotedUrl = urlRegex.exec(cssUrl)[1];
        return unquoteUrl(quotedUrl);
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

    var loadAndInlineBackgroundImage = function (cssDeclaration, finishHandler) {
        var url;
        try {
            url = extractCssUrl(cssDeclaration.values[0].cssText());
        } catch (e) {
            finishHandler(false);
            return;
        }

        if (isDataUrl(url)) {
            finishHandler(false);
            return;
        }

        getDataURIForImageURL(url, function (dataURI) {
            cssDeclaration.values[0].setCssText('url("' + dataURI + '")');

            finishHandler(true);
        });
    };

    var iterateOverRulesAndInline = function (parsedCSS, finishHandler) {
        var declarationsToInline = findBackgroundImageDeclarations(parsedCSS),
            declarationsToFinalize = declarationsToInline.length,
            cssHasChanges = false,
            i, j, rule;

        var finishWorker = function (hasChanges) {
            declarationsToFinalize--;

            cssHasChanges = cssHasChanges || hasChanges;

            if (finishHandler && declarationsToFinalize === 0) {
                finishHandler(cssHasChanges);
            }
        };

        if (declarationsToInline.length === 0) {
            finishHandler(false);
        }

        for (i = 0; i < declarationsToInline.length; i++) {
            loadAndInlineBackgroundImage(declarationsToInline[i], finishWorker);
        }
    };

    var loadAndInlineCSSResources = function (style, finishHandler) {
        var parser = new CSSParser(),
            parsedCSS = parser.parse(style.textContent, false, true);

        iterateOverRulesAndInline(parsedCSS, function (hasChanges) {
            if (hasChanges) {
                style.childNodes[0].nodeValue = parsedCSS.cssText();
            }
            finishHandler();
        });
    };

    module.loadAndInlineCSSReferences = function (doc, finishHandler) {
        var styles = doc.getElementsByTagName("style"),
            stylesToFinalize = styles.length,
            i;

        var finishWorker = function () {
            stylesToFinalize--;

            if (finishHandler && stylesToFinalize === 0) {
                finishHandler();
            }
        };

        if (styles.length === 0) {
            finishHandler();
            return;
        }

        for(i = 0; i < styles.length; i++) {
            if (styles[i].type === "text/css") {
                loadAndInlineCSSResources(styles[i], finishWorker);
            } else {
                // We need to properly deal with non-css in this concurrent context
                finishWorker();
            }
        }
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
        if (needsXMLParserWorkaround() && window.HTMLtoXML) {
            return window.HTMLtoXML(xml);
        } else {
            return xml;
        }
    };

    var supportsBlobBuilding = function () {
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

    var workAroundWebkitBugForInlinedImages = function (svg) {
        // Chrome & Safari will not show the inlined image until the svg is connected to the DOM it seems.
        var doNotGarbageCollect = window.document.createElement("div");
        doNotGarbageCollect.innerHTML = svg;
    };

    module.getSvgForDocument = function (doc) {
        var html = serializeToXML(doc);

        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
                '<foreignObject width="100%" height="100%">' +
                    html +
                '</foreignObject>' +
            '</svg>'
        );
    };

    module.drawSvgToCanvas = function (svg, canvas, finishHandler) {
        var context, DOMURL, url, image;

        context = canvas.getContext("2d");

        url = buildImageUrl(svg);

        image = new window.Image();
        image.onload = function() {
            context.drawImage(image, 0, 0);
            cleanUpUrl(url);

            if (typeof finishHandler !== "undefined") {
                finishHandler(canvas);
            }
        };
        image.src = url;

        workAroundWebkitBugForInlinedImages(svg);
    };

    return module;
}());
