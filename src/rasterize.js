var rasterize = (function (util, browser, documentHelper, render, inlineresources) {
    "use strict";

    var module = {};

    var doDraw = function (doc, canvas, options) {
        return render.drawDocumentImage(doc, options).then(function (image) {
            if (canvas) {
                render.drawImageOnCanvas(image, canvas);
            }

            return image;
        });
    };

    var operateJavaScriptOnDocument = function (doc, options) {
        var executeJsTimeout = options.executeJsTimeout || 0,
            width = options.width,
            height = options.height;

        return browser.executeJavascript(doc, options.baseUrl, executeJsTimeout, {width: width, height: height})
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
                    return operateJavaScriptOnDocument(doc, options)
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
