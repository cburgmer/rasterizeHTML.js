describe("Rasterize", function () {
    "use strict";

    var theSvg = "the svg",
        rasterizedImage = "rasterized image",
        doc,
        inlineReferences;

    var withErrors = function (errors) {
        return Promise.resolve(errors);
    };
    var withoutErrors = function () {
        return withErrors([]);
    };

    var setUpDrawDocumentAsSvg = function (svg) {
        document2svg.drawDocumentAsSvg.and.returnValue(Promise.resolve(svg));
    };
    var setUpDrawDocumentAsSvgError = function (e) {
        document2svg.drawDocumentAsSvg.and.returnValue(Promise.reject(e));
    };

    var setUpRenderSvg = function (image) {
        svg2image.renderSvg.and.returnValue(Promise.resolve(image));
    };
    var setUpRenderSvgError = function (e) {
        svg2image.renderSvg.and.returnValue(Promise.reject(e));
    };

    var aMockCanvas = function () {
        var canvas = jasmine.createSpyObj("canvas", ["getContext"]),
            context = jasmine.createSpyObj("context", ["drawImage"]);

        canvas.getContext.and.callFake(function (howManyD) {
            if (howManyD === "2d") {
                return context;
            }
        });
        return canvas;
    };
    var aMockCanvasWithDrawError = function () {
        var canvas = jasmine.createSpyObj("canvas", ["getContext"]),
            context = jasmine.createSpyObj("context", ["drawImage"]);

        canvas.getContext.and.returnValue(context);
        context.drawImage.and.throwError("error");
        return canvas;
    };

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");
    });

    describe("Rendering", function () {
        var callback;

        beforeEach(function () {
            spyOn(document2svg, "drawDocumentAsSvg");
            spyOn(browser, "loadDocument");
            spyOn(svg2image, "renderSvg");

            callback = jasmine.createSpy("drawCallback");

            inlineReferences = spyOn(
                inlineresources,
                "inlineReferences"
            ).and.returnValue(withoutErrors());

            spyOn(documentHelper, "persistInputValues");

            setUpDrawDocumentAsSvg(theSvg);
            setUpRenderSvg(rasterizedImage);
        });

        it("should take a document, inline all displayable content and render to the given canvas", function (done) {
            var canvas = aMockCanvas();

            rasterize
                .rasterize(doc.documentElement, canvas, {})
                .then(function () {
                    expect(inlineReferences).toHaveBeenCalledWith(
                        doc.documentElement,
                        { inlineScripts: false }
                    );
                    expect(document2svg.drawDocumentAsSvg).toHaveBeenCalledWith(
                        doc.documentElement,
                        {}
                    );
                    expect(svg2image.renderSvg).toHaveBeenCalledWith(theSvg);
                    expect(
                        canvas.getContext("2d").drawImage
                    ).toHaveBeenCalledWith(rasterizedImage, 0, 0);

                    done();
                });
        });

        it("should return the rendered image", function (done) {
            rasterize
                .rasterize(doc.documentElement, aMockCanvas(), {})
                .then(function (result) {
                    expect(result.image).toEqual(rasterizedImage);

                    done();
                });
        });

        it("should report empty errors", function (done) {
            rasterize
                .rasterize(doc.documentElement, aMockCanvas(), {})
                .then(function (result) {
                    expect(result.errors).toEqual([]);

                    done();
                });
        });

        it("should return the internal SVG representation", function (done) {
            rasterize
                .rasterize(doc.documentElement, aMockCanvas(), {})
                .then(function (result) {
                    expect(result.svg).toEqual(theSvg);

                    done();
                });
        });

        it("should make the canvas optional", function (done) {
            rasterize
                .rasterize(doc.documentElement, null, {})
                .then(function (result) {
                    expect(result.image).toEqual(rasterizedImage);

                    expect(inlineReferences).toHaveBeenCalledWith(
                        doc.documentElement,
                        { inlineScripts: false }
                    );
                    expect(document2svg.drawDocumentAsSvg).toHaveBeenCalledWith(
                        doc.documentElement,
                        {}
                    );

                    done();
                });
        });

        it("should pass on AJAX options", function (done) {
            rasterize
                .rasterize(doc.documentElement, aMockCanvas(), {
                    baseUrl: "a_baseUrl",
                    cache: "none",
                    cacheBucket: {},
                })
                .then(function () {
                    expect(inlineReferences).toHaveBeenCalledWith(
                        doc.documentElement,
                        {
                            baseUrl: "a_baseUrl",
                            cache: "none",
                            cacheBucket: {},
                            inlineScripts: false,
                        }
                    );

                    done();
                });
        });

        it("should pass on render options", function (done) {
            rasterize
                .rasterize(doc.documentElement, aMockCanvas(), {
                    width: 123,
                    height: 234,
                    hover: ".aSelector",
                    active: "#anotherSelector",
                    zoom: 42,
                })
                .then(function () {
                    expect(document2svg.drawDocumentAsSvg).toHaveBeenCalledWith(
                        doc.documentElement,
                        {
                            width: 123,
                            height: 234,
                            hover: ".aSelector",
                            active: "#anotherSelector",
                            zoom: 42,
                        }
                    );

                    done();
                });
        });

        it("should optionally execute JavaScript in the page", function (done) {
            var executeJavascript = spyOn(
                browser,
                "executeJavascript"
            ).and.returnValue(
                Promise.resolve({
                    document: doc,
                    errors: [],
                    cleanUp: function () {},
                })
            );

            rasterize
                .rasterize(doc.documentElement, null, {
                    executeJs: true,
                    width: 123,
                    height: 456,
                })
                .then(function () {
                    expect(executeJavascript).toHaveBeenCalledWith(
                        doc.documentElement,
                        jasmine.objectContaining({ width: 123, height: 456 })
                    );
                    expect(
                        documentHelper.persistInputValues
                    ).toHaveBeenCalledWith(doc);

                    done();
                });
        });

        it("should inline scripts when executing JavaScript", function (done) {
            spyOn(browser, "executeJavascript").and.returnValue(
                Promise.resolve({
                    document: doc,
                    errors: [],
                    cleanUp: function () {},
                })
            );

            rasterize
                .rasterize(doc.documentElement, null, { executeJs: true })
                .then(function () {
                    expect(inlineReferences).toHaveBeenCalledWith(
                        doc.documentElement,
                        { executeJs: true, inlineScripts: true }
                    );

                    done();
                });
        });

        it("should follow optional timeout when executing JavaScript", function (done) {
            var executeJavascript = spyOn(
                browser,
                "executeJavascript"
            ).and.returnValue(
                Promise.resolve({
                    document: doc,
                    errors: [],
                    cleanUp: function () {},
                })
            );

            rasterize
                .rasterize(doc.documentElement, null, {
                    executeJs: true,
                    executeJsTimeout: 42,
                })
                .then(function () {
                    expect(executeJavascript).toHaveBeenCalledWith(
                        doc.documentElement,
                        jasmine.objectContaining({ executeJsTimeout: 42 })
                    );

                    done();
                });
        });
    });

    describe("Error handling", function () {
        var callback;

        beforeEach(function () {
            spyOn(document2svg, "drawDocumentAsSvg");
            spyOn(browser, "loadDocument");
            spyOn(svg2image, "renderSvg");

            callback = jasmine.createSpy("drawCallback");

            spyOn(documentHelper, "persistInputValues");
        });

        it("should pass through an error from inlining on drawDocument", function (done) {
            setUpDrawDocumentAsSvg(theSvg);
            setUpRenderSvg(rasterizedImage);

            inlineReferences = spyOn(
                inlineresources,
                "inlineReferences"
            ).and.returnValue(withErrors(["the error"]));

            rasterize
                .rasterize(doc.documentElement, aMockCanvas(), {})
                .then(function (result) {
                    expect(result.image).toEqual(rasterizedImage);
                    expect(result.errors).toEqual(["the error"]);

                    expect(inlineReferences).toHaveBeenCalled();

                    done();
                });
        });

        it("should pass through a JS error", function (done) {
            spyOn(inlineresources, "inlineReferences").and.returnValue(
                withoutErrors()
            );
            spyOn(browser, "executeJavascript").and.returnValue(
                Promise.resolve({
                    document: doc,
                    errors: ["the error"],
                    cleanUp: function () {},
                })
            );
            setUpDrawDocumentAsSvg(theSvg);
            setUpRenderSvg(rasterizedImage);

            rasterize
                .rasterize(doc.documentElement, aMockCanvas(), {
                    executeJs: true,
                })
                .then(function (result) {
                    expect(result.image).toBe(rasterizedImage);
                    expect(result.errors).toEqual(["the error"]);

                    done();
                });
        });
    });

    describe("Internal errors", function () {
        var callback, executeJavascript;

        beforeEach(function () {
            spyOn(document2svg, "drawDocumentAsSvg");
            spyOn(browser, "loadDocument");
            spyOn(svg2image, "renderSvg");

            callback = jasmine.createSpy("drawCallback");

            inlineReferences = spyOn(
                inlineresources,
                "inlineReferences"
            ).and.returnValue(withoutErrors());

            executeJavascript = spyOn(browser, "executeJavascript");
            spyOn(documentHelper, "persistInputValues");
        });

        it("should fail the returned promise on error from inlining when drawing the SVG", function (done) {
            var canvas = aMockCanvas(),
                error = new Error();

            setUpDrawDocumentAsSvgError(error);

            rasterize
                .rasterize(doc.documentElement, canvas, {})
                .then(null, function (e) {
                    expect(e).toBe(error);

                    expect(
                        canvas.getContext("2d").drawImage
                    ).not.toHaveBeenCalled();

                    done();
                });
        });

        it("should fail the returned promise on error from inlining when rendering the image", function (done) {
            var canvas = aMockCanvas();

            setUpDrawDocumentAsSvg(theSvg);
            setUpRenderSvgError(new Error());

            rasterize
                .rasterize(doc.documentElement, canvas, {})
                .then(null, function (error) {
                    expect(error.message).toEqual("Error rendering page");
                    expect(error.originalError).toBeTruthy();

                    expect(
                        canvas.getContext("2d").drawImage
                    ).not.toHaveBeenCalled();

                    done();
                });
        });

        it("should fail the returned promise on error from inlining when drawing the image on the canvas", function (done) {
            var canvas = aMockCanvasWithDrawError();

            setUpDrawDocumentAsSvg(theSvg);
            setUpRenderSvg(rasterizedImage);

            rasterize
                .rasterize(doc.documentElement, canvas, {})
                .then(null, function (error) {
                    expect(error.message).toEqual("Error rendering page");
                    expect(error.originalError).toBeTruthy();

                    done();
                });
        });
    });

    describe("rasterize integration", function () {
        it("should clean up the iframe when executing JavaScript", function (done) {
            rasterize
                .rasterize(doc.documentElement, undefined, { executeJs: true })
                .then(function () {
                    expect(document.querySelector("iframe")).toBe(null);

                    done();
                });
        });
    });
});
