var isWebkit = navigator.userAgent.indexOf("WebKit") >= 0,
    isPhantomJs = navigator.userAgent.indexOf("PhantomJS") >= 0,
    isLocalRunner = document.baseURI.substr(0, 'file://'.length) === 'file://',
    ifNotInWebkitIt = function(text, functionHandle) {
        if (! isWebkit) {
            return it(text, functionHandle);
        } else {
            console.log('Warning: "' + text + '" is disabled on this platform');
        }
    },
    ifNotInPhantomJsIt = function(text, functionHandle) {
        if (! isPhantomJs) {
            return it(text, functionHandle);
        } else {
            console.log('Warning: "' + text + '" is disabled on this platform');
        }
    },
    ifNotInPhantomJSAndNotLocalRunnerIt = function (text, functionHandle) {
        if (! isPhantomJs && ! isLocalRunner) {
            return it(text, functionHandle);
        } else {
            console.log('Warning: "' + text + '" is disabled on this platform');
        }
    };

var rasterizeHTMLTestHelper = (function () {
    var module = {};

    module.fixturesPath = 'fixtures/';

    module.readHTMLFixture = function (url, callback) {
        var fixtureUrl = module.fixturesPath + url,
            xhr = new window.XMLHttpRequest();

        xhr.open('GET', fixtureUrl, false);
        xhr.send(null);
        return xhr.response;
    };

    module.readHTMLDocumentFixture = function (url, callback) {
        var fixtureUrl = module.fixturesPath + url,
            xhr = new window.XMLHttpRequest();

        xhr.addEventListener("load", function () {
            if (xhr.status === 200 || xhr.status === 0) {
                callback(xhr.responseXML);
            }
        }, false);

        xhr.open('GET', fixtureUrl, true);
        xhr.responseType = "document";
        xhr.send(null);
    };

    module.readDocumentFixture = function (url) {
        var fixtureUrl = module.fixturesPath + url,
            xhr = new window.XMLHttpRequest();

        xhr.open('GET', fixtureUrl, false);
        xhr.overrideMimeType('text/xml');
        xhr.send(null);
        return xhr.responseXML;
    };

    module.readDocumentFixtureWithoutBaseURI = function (url) {
        var html = module.readHTMLFixture(url),
            doc = document.implementation.createHTMLDocument("");

        doc.documentElement.innerHTML = html;
        return doc;
    };

    module.addStyleToDocument = function (doc, styleContent) {
        var styleNode = doc.createElement("style");

        styleNode.type = "text/css";
        styleNode.appendChild(doc.createTextNode(styleContent));

        doc.getElementsByTagName('head')[0].appendChild(styleNode);
    };

    module.deleteAdditionalFieldsFromErrorUnderPhantomJS = function (error) {
        var newErrorObject = {},
            additionalKeys = ['sourceId', 'sourceURL', 'stack', 'stackArray', 'line'];

        Object.keys(error).forEach(function (key) {
            if (additionalKeys.indexOf(key) === -1) {
                newErrorObject[key] = error[key];
            }
        });
        return newErrorObject;
    };

    module.deleteAdditionalFieldsFromErrorsUnderPhantomJS = function (errors) {
        return errors.map(module.deleteAdditionalFieldsFromErrorUnderPhantomJS);
    }

    return module;
}());
