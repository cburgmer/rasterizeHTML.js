describe("Pre-rendering", function () {

    describe("prerender", function () {
        var doc;

        var mockPromisesToResolveSynchronously = function () {
            spyOn(ayepromise, 'defer').and.callFake(testHelper.synchronousDefer);
        };

        var mockFinishNotifyingXHRProxy = function () {
            var fakeXhrProxy = jasmine.createSpyObj('finishNotifyingXhrProxy', ['send', 'waitForRequestsToFinish']),
                defer = testHelper.synchronousDefer();

            fakeXhrProxy.waitForRequestsToFinish.and.returnValue(defer.promise);

            spyOn(proxies, 'finishNotifyingXhr').and.returnValue(fakeXhrProxy);

            return defer;
        };

        var defaultOptionsWithViewport = function (width, height) {
            return {
                width: width || 12,
                height: height || 34,
                baseUrl: testHelper.fixturesPath,
                executeJs: true
            };
        };

        var defaultOptionsWithTimeout = function (timeout) {
            return {
                baseUrl: undefined,
                executeJs: true,
                executeJsTimeout: timeout,
                width: 12,
                height: 34
            };
        };

        var optionsWithViewport = function (width, height) {
            return {
                width: width || 12,
                height: height || 34,
                executeJs: true,
                executeJsTimeout: 10
            };
        };

        beforeEach(function () {
            doc = window.document.implementation.createHTMLDocument("");
        });

        describe("JavaScript execution", function () {
            it("should load an URL and execute the included JS", function (done) {
                doc.documentElement.innerHTML = "<body><script>document.body.innerHTML = 'dynamic content';</script></body>";

                prerender.prerender(doc, defaultOptionsWithViewport()).then(function (result) {
                    expect(result.document.body.innerHTML).toEqual('dynamic content');

                    done();
                });
            });

            it("should remove the iframe element when done", function (done) {
                doc.documentElement.innerHTML = "<body></body>";

                prerender.prerender(doc, defaultOptionsWithViewport()).then(function () {
                    expect($("iframe").length).toEqual(0);

                    done();
                });
            });

            it("should wait a configured period of time before calling back", function (done) {
                doc.documentElement.innerHTML = "<body onload=\"setTimeout(function () {document.body.innerHTML = 'dynamic content';}, 1);\"></body>";

                prerender.prerender(doc, defaultOptionsWithTimeout(20)).then(function (result) {
                    expect(result.document.body.innerHTML).toEqual('dynamic content');

                    done();
                });
            });

            it("should return only when all ajax has loaded", function (done) {
                var callback = jasmine.createSpy('callback');

                mockPromisesToResolveSynchronously();
                var xhrFinishedDefer = mockFinishNotifyingXHRProxy();

                prerender.prerender(doc, defaultOptionsWithTimeout(10)).then(callback);

                // HACK fragile test. We need to wait for the iframe.onload to be triggered
                setTimeout(function () {
                    expect(callback).not.toHaveBeenCalled();

                    xhrFinishedDefer.resolve();

                    expect(callback).toHaveBeenCalled();

                    done();
                }, 100);
            });

            it("should return only when all ajax has loaded, even if timeout is set to 0", function (done) {
                var callback = jasmine.createSpy('callback');

                mockPromisesToResolveSynchronously();
                var xhrFinishedDefer = mockFinishNotifyingXHRProxy();

                prerender.prerender(doc, defaultOptionsWithViewport()).then(callback);

                // HACK fragile test. We need to wait for the iframe.onload to be triggered
                setTimeout(function () {
                    expect(callback).not.toHaveBeenCalled();

                    xhrFinishedDefer.resolve();

                    expect(callback).toHaveBeenCalled();

                    done();
                }, 100);
            });

            it("should be able to access CSS", function (done) {
                doc.documentElement.innerHTML = '<head><style>div { height: 20px; }</style></head><body onload="var elem = document.getElementById(\'elem\'); document.body.innerHTML = elem.offsetHeight;"><div id="elem"></div></body>';

                prerender.prerender(doc, defaultOptionsWithViewport()).then(function (result) {
                    expect(result.document.body.innerHTML).toEqual('20');

                    done();
                });
            });

            it("should report failing JS", function (done) {
                doc.documentElement.innerHTML = "<body><script>undefinedVar.t = 42</script></body>";

                prerender.prerender(doc, defaultOptionsWithViewport()).then(function (result) {
                    expect(result.errors).toEqual([{
                        resourceType: "scriptExecution",
                        msg: jasmine.any(String)
                    }]);
                    expect(result.errors[0].msg).toMatch(/ReferenceError:\s+(.+\s+)?undefinedVar/);

                    done();
                });
            });

            it("should be able to access top 'html' tag attributes", function (done) {
                doc.documentElement.innerHTML = '<head></head><body onload="document.body.innerHTML = document.querySelectorAll(\'[myattr]\').length;"></body>';
                doc.documentElement.setAttribute('myattr', 'myvalue');

                prerender.prerender(doc, defaultOptionsWithViewport()).then(function (result) {
                    expect(result.document.body.innerHTML).toEqual('1');

                    done();
                });
            });

            ifNotInPhantomJsIt("should be able to load content via AJAX from the correct url", function (done) {
                testHelper.readHTMLDocumentFixture('ajax.html').then(function (doc) {
                    prerender.prerender(doc, defaultOptionsWithViewport()).then(function (result) {
                        expect(result.document.querySelector('div').textContent.trim()).toEqual('The content');

                        done();
                    });
                });
            });

            it("should load images relative to base URL", function (done) {
                doc.documentElement.innerHTML = '<body><script>var i = new Image(); i.onload=function () { document.body.innerHTML = "1"; }; i.setAttribute("src", "green.png");</script></body>';

                prerender.prerender(doc, defaultOptionsWithViewport()).then(function (result) {
                    expect(result.document.body.innerHTML).toEqual('1');

                    done();
                });
            });

            ifNotInPhantomJsIt("should support window.matchMedia() with 'width' media queries", function (done) {
                doc.documentElement.innerHTML = '<body onload="setTimeout(function () {document.body.innerHTML = window.matchMedia(\'(min-width: 30px)\').matches; }, 0);"></body>';

                prerender.prerender(doc, optionsWithViewport(42, 21)).then(function (result) {
                    expect(result.document.body.innerHTML).toEqual('true');

                    done();
                });
            });

            ifNotInPhantomJsIt("should support window.matchMedia() with 'height' media queries", function (done) {
                doc.documentElement.innerHTML = '<body onload="setTimeout(function () {document.body.innerHTML = window.matchMedia(\'(min-height: 123px)\').matches; }, 0);"></body>';

                prerender.prerender(doc, optionsWithViewport(10, 123)).then(function (result) {
                    expect(result.document.body.innerHTML).toEqual('true');

                    done();
                });
            });

            it("should correctly set canvas size for media queries", function (done) {
                doc.documentElement.innerHTML = '<body onload="document.body.innerHTML = window.matchMedia(\'(max-height: 123px)\').matches;"></body>';

                prerender.prerender(doc, defaultOptionsWithViewport(20, 123)).then(function (result) {
                    expect(result.document.body.innerHTML).toEqual('true');

                    done();
                });
            });
        });

        describe("Content size calculation", function () {
            var doc,
                setHtml = function (html) {
                    doc.documentElement.innerHTML = html;
                },
                setElementWithSize = function (size) {
                    var width = size.width ? 'width: ' + size.width + 'px;' : '',
                        height = size.height? 'height: ' + size.height + 'px;' : '',
                        element = '<div style="' + width + height + '">content</div>';

                    setHtml('<style>* { padding: 0; margin: 0; }</style>' + element);
                };

            beforeEach(function () {
                doc = document.implementation.createHTMLDocument('');
            });

            it("should return the content height of a document greater than the viewport height", function (done) {
                setElementWithSize({height: 300});

                prerender.prerender(doc, {width: 300, height: 200}).then(function (result) {
                    expect(result.size.height).toEqual(300);
                    expect(result.size.viewportHeight).toEqual(300);

                    done();
                });
            });

            it("should return the minimum height viewport", function (done) {
                setElementWithSize({height: 100});

                prerender.prerender(doc, {width: 300, height: 200}).then(function (result) {
                    expect(result.size.height).toEqual(200);
                    expect(result.size.viewportHeight).toEqual(200);

                    done();
                });
            });

            it("should return the minimum width of the viewport", function (done) {
                setElementWithSize({});

                prerender.prerender(doc, {width: 300, height: 200}).then(function (result) {
                    expect(result.size.width).toEqual(300);
                    expect(result.size.viewportWidth).toEqual(300);

                    done();
                });
            });

            it("should return width greater than viewport width", function (done) {
                setElementWithSize({width: 400, height: 10});

                prerender.prerender(doc, {width: 300, height: 200}).then(function (result) {
                    expect(result.size.width).toEqual(400);
                    expect(result.size.viewportWidth).toEqual(400);

                    done();
                });
            });

            it("should calculate the document's root font size", function (done) {
                setHtml('<style>html { font-size: 4711px; }</style>');

                prerender.prerender(doc, {width: 300, height: 200}).then(function (result) {
                    expect(result.size.rootFontSize).toBe('4711px');

                    done();
                });
            });

            it("should remove the iframe when done calculating", function (done) {
                setElementWithSize({});

                prerender.prerender(doc, {width: 300, height: 200}).then(function () {
                    expect($('iframe').length).toEqual(0);

                    done();
                });
            });

            it("should not execute JavaScript by default", function (done) {
                setHtml('<div></div><script>document.querySelector("div").style.height="100";</script>');

                prerender.prerender(doc, {width: 300, height: 10}).then(function (result) {
                    expect(result.size.height).toEqual(10);

                    done();
                });
            });

            it("should calculate height after JavaScript executed", function (done) {
                setHtml('<style>* { margin: 0; }</style>' +
                        '<div></div><script>document.querySelector("div").style.height="100";</script>');

                prerender.prerender(doc, {width: 300, height: 10, executeJs: true}).then(function (result) {
                    expect(result.size.height).toEqual(100);

                    done();
                });
            });

            describe("zooming", function () {
                it("should report half the viewport size for a zoom of 2", function (done) {
                    setElementWithSize({});

                    prerender.prerender(doc, {width: 300, height: 200, zoom: 2}).then(function (result) {
                        expect(result.size.viewportWidth).toEqual(150);
                        expect(result.size.viewportHeight).toEqual(100);

                        done();
                    });
                });

                it("should ignore a zoom level of 0", function (done) {
                    setElementWithSize({});

                    prerender.prerender(doc, {width: 300, height: 200, zoom: 0}).then(function (result) {
                        expect(result.size.viewportWidth).toEqual(300);
                        expect(result.size.viewportHeight).toEqual(200);

                        done();
                    });
                });

                it("should increase viewport width for wider element", function (done) {
                    setElementWithSize({width: 160});

                    prerender.prerender(doc, {width: 300, height: 200, zoom: 2}).then(function (result) {
                        expect(result.size.viewportWidth).toEqual(160);
                        expect(result.size.width).toEqual(320);

                        done();
                    });
                });

                it("should increase viewport height for higher element", function (done) {
                    setElementWithSize({height: 120});

                    prerender.prerender(doc, {width: 300, height: 200, zoom: 2}).then(function (result) {
                        expect(result.size.viewportHeight).toEqual(120);
                        expect(result.size.height).toEqual(240);

                        done();
                    });
                });

                it("should deal with fractions in scaling", function (done) {
                    setElementWithSize({});

                    prerender.prerender(doc, {width: 200, height: 200, zoom: 3}).then(function (result) {
                        expect(result.size.viewportWidth).toEqual(66); // not 66.6 or 67
                        expect(result.size.width).toEqual(200); // not 3*66=198 or 3*67 = 201

                        expect(result.size.viewportHeight).toEqual(66);
                        expect(result.size.height).toEqual(200);

                        done();
                    });
                });
            });

            describe("element selection", function () {
                beforeEach(function () {
                    setHtml('<style>* { padding: 0; margin: 0; }</style>' +
                            '<div style="width: 200px; height: 300px; padding: 12px 0 0 34px; -moz-box-sizing: border-box; box-sizing: border-box;">' +
                            '<span style="display: inline-block; width: 123px; height: 234px;"></span>' +
                            '</div>');
                });

                it("should report the left offset", function (done) {
                    prerender.prerender(doc, {width: 100, height: 10, clip: 'span'}).then(function (result) {
                        expect(result.size.left).toEqual(34);

                        done();
                    });
                });

                it("should report the top offset", function (done) {
                    prerender.prerender(doc, {width: 100, height: 10, clip: 'span'}).then(function (result) {
                        expect(result.size.top).toEqual(12);

                        done();
                    });
                });

                it("should report the width", function (done) {
                    prerender.prerender(doc, {width: 100, height: 10, clip: 'span'}).then(function (result) {
                        expect(result.size.width).toEqual(123);

                        done();
                    });
                });

                it("should report the height", function (done) {
                    prerender.prerender(doc, {width: 100, height: 10, clip: 'span'}).then(function (result) {
                        expect(result.size.height).toEqual(234);

                        done();
                    });
                });

                it("should report the canvas width and height", function (done) {
                    prerender.prerender(doc, {width: 100, height: 10, clip: 'span'}).then(function (result) {
                        expect(result.size.viewportWidth).toEqual(200);
                        expect(result.size.viewportHeight).toEqual(300);

                        done();
                    });
                });

                it("should match the html dom node", function (done) {
                    prerender.prerender(doc, {width: 200, height: 10, clip: 'html'}).then(function (result) {
                        expect(result.size.width).toEqual(200);
                        expect(result.size.height).toEqual(300);

                        done();
                    });
                });

                it("should throw an error when the selector is not found", function (done) {
                    prerender.prerender(doc, {width: 100, height: 10, clip: 'a'}).then(null, function (e) {
                        expect(e).toEqual(jasmine.objectContaining({
                            message: "Clipping selector not found"
                        }));

                        done();
                    });
                });

                it("should remove the iframe when the selector is not found", function (done) {
                    prerender.prerender(doc, {width: 100, height: 10, clip: 'a'}).then(null, function () {
                        expect($('iframe').length).toBe(0);

                        done();
                    });
                });
            });
        });
    });

});
