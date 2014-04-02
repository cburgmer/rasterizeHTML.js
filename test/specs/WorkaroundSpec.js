describe("working around on Firefox and Webkit to fix resources not being rendered consistently", function () {
    var originalUserAgent = window.navigator.userAgent,
        originalNavigator = window.navigator,
        userAgent;

    beforeEach(function () {

        $(".rasterizeHTML_js_FirefoxWorkaround").remove();

        // Set some valid user agent
        try {
            // Get a custom object for Safari, http://stackoverflow.com/questions/1307013/mocking-a-useragent-in-javascript/
            window.navigator = {};
            window.navigator.prototype = originalNavigator;
        } catch (err) {}

        userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.95 Safari/537.11";
        window.navigator.__defineGetter__('userAgent', function(){
            return userAgent;
        });
    });

    afterEach(function () {
        userAgent = originalUserAgent;
        window.navigator = originalNavigator;
    });

    it("should add hidden svg", function () {
        var canvas = document.createElement("canvas"),
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

        // Stop method of finishing and removing div
        spyOn(window, "Image").and.returnValue({});

        render.renderSvg(svg, canvas);

        expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(1);
        expect($(".rasterizeHTML_js_FirefoxWorkaround svg").length).toEqual(1);
        expect($(".rasterizeHTML_js_FirefoxWorkaround").css("visibility")).toEqual("hidden");
        expect($(".rasterizeHTML_js_FirefoxWorkaround").css("position")).toEqual("absolute");
        expect($(".rasterizeHTML_js_FirefoxWorkaround").css("top")).toEqual("-10000px");
        expect($(".rasterizeHTML_js_FirefoxWorkaround").css("left")).toEqual("-10000px");
    });

    it("should not add a hidden SVG in Firefox >= 17", function () {
        userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:17.0) Gecko/20100101 Firefox/17.0";

        var canvas = document.createElement("canvas"),
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

        // Stop method of finishing and removing div
        spyOn(window, "Image").and.returnValue({});

        render.renderSvg(svg, canvas);

        expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(0);
    });

    it("should add the workaround for each canvas", function () {
        var canvas1 = document.createElement("canvas"),
            canvas2 = document.createElement("canvas"),
            svg1 = '<svg xmlns="http://www.w3.org/2000/svg" width="101" height="101"></svg>',
            svg2 = '<svg xmlns="http://www.w3.org/2000/svg" width="102" height="102"></svg>';

        // Stop method of finishing and removing div
        spyOn(window, "Image").and.returnValue({});

        render.renderSvg(svg1, canvas1);
        render.renderSvg(svg2, canvas2);

        expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(2);
    });

    it("should update the workaround when re-rendering the canvas", function () {
        var canvas = document.createElement("canvas"),
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

        // Stop method of finishing and removing div
        spyOn(window, "Image").and.returnValue({});

        render.renderSvg(svg, canvas);
        render.renderSvg(svg, canvas);

        expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(1);
    });

    it("should remove the workaround div once the canvas has been rendered", function (done) {
        var fakeImage = {},
            canvas = document.createElement("canvas"),
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

        spyOn(window, "Image").and.returnValue(fakeImage);

        render.renderSvg(svg, canvas).then(function () {
            expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(0);

            done();
        });

        fakeImage.onload();
    });

    it("should remove the workaround div before the callback has been called", function (done) {
        var fakeImage = {},
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

        spyOn(window, "Image").and.returnValue(fakeImage);

        render.renderSvg(svg, null).then(function () {
            expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(0);

            done();
        });

        fakeImage.onload();
    });

    it("should remove the workaround div once the canvas has been rendered even if an error occurs when drawing on the canvas", function () {
        var canvas = jasmine.createSpyObj("canvas", ["getContext"]),
            context = jasmine.createSpyObj("context", ["drawImage"]);

        canvas.getContext.and.returnValue(context);
        context.drawImage.and.throwError("exception");

        try {
            rasterizeHTML.drawImageOnCanvas("svg", canvas);
        } catch(e) {}

        expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(0);
    });

    it("should remove the workaround div once the canvas has been rendered even if an error occurs when drawing the image", function (done) {
        var canvas = document.createElement("canvas"),
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>',
            imageInstance = {};
        spyOn(window, "Image").and.returnValue(imageInstance);

        render.renderSvg(svg, canvas).fail(function () {
            expect($(".rasterizeHTML_js_FirefoxWorkaround").length).toEqual(0);

            done();
        });

        imageInstance.onerror();
    });
});
