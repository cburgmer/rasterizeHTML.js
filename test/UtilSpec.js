describe("Utilities function", function () {
    // TODO tests for log and getConstantUniqueIdFor

    describe("executeJavascript", function () {
        var doc;

        beforeEach(function () {
            doc = window.document.implementation.createHTMLDocument("");
            doc.documentElement.innerHTML = "<html><body><script>document.body.innerHTML = 'dynamic content';</script></body></html>";
        });

        it("should load an URL and execute the included JS", function () {
            var the_result = null;

            rasterizeHTML.util.executeJavascript(doc, function (result) {
                the_result = result;
            });

            waitsFor(function () {
                return the_result !== null;
            });

            runs(function () {
                expect(the_result.body.innerHTML).toEqual('dynamic content');
            });
        });

        it("should remove the iframe element when done", function () {
            var finished = false;

            rasterizeHTML.util.executeJavascript(doc, function () {
                finished = true;
            });

            waitsFor(function () {
                return finished;
            });

            runs(function () {
                expect($("iframe")).not.toExist();
            });
        });
    });

    describe("parseOptionalParameters", function () {
        var canvas, options, callback;

        beforeEach(function () {
            canvas = document.createElement("canvas");
            options = {opt: "ions"};
            callback = jasmine.createSpy("callback");
        });

        it("should copy options", function () {
            var params = rasterizeHTML.util.parseOptionalParameters(canvas, options, callback);
            expect(params.options).toEqual(options);
            expect(params.options).not.toBe(options);
        });

        it("should return all parameters", function () {
            var params = rasterizeHTML.util.parseOptionalParameters(canvas, options, callback);
            expect(params.canvas).toBe(canvas);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(callback);
        });

        it("should deal with a null canvas", function () {
            var params = rasterizeHTML.util.parseOptionalParameters(null, options, callback);
            expect(params.canvas).toBe(null);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(callback);
        });

        it("should make canvas optional", function () {
            var params = rasterizeHTML.util.parseOptionalParameters(options, callback);
            expect(params.canvas).toBe(null);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(callback);
        });

        it("should make options optional", function () {
            var params = rasterizeHTML.util.parseOptionalParameters(canvas, callback);
            expect(params.canvas).toBe(canvas);
            expect(params.options).toEqual({});
            expect(params.callback).toBe(callback);
        });

        it("should make callback optional", function () {
            var params = rasterizeHTML.util.parseOptionalParameters(canvas, options);
            expect(params.canvas).toBe(canvas);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(null);
        });

        it("should work with canvas only", function () {
            var params = rasterizeHTML.util.parseOptionalParameters(canvas);
            expect(params.canvas).toBe(canvas);
            expect(params.options).toEqual({});
            expect(params.callback).toBe(null);
        });

        it("should work with options only", function () {
            var params = rasterizeHTML.util.parseOptionalParameters(options);
            expect(params.canvas).toBe(null);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(null);
        });

        it("should work with callback only", function () {
            var params = rasterizeHTML.util.parseOptionalParameters(callback);
            expect(params.canvas).toBe(null);
            expect(params.options).toEqual({});
            expect(params.callback).toBe(callback);
        });

        it("should work with empty parameter list", function () {
            var params = rasterizeHTML.util.parseOptionalParameters();
            expect(params.canvas).toBe(null);
            expect(params.options).toEqual({});
            expect(params.callback).toBe(null);
        });

    });
});
