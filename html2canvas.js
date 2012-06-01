// html2canvas
// Distributed under the MIT License
// For original source and documentation visit:
// http://www.github.com/cburgmer/html2canvas
/*global window*/

var HTML2Canvas = (function () {
    "use strict";

    var module = {};

    var serializeToXML = function (doc) {
        doc.documentElement.setAttribute("xmlns", doc.documentElement.namespaceURI);
        return (new window.XMLSerializer()).serializeToString(doc.documentElement);
    };

    var getBlob = function (data) {
       var imageType = "image/svg+xml;charset=utf-8",
           BLOBBUILDER = (window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder),
           svg;
       if (BLOBBUILDER) {
           svg = new BLOBBUILDER();
           svg.append(data);
           return svg.getBlob(imageType);
       } else {
           return new window.Blob(data, {"type": imageType});
       }
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

        DOMURL = window.URL || window.webkitURL || window;
        url = DOMURL.createObjectURL(getBlob(svg));

        image = new window.Image();
        image.onload = function() {
            context.drawImage(image, 0, 0);
            DOMURL.revokeObjectURL(url);

            if (typeof finishHandler !== "undefined") {
                finishHandler(canvas);
            }
        };
        image.src = url;
    };

    return module;
}());
