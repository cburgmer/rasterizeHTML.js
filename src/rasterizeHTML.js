var rasterizeHTML = (function (util, render, inlineresources) {
    "use strict";

    var module = {};

    var doDraw = function (doc, canvas, options) {
        return render.drawDocumentImage(doc, canvas, options).then(function (image) {
            if (canvas) {
                render.drawImageOnCanvas(image, canvas);
            }

            return image;
        });
    };

    var drawDocument = function (doc, canvas, options) {
        var executeJsTimeout = options.executeJsTimeout || 0,
            inlineOptions;

        inlineOptions = util.clone(options);
        inlineOptions.inlineScripts = options.executeJs === true;

        return inlineresources.inlineReferences(doc, inlineOptions)
            .then(function (errors) {
                if (options.executeJs) {
                    return util.executeJavascript(doc, options.baseUrl, executeJsTimeout)
                        .then(function (result) {
                            var document = result.document;
                            util.persistInputValues(document);

                            return {
                                document: document,
                                errors: errors.concat(result.errors)
                            };
                        });
                } else {
                    return {
                        document: doc,
                        errors: errors
                    };
                }
            }).then(function (result) {
                return doDraw(result.document, canvas, options)
                    .then(function (image) {
                        return {
                            image: image,
                            errors: result.errors
                        };
                    });
            });
    };

    /**
     * Draws a Document to the canvas.
     * rasterizeHTML.drawDocument( document [, canvas] [, options] [, callback] );
     */
    module.drawDocument = function () {
        var doc = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = util.parseOptionalParameters(optionalArguments);

        var promise = drawDocument(doc, params.canvas, params.options);

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
        var doc = util.parseHTML(html);

        return module.drawDocument(doc, canvas, options, callback);
    };

    /**
     * Draws a HTML string to the canvas.
     * rasterizeHTML.drawHTML( html [, canvas] [, options] [, callback] );
     */
    module.drawHTML = function () {
        var html = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = util.parseOptionalParameters(optionalArguments);

        return drawHTML(html, params.canvas, params.options, params.callback);
    };

    var drawURL = function (url, canvas, options, callback) {
        var promise = util.loadDocument(url, options)
            .then(function (doc) {
                return module.drawDocument(doc, canvas, options);
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
     * rasterizeHTML.drawURL( url [, canvas] [, options] [, callback] );
     */
    module.drawURL = function () {
        var url = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = util.parseOptionalParameters(optionalArguments);

        return drawURL(url, params.canvas, params.options, params.callback);
    };

    return module;
}(util, render, inlineresources));
