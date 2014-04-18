var testHelper = (function () {
    "use strict";

    var module = {};

    module.fixturesPath = 'fixtures/';

    module.readHTMLFixture = function (url, callback) {
        var fixtureUrl = module.fixturesPath + url,
            xhr = new window.XMLHttpRequest();

        xhr.open('GET', fixtureUrl, false);
        xhr.send(null);
        return xhr.response;
    };

    module.readHTMLDocumentFixture = function (url) {
        var defer = ayepromise.defer(),
            fixtureUrl = module.fixturesPath + url,
            xhr = new window.XMLHttpRequest();

        xhr.addEventListener("load", function () {
            if (xhr.status === 200 || xhr.status === 0) {
                defer.resolve(xhr.responseXML);
            }
        }, false);

        xhr.open('GET', fixtureUrl, true);
        xhr.responseType = "document";
        xhr.send(null);

        return defer.promise;
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

    // Poor man's promise implementation
    module.synchronousDefer = function () {
        var handlers = [],
            resolved = false,
            result;

        var triggerHandlers = function () {
            handlers.forEach(function (handler) {
                var res = handler.func(result);
                if (res && res.then) {
                    // chaining
                    res.then(handler.done);
                } else {
                    handler.done();
                }
            });
        };

        return {
            resolve: function (value) {
                resolved = true;
                result = value;
                triggerHandlers();
            },
            promise: {
                then: function (handler) {
                    var defer = module.synchronousDefer();
                    handlers.push({
                        func: handler,
                        done: defer.resolve
                    });
                    if (resolved) {
                        triggerHandlers();
                    }
                    // chaining
                    return defer.promise;
                }
            }
        };
    };


    return module;
}());
