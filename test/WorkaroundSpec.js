describe("working around on Firefox and Webkit to fix resources not being rendered consistently", function () {
    beforeEach(function () {
        $(".rasterizeHTML_js_FirefoxWorkaround").remove();
    });

    it("should add hidden svg", function () {
        var canvas = document.createElement("canvas"),
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

        // Stop method of finishing and removing div
        spyOn(window, "Image").andReturn({});

        rasterizeHTML.renderSvg(svg, canvas);

        expect($(".rasterizeHTML_js_FirefoxWorkaround")).toExist();
        expect($(".rasterizeHTML_js_FirefoxWorkaround svg")).toExist();
        expect($(".rasterizeHTML_js_FirefoxWorkaround").css("visibility")).toEqual("hidden");
        expect($(".rasterizeHTML_js_FirefoxWorkaround").css("position")).toEqual("absolute");
        expect($(".rasterizeHTML_js_FirefoxWorkaround").css("top")).toEqual("-10000px");
        expect($(".rasterizeHTML_js_FirefoxWorkaround").css("left")).toEqual("-10000px");
    });

    it("should add the workaround for each canvas", function () {
        var canvas1 = document.createElement("canvas"),
            canvas2 = document.createElement("canvas"),
            svg1 = '<svg xmlns="http://www.w3.org/2000/svg" width="101" height="101"></svg>',
            svg2 = '<svg xmlns="http://www.w3.org/2000/svg" width="102" height="102"></svg>';

        // Stop method of finishing and removing div
        spyOn(window, "Image").andReturn({});

        rasterizeHTML.renderSvg(svg1, canvas1);
        rasterizeHTML.renderSvg(svg2, canvas2);

        expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(2);
    });

    it("should update the workaround when re-rendering the canvas", function () {
        var canvas = document.createElement("canvas"),
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

        // Stop method of finishing and removing div
        spyOn(window, "Image").andReturn({});

        rasterizeHTML.renderSvg(svg, canvas);
        rasterizeHTML.renderSvg(svg, canvas);

        expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(1);
    });

    it("should remove the workaround div once the canvas has been rendered", function () {
        var renderFinished = false,
            canvas = document.createElement("canvas"),
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

        rasterizeHTML.renderSvg(svg, canvas, function () { renderFinished = true; });

        waitsFor(function () {
            return renderFinished;
        }, "rasterizeHTML.renderSvg", 2000);

        runs(function () {
            expect($(".rasterizeHTML_js_FirefoxWorkaround")).not.toExist();
        });
    });

    it("should remove the workaround div once the canvas has been rendered even if an error occurs when drawing on the canvas", function () {
        var canvas = jasmine.createSpyObj("canvas", ["getContext"]),
            context = jasmine.createSpyObj("context", ["drawImage"]);

        canvas.getContext.andReturn(context);
        context.drawImage.andThrow("exception");

        rasterizeHTML.drawImageOnCanvas("svg", canvas);

        expect($(".rasterizeHTML_js_FirefoxWorkaround")).not.toExist();
    });

    it("should remove the workaround div once the canvas has been rendered even if an error occurs when drawing the image", function () {
        var renderFinished = false,
            canvas = document.createElement("canvas"),
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>',
            imageInstance = {};
        spyOn(window, "Image").andReturn(imageInstance);

        rasterizeHTML.renderSvg(svg, canvas, function () {}, function () { renderFinished = true; });

        imageInstance.onerror();

        expect(renderFinished).toBeTruthy();

        expect($(".rasterizeHTML_js_FirefoxWorkaround")).not.toExist();
    });
});
