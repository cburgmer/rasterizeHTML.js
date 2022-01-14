window.testHelper = (function () {
    "use strict";

    var module = {};

    module.fixturesPath = "fixtures/";

    // work around https://bugzilla.mozilla.org/show_bug.cgi?id=925493
    var workAroundFirefoxNotLoadingStylesheetStyles = function (doc) {
        var d = document.implementation.createHTMLDocument("");
        d.replaceChild(doc.documentElement, d.documentElement);
        return d;
    };

    module.readHTMLDocumentFixture = function (url) {
        return new Promise(function (resolve) {
            var fixtureUrl = module.fixturesPath + url,
                xhr = new window.XMLHttpRequest();

            xhr.addEventListener(
                "load",
                function () {
                    if (xhr.status === 200 || xhr.status === 0) {
                        resolve(
                            workAroundFirefoxNotLoadingStylesheetStyles(
                                xhr.responseXML
                            )
                        );
                    }
                },
                false
            );

            xhr.open("GET", fixtureUrl, true);
            xhr.responseType = "document";
            xhr.overrideMimeType("text/html");

            xhr.send(null);
        });
    };

    module.readHTMLFixture = function (url) {
        return new Promise(function (resolve) {
            var fixtureUrl = module.fixturesPath + url,
                xhr = new window.XMLHttpRequest();

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    resolve(xhr.responseText);
                }
            };

            xhr.open("GET", fixtureUrl, true);
            xhr.overrideMimeType("text/html");

            xhr.send(null);
        });
    };

    module.readDocumentFixture = function (url) {
        var fixtureUrl = module.fixturesPath + url,
            xhr = new window.XMLHttpRequest();

        xhr.open("GET", fixtureUrl, false);
        xhr.overrideMimeType("text/xml");
        xhr.send(null);
        return xhr.responseXML;
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
                        done: defer.resolve,
                    });
                    if (resolved) {
                        triggerHandlers();
                    }
                    // chaining
                    return defer.promise;
                },
            },
        };
    };

    var SynchronousPromise = function (callback) {
        var defer = module.synchronousDefer();
        this.promise = defer.promise;
        callback(defer.resolve, function () {});
    };

    SynchronousPromise.prototype.then = function (onsuccess, onerror) {
        return this.promise.then(onsuccess, onerror);
    };

    SynchronousPromise.prototype.catch = function () {};

    SynchronousPromise.resolve = function (val) {
        return new SynchronousPromise(function (resolve) {
            resolve(val);
        });
    };

    module.SynchronousPromise = SynchronousPromise;

    return module;
})();
