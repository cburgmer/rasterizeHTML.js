var rasterize = (function (util, browser, documentHelper, render, inlineresources) {
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

    var getViewportSize = function (canvas, options) {
        var defaultWidth = 300,
            defaultHeight = 200,
            fallbackWidth = canvas ? canvas.width : defaultWidth,
            fallbackHeight = canvas ? canvas.height : defaultHeight,
            width = options.width !== undefined ? options.width : fallbackWidth,
            height = options.height !== undefined ? options.height : fallbackHeight;

        return {
            width: width,
            height: height
        };
    };

    var operateJavaScriptOnDocument = function (doc, canvas, options) {
        var executeJsTimeout = options.executeJsTimeout || 0;

        return browser.executeJavascript(doc, options.baseUrl, executeJsTimeout, getViewportSize(canvas, options))
            .then(function (result) {
                var document = result.document;
                documentHelper.persistInputValues(document);

                return {
                    document: document,
                    errors: result.errors
                };
            });
    };

    module.rasterize = function (doc, canvas, options) {
        var inlineOptions;

        inlineOptions = util.clone(options);
        inlineOptions.inlineScripts = options.executeJs === true;

        return inlineresources.inlineReferences(doc, inlineOptions)
            .then(function (errors) {
                if (options.executeJs) {
                    return operateJavaScriptOnDocument(doc, canvas, options)
                        .then(function (result) {
                            return {
                                document: result.document,
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

    return module;
}(util, browser, documentHelper, render, inlineresources));
