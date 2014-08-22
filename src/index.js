var rasterizeHTML = (function (util, browser, rasterize) {
    "use strict";

    var module = {};

    /**
     * Draws a Document to the canvas.
     * rasterizeHTML.drawDocument( document [, canvas] [, options] ).then(function (result) { ... });
     */
    module.drawDocument = function () {
        var doc = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = util.parseOptionalParameters(optionalArguments);

        var promise = rasterize.rasterize(doc, params.canvas, params.options);

        // legacy API
        if (params.callback) {
            promise.then(function (result) {
                params.callback(result.image, result.errors);
            }, function () {
                params.callback(null, [{
                    resourceType: "document",
                    msg: "Error rendering page"
                }]);
            });
        }

        return promise;
    };

    var drawHTML = function (html, canvas, options, callback) {
        var doc = browser.parseHTML(html);

        return module.drawDocument(doc, canvas, options, callback);
    };

    /**
     * Draws a HTML string to the canvas.
     * rasterizeHTML.drawHTML( html [, canvas] [, options] ).then(function (result) { ... });
     */
    module.drawHTML = function () {
        var html = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = util.parseOptionalParameters(optionalArguments);

        return drawHTML(html, params.canvas, params.options, params.callback);
    };

    // work around https://bugzilla.mozilla.org/show_bug.cgi?id=925493
    var workAroundFirefoxNotLoadingStylesheetStyles = function (doc, url, options) {
        var d = document.implementation.createHTMLDocument('');
        d.replaceChild(doc.documentElement, d.documentElement);

        var extendedOptions = options ? util.clone(options) : {};

        if (!options.baseUrl) {
            extendedOptions.baseUrl = url;
        }

        return {
            document: d,
            options: extendedOptions
        };
    };

    var drawURL = function (url, canvas, options, callback) {
        var promise = browser.loadDocument(url, options)
            .then(function (doc) {
                var workaround = workAroundFirefoxNotLoadingStylesheetStyles(doc, url, options);
                return module.drawDocument(workaround.document, canvas, workaround.options);
            });

        // legacy API
        if (callback) {
            promise.then(function (result) {
                    callback(result.image, result.errors);
                }, function (e) {
                    callback(null, [{
                        resourceType: "page",
                        url: url,
                        msg: e.message + ' ' + url
                    }]);
                });
        }

        return promise;
    };

    /**
     * Draws a page to the canvas.
     * rasterizeHTML.drawURL( url [, canvas] [, options] ).then(function (result) { ... });
     */
    module.drawURL = function () {
        var url = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = util.parseOptionalParameters(optionalArguments);

        return drawURL(url, params.canvas, params.options, params.callback);
    };

    return module;
}(util, browser, rasterize));
