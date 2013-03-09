var isWebkit = navigator.userAgent.indexOf("WebKit") >= 0,
    isPhantomJs = navigator.userAgent.indexOf("PhantomJS") >= 0,
    ifNotInWebkitIt = function(text, functionHandle) {
        if (! isWebkit) {
            return it(text, functionHandle);
        } else {
            safeLog('Warning: "' + text + '" is disabled on this platform');
        }
    },
    ifNotInPhantomJsIt = function(text, functionHandle) {
        if (! isPhantomJs) {
            return it(text, functionHandle);
        } else {
            safeLog('Warning: "' + text + '" is disabled on this platform');
        }
    },
    safeLog = function (msg) {
        if (window.console && console.log) {
            console.log(msg);
        }
    };

var rasterizeHTMLTestHelper = (function () {
    var module = {};

    module.readDocumentFixture = function (url) {
        var doc,
            fixtureUrl = jasmine.getFixtures().fixturesPath + url;

        $.ajax({
            dataType: 'xml',
            mimeType: 'text/xml',
            url: fixtureUrl,
            async: false,
            cache: false,
            success: function (content) {
                doc = content;
            }
        });

        return doc;
    };

    module.readFixturesOrFail = function (url) {
        var content,
            fixtureUrl = jasmine.getFixtures().fixturesPath + url;

        $.ajax({
            dataType: 'text',
            url: fixtureUrl,
            async: false,
            cache: false,
            success: function (theContent) {
                content = theContent;
            },
            error: function () {
                throw "unable to read fixture";
            }
        });

        return content;
    };

    module.readDocumentFixtureWithoutBaseURI = function (url) {
        var html = readFixtures(url),
            doc = document.implementation.createHTMLDocument("");

        doc.documentElement.innerHTML = html;
        return doc;
    };

    module.getLocalDocumentImage = function (image, finishHandler) {
        var img = new window.Image();

        img.onload = function () {
            finishHandler(img);
        };
        img.src = image.attributes.src.nodeValue; // Chrome 19 sets image.src to ""
    };

    module.compareImageToReference = function (image, referenceImageId) {
        var localImg = null;

        // Gecko & Webkit won't allow direct comparison of images, need to get local first
        runs(function () {
            module.getLocalDocumentImage(image, function (img) { localImg = img; });
        });

        waitsFor(function () {
            return localImg !== null;
        }, "Move of image to local", 200);

        runs(function () {
            expect(localImg).toImageDiffEqual(window.document.getElementById(referenceImageId));
        });
    };

    module.getBaseUri = function () {
        // Strip of file part
        return document.baseURI.replace(/\/[^\/]*$/, "/");
    };

    module.addStyleToDocument = function (doc, styleContent) {
        var styleNode = doc.createElement("style");

        styleNode.type = "text/css";
        styleNode.appendChild(doc.createTextNode(styleContent));

        doc.head.appendChild(styleNode);
    };

    var getImageForURL = function (url, finishHandler) {
        var img = new window.Image();

        img.onload = function () {
            finishHandler(img);
        };
        img.src = url;
    };

    return module;
}());
