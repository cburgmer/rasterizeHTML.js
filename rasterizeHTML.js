// rasterizeHTML.js
// Distributed under the MIT License
// For source and documentation visit:
// http://www.github.com/cburgmer/rasterizeHTML.js
/*global window, CSSParser*/

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

    var getDataURIForImageURL = function (url, callback) {
        var img = new window.Image(),
            dataURI;

        img.onload = function () {
            dataURI = getDataURIForImage(img);

            callback(dataURI);
        };
        img.src = url;
    };

    /* Img Inlining */

    var encodeImageAsDataURI = function (image, callback) {
        var url = image.attributes.src.nodeValue; // Chrome 19 sets image.src to "";

        if (isDataUrl(url)) {
            callback();
        }

        getDataURIForImageURL(url, function (dataURI) {
            image.attributes.src.nodeValue = dataURI;
            callback();
        });
    };

    module.loadAndInlineImages = function (doc, callback) {
        var images = doc.getElementsByTagName("img");

        module.util.map(images, function (image, finish) {
            encodeImageAsDataURI(image, finish);
        }, function () {
            callback();
        });
    };

    /* CSS inlining */

    var addInlineCSSToDocument = function (doc, styleContent) {
        var styleNode = doc.createElement("style"),
            head = doc.getElementsByTagName("head")[0];

        styleNode.type = "text/css";
        styleNode.appendChild(doc.createTextNode(styleContent));

        head.appendChild(styleNode);
    };

    var loadLinkedCSSAndRemoveNode = function (link, callback) {
        var href = link.attributes.href.nodeValue, // Chrome 19 sets link.href to ""
            ajaxRequest = new window.XMLHttpRequest();

        ajaxRequest.onreadystatechange = function () {
            if (ajaxRequest.readyState == 4) {
                link.parentNode.removeChild(link);
                callback(ajaxRequest.responseText);
            }
        };
        ajaxRequest.open('GET', href, true);
        ajaxRequest.send(null);
    };

    var mergeAndAddInlineStyle = function (doc, styles) {
        var aggregatedStyleContent = styles.join("").trim();
        if (aggregatedStyleContent) {
            addInlineCSSToDocument(doc, aggregatedStyleContent);
        }
    };

    module.loadAndInlineCSS = function (doc, callback) {
        var links = doc.getElementsByTagName("link");

        module.util.map(links, function (link, finish) {
            if (link.attributes.rel && link.attributes.rel.nodeValue === "stylesheet" &&
                link.attributes.type && link.attributes.type.nodeValue === "text/css") {
                loadLinkedCSSAndRemoveNode(link, function(css) {
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

            if (callback) {
                callback();
            }
        });
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

    var loadAndInlineBackgroundImage = function (cssDeclaration, callback) {
        var url;
        try {
            url = extractCssUrl(cssDeclaration.values[0].cssText());
        } catch (e) {
            callback(false);
            return;
        }

        if (isDataUrl(url)) {
            callback(false);
            return;
        }

        getDataURIForImageURL(url, function (dataURI) {
            cssDeclaration.values[0].setCssText('url("' + dataURI + '")');

            callback(true);
        });
    };

    var iterateOverRulesAndInlineBackgroundImage = function (parsedCSS, callback) {
        var declarationsToInline = findBackgroundImageDeclarations(parsedCSS),
            cssHasChanges;

        rasterizeHTML.util.map(declarationsToInline, function (declaration, callback) {
            loadAndInlineBackgroundImage(declaration, callback);
        }, function (changedStates) {
            cssHasChanges = changedStates.indexOf(true) >= 0;
            callback(cssHasChanges);
        });
    };

    var loadAndInlineCSSResources = function (style, callback) {
        var parser = new CSSParser(),
            parsedCSS = parser.parse(style.textContent, false, true);

        iterateOverRulesAndInlineBackgroundImage(parsedCSS, function (hasChanges) {
            if (hasChanges) {
                style.childNodes[0].nodeValue = parsedCSS.cssText();
            }
            callback();
        });
    };

    module.loadAndInlineCSSReferences = function (doc, callback) {
        var styles = doc.getElementsByTagName("style");

        module.util.map(styles, function (style, finish) {
            if (style.type === "text/css") {
                loadAndInlineCSSResources(style, finish);
            } else {
                // We need to properly deal with non-css in this concurrent context
                finish();
            }
        }, function () {
            if (callback) {
                callback();
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

    var workAroundFirefoxBugForInlinedImages = function (doc, svg) {
        // Firefox will not show an inlined background-image until the svg is connected to the DOM it seems.
        var doNotGarbageCollect;

        if (window.navigator.userAgent.indexOf("Firefox") >= 0) {
            doNotGarbageCollect = doc.createElement("div");
            doNotGarbageCollect.innerHTML = svg;
            doNotGarbageCollect.style.visibility = "hidden";
            doNotGarbageCollect.style.width = "0px";
            doNotGarbageCollect.style.height = "0px";
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

        workAroundFirefoxBugForInlinedImages(canvas.ownerDocument, svg);
    };

    return module;
}());
