describe("Utilities function", function () {
    // TODO tests for log and getConstantUniqueIdFor

    describe("executeJavascript", function () {
        var doc;

        beforeEach(function () {
            doc = window.document.implementation.createHTMLDocument("");
        });

        it("should load an URL and execute the included JS", function () {
            var the_result = null;

            doc.documentElement.innerHTML = "<body><script>document.body.innerHTML = 'dynamic content';</script></body>";
            rasterizeHTML.util.executeJavascript(doc, 0, function (result) {
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

            doc.documentElement.innerHTML = "<body></body>";
            rasterizeHTML.util.executeJavascript(doc, 0, function () {
                finished = true;
            });

            waitsFor(function () {
                return finished;
            });

            runs(function () {
                expect($("iframe")).not.toExist();
            });
        });

        it("should wait a configured period of time before calling back", function () {
            var the_result = null;

            doc.documentElement.innerHTML = "<body onload=\"setTimeout(function () {document.body.innerHTML = 'dynamic content';}, 1);\"></body>";
            rasterizeHTML.util.executeJavascript(doc, 20, function (result) {
                the_result = result;
            });

            waitsFor(function () {
                return the_result !== null;
            });

            runs(function () {
                expect(the_result.body.innerHTML).toEqual('dynamic content');
            });
        });

        it("should be able to access CSS", function () {
            var the_result = null;

            doc.documentElement.innerHTML = '<head><style>div { height: 20px; }</style></head><body onload="var elem = document.getElementById(\'elem\'); document.body.innerHTML = elem.offsetHeight;"><div id="elem"></div></body>';
            rasterizeHTML.util.executeJavascript(doc, 0, function (result) {
                the_result = result;
            });

            waitsFor(function () {
                return the_result !== null;
            });

            runs(function () {
                expect(the_result.body.innerHTML).toEqual('20');
            });
        });

        it("should report failing JS", function () {
            var errors = null;

            doc.documentElement.innerHTML = "<body><script>undefinedVar.t = 42</script></body>";
            rasterizeHTML.util.executeJavascript(doc, 0, function (result, theErrors) {
                errors = theErrors;
            });

            waitsFor(function () {
                return errors !== null;
            });

            runs(function () {
                expect(errors).toEqual([{
                    resourceType: "scriptExecution",
                    msg: jasmine.any(String)
                }]);
                expect(errors[0].msg).toMatch(/ReferenceError:\s+(.+\s+)?undefinedVar/);
            });
        });

        it("should be able to access top 'html' tag attributes", function () {
            var the_result = null;

            doc.documentElement.innerHTML = '<head></head><body onload="document.body.innerHTML = document.querySelectorAll(\'[myattr]\').length;"></body>';
            doc.documentElement.setAttribute('myattr', 'myvalue');

            rasterizeHTML.util.executeJavascript(doc, 0, function (result) {
                the_result = result;
            });

            waitsFor(function () {
                return the_result !== null;
            });

            runs(function () {
                expect(the_result.body.innerHTML).toEqual('1');
            });
        });
    });

    describe("parseHTML", function () {
        var oldDOMParser = window.DOMParser;

        afterEach(function () {
            window.DOMParser = oldDOMParser;
        });

        it("should parse HTML to a document", function () {
            var dom = rasterizeHTML.util.parseHTML('<html><body>Text</body></html>');

            expect(dom.querySelector("body").textContent).toEqual("Text");
        });

        it("should keep 'html' tag attributes", function () {
            var dom = rasterizeHTML.util.parseHTML('<html top="attribute"></html>');

            expect(dom.documentElement.getAttribute('top')).toEqual('attribute');
        });

        it("should keep 'html' tag attributes even if DOMParser is not supported", function () {
            var dom;

            window.DOMParser = function () {
                this.parseFromString = function () {
                    return null;
                };
            };

            dom = rasterizeHTML.util.parseHTML('<html top="attribute"></html>');

            expect(dom.documentElement.getAttribute('top')).toEqual('attribute');
        });

        it("should deal with a missing 'html' tag", function () {
            rasterizeHTML.util.parseHTML('<div></div>');
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
            var params = rasterizeHTML.util.parseOptionalParameters([canvas, options, callback]);
            expect(params.options).toEqual(options);
            expect(params.options).not.toBe(options);
        });

        it("should return all parameters", function () {
            var params = rasterizeHTML.util.parseOptionalParameters([canvas, options, callback]);
            expect(params.canvas).toBe(canvas);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(callback);
        });

        it("should deal with a null canvas", function () {
            var params = rasterizeHTML.util.parseOptionalParameters([null, options, callback]);
            expect(params.canvas).toBe(null);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(callback);
        });

        it("should make canvas optional", function () {
            var params = rasterizeHTML.util.parseOptionalParameters([options, callback]);
            expect(params.canvas).toBe(null);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(callback);
        });

        it("should make options optional", function () {
            var params = rasterizeHTML.util.parseOptionalParameters([canvas, callback]);
            expect(params.canvas).toBe(canvas);
            expect(params.options).toEqual({});
            expect(params.callback).toBe(callback);
        });

        it("should make callback optional", function () {
            var params = rasterizeHTML.util.parseOptionalParameters([canvas, options]);
            expect(params.canvas).toBe(canvas);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(null);
        });

        it("should work with canvas only", function () {
            var params = rasterizeHTML.util.parseOptionalParameters([canvas]);
            expect(params.canvas).toBe(canvas);
            expect(params.options).toEqual({});
            expect(params.callback).toBe(null);
        });

        it("should work with options only", function () {
            var params = rasterizeHTML.util.parseOptionalParameters([options]);
            expect(params.canvas).toBe(null);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(null);
        });

        it("should work with callback only", function () {
            var params = rasterizeHTML.util.parseOptionalParameters([callback]);
            expect(params.canvas).toBe(null);
            expect(params.options).toEqual({});
            expect(params.callback).toBe(callback);
        });

        it("should work with empty parameter list", function () {
            var params = rasterizeHTML.util.parseOptionalParameters([]);
            expect(params.canvas).toBe(null);
            expect(params.options).toEqual({});
            expect(params.callback).toBe(null);
        });

    });

    describe("loadDocument", function () {
        it("should load document from a URL", function () {
            var doc;
            rasterizeHTML.util.loadDocument(jasmine.getFixtures().fixturesPath + "test.html", {}, function (document) {
                doc = document;
            });

            waitsFor(function () {
                return doc !== undefined;
            });

            runs(function () {
                expect(doc.querySelector('title').textContent).toEqual("Test page with full resource includes");
            });
        });

        it("should call error callback on fail", function () {
            var successCallback = jasmine.createSpy('successCallback'),
                errorCallback = jasmine.createSpy('errorCallback');

            rasterizeHTML.util.loadDocument(jasmine.getFixtures().fixturesPath + "non_existing_url.html", {}, successCallback, errorCallback);

            waitsFor(function () {
                return errorCallback.wasCalled;
            });

            runs(function () {
                expect(errorCallback).toHaveBeenCalled();
                expect(successCallback).not.toHaveBeenCalled();
            });
        });

        describe("options", function () {
            var ajaxRequest;

            beforeEach(function () {
                ajaxRequest = jasmine.createSpyObj("ajaxRequest", ["open", "addEventListener", "overrideMimeType", "send"]);
                spyOn(window, "XMLHttpRequest").andReturn(ajaxRequest);

                spyOn(rasterizeHTMLInline.util, "joinUrl").andCallFake(function (baseUrl, url) {
                    return baseUrl ? baseUrl + url : url;
                });
            });

            it("should attach an unique parameter to the given URL to circumvent caching if requested", function () {
                rasterizeHTML.util.loadDocument("non_existing_url.html", {cache: 'none'}, function () {}, function () {});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', jasmine.any(String), true);
                expect(ajaxRequest.open.mostRecentCall.args[1]).toMatch(/^non_existing_url.html\?_=[0123456789]+$/);
            });

            it("should attach an unique parameter to the given URL to circumvent caching if requested (legacy: 'false')", function () {
                rasterizeHTML.util.loadDocument("non_existing_url.html", {cache: false}, function () {}, function () {});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', jasmine.any(String), true);
                expect(ajaxRequest.open.mostRecentCall.args[1]).toMatch(/^non_existing_url.html\?_=[0123456789]+$/);
            });

            it("should not attach an unique parameter to the given URL by default", function () {
                rasterizeHTML.util.loadDocument("non_existing_url.html", {}, function () {}, function () {});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', "non_existing_url.html", true);
            });

            it("should allow caching for repeated calls if requested", function () {
                var dateNowSpy = spyOn(window.Date, 'now').andReturn(42);

                rasterizeHTML.util.loadDocument("non_existing_url.html", {cache: 'none'}, function () {}, function () {});

                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=42');

                dateNowSpy.andReturn(43);
                rasterizeHTML.util.loadDocument("non_existing_url.html", {cache: 'repeated'}, function () {}, function () {});
                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=42');

                expect(dateNowSpy.callCount).toEqual(1);
            });

            it("should not cache repeated calls by default", function () {
                var dateNowSpy = spyOn(window.Date, 'now').andReturn(42);
                rasterizeHTML.util.loadDocument("non_existing_url.html", {cache: 'none'}, function () {}, function () {});

                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=42');

                dateNowSpy.andReturn(43);
                rasterizeHTMLInline.util.ajax("non_existing_url.html", {cache: 'none'}, function () {}, function () {});
                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=43');
            });

            it("should load URLs relative to baseUrl", function () {
                rasterizeHTML.util.loadDocument("relative/url.html", {baseUrl: "http://example.com/"}, function () {}, function () {});

                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('http://example.com/relative/url.html');

                expect(rasterizeHTMLInline.util.joinUrl).toHaveBeenCalledWith("http://example.com/", "relative/url.html");
            });
        });
    });
});
