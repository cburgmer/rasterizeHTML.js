describe("Browser functions", function () {

    describe("executeJavascript", function () {
        var doc;

        var mockPromisesToResolveSynchronously = function () {
            spyOn(ayepromise, 'defer').and.callFake(testHelper.synchronousDefer);
        };

        var mockFinishNotifyingXHRProxy = function () {
            var fakeXhrProxy = jasmine.createSpyObj('finishNotifyingProxy', ['send', 'waitForRequestsToFinish']),
                defer = testHelper.synchronousDefer();

            fakeXhrProxy.waitForRequestsToFinish.and.returnValue(defer.promise);

            spyOn(xhrproxies, 'finishNotifying').and.returnValue(fakeXhrProxy);

            return defer;
        };

        beforeEach(function () {
            doc = window.document.implementation.createHTMLDocument("");
        });

        it("should load an URL and execute the included JS", function (done) {
            doc.documentElement.innerHTML = "<body><script>document.body.innerHTML = 'dynamic content';</script></body>";

            browser.executeJavascript(doc, undefined, 0).then(function (result) {
                expect(result.document.body.innerHTML).toEqual('dynamic content');

                done();
            });
        });

        it("should remove the iframe element when done", function (done) {
            doc.documentElement.innerHTML = "<body></body>";

            browser.executeJavascript(doc, undefined, 0).then(function () {
                expect($("iframe").length).toEqual(0);

                done();
            });
        });

        it("should wait a configured period of time before calling back", function (done) {
            doc.documentElement.innerHTML = "<body onload=\"setTimeout(function () {document.body.innerHTML = 'dynamic content';}, 1);\"></body>";

            browser.executeJavascript(doc, undefined, 20).then(function (result) {
                expect(result.document.body.innerHTML).toEqual('dynamic content');

                done();
            });
        });

        it("should return only when all ajax has loaded", function (done) {
            var callback = jasmine.createSpy('callback');

            mockPromisesToResolveSynchronously();
            var xhrFinishedDefer = mockFinishNotifyingXHRProxy();

            browser.executeJavascript(doc, undefined, 10).then(callback);

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

            browser.executeJavascript(doc, undefined, 0).then(callback);

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

            browser.executeJavascript(doc, undefined, 0).then(function (result) {
                expect(result.document.body.innerHTML).toEqual('20');

                done();
            });
        });

        it("should report failing JS", function (done) {
            doc.documentElement.innerHTML = "<body><script>undefinedVar.t = 42</script></body>";

            browser.executeJavascript(doc, undefined, 0).then(function (result) {
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

            browser.executeJavascript(doc, undefined, 0).then(function (result) {
                expect(result.document.body.innerHTML).toEqual('1');

                done();
            });
        });

        ifNotInPhantomJsIt("should be able to load content via AJAX from the correct url", function (done) {
            testHelper.readHTMLDocumentFixture('ajax.html').then(function (doc) {
                browser.executeJavascript(doc, testHelper.fixturesPath, 100).then(function (result) {
                    expect(result.document.querySelector('div').textContent.trim()).toEqual('The content');

                    done();
                });
            });
        });
    });

    describe("parseHTML", function () {
        var oldDOMParser = window.DOMParser;

        afterEach(function () {
            window.DOMParser = oldDOMParser;
        });

        it("should parse HTML to a document", function () {
            var dom = browser.parseHTML('<html><body>Text</body></html>');

            expect(dom.querySelector("body").textContent).toEqual("Text");
        });

        it("should keep 'html' tag attributes", function () {
            var dom = browser.parseHTML('<html top="attribute"></html>');

            expect(dom.documentElement.getAttribute('top')).toEqual('attribute');
        });

        it("should keep 'html' tag attributes even if DOMParser is not supported", function () {
            var dom;

            window.DOMParser = function () {
                this.parseFromString = function () {
                    return null;
                };
            };

            dom = browser.parseHTML('<html top="attribute"></html>');

            expect(dom.documentElement.getAttribute('top')).toEqual('attribute');
        });

        it("should deal with a missing 'html' tag", function () {
            browser.parseHTML('<div></div>');
        });
    });

    describe("validateXHTML", function () {
        it("should throw an exception if the document is invalid", function () {
            var error;
            try {
                browser.validateXHTML("<invalid document");
            } catch (e) {
                error = e;
            }

            expect(error).toEqual(jasmine.objectContaining({message: "Invalid source"}));
        });

        ifNotInPhantomJsIt("should throw an exception if the document is invalid because of a missing namespace", function () {
            var error;
            try {
                browser.validateXHTML("<html><weird:element></html>");
            } catch (e) {
                error = e;
            }

            expect(error).toEqual(jasmine.objectContaining({message: "Invalid source"}));
        });

        it("should pass on a valid document", function () {
            browser.validateXHTML("<b></b>");
        });
    });

    describe("calculateDocumentContentSize", function () {
        var doc,
            setHtml = function (html) {
                doc.documentElement.innerHTML = html;
            };

        beforeEach(function () {
            doc = document.implementation.createHTMLDocument('');
        });

        it("should return the content height of a document greater than the viewport height", function (done) {
            setHtml('<div style="height: 300px;"></div>');

            browser.calculateDocumentContentSize(doc, 300, 200).then(function (size) {
                expect(size.height).toEqual(316);

                done();
            });
        });

        it("should return the minimum height viewport", function (done) {
            setHtml('<div style="height: 100px;"></div>');

            browser.calculateDocumentContentSize(doc, 300, 200).then(function (size) {
                expect(size.height).toEqual(200);

                done();
            });
        });

        it("should return the minimum width of the viewport", function (done) {
            setHtml('<div>The content</div>');

            browser.calculateDocumentContentSize(doc, 300, 200).then(function (size) {
                expect(size.width).toEqual(300);

                done();
            });
        });

        it("should return width greater than viewport width", function (done) {
            setHtml('<div style="width: 400px; height: 10px;"></div>');

            browser.calculateDocumentContentSize(doc, 300, 200).then(function (size) {
                expect(size.width).toEqual(408);

                done();
            });
        });

        it("should remove the iframe when done calculating", function (done) {
            setHtml('<div>The content</div>');

            browser.calculateDocumentContentSize(doc, 300, 200).then(function () {
                expect($('iframe').length).toEqual(0);

                done();
            });
        });

        it("should not execute JavaScript", function (done) {
            setHtml('<div></div><script>document.querySelector("div").style.height="100";</script>');

            browser.calculateDocumentContentSize(doc, 300, 10).then(function (size) {
                expect(size.height).toEqual(10);

                done();
            });
        });
    });

    describe("loadDocument", function () {
        it("should load document from a URL", function (done) {
            browser.loadDocument(testHelper.fixturesPath + "test.html", {}).then(function (doc) {
                expect(doc.querySelector('title').textContent).toEqual("Test page with full resource includes");

                done();
            });
        });

        it("should error on failing URL", function (done) {
            browser.loadDocument(testHelper.fixturesPath + "non_existing_url.html", {}).fail(function (e) {
                expect(e).toEqual({message: "Unable to load page"});

                done();
            });
        });

        // Seems to be generally broken, see https://github.com/cburgmer/rasterizeHTML.js/issues/51
        ifNotInWebkitIt("should error on failing parse", function (done) {
            browser.loadDocument(testHelper.fixturesPath + "invalidInput.html", {}).fail(function (e) {
                expect(e).toEqual({message: "Invalid source"});

                done();
            });
        });

        describe("options", function () {
            var ajaxRequest;

            beforeEach(function () {
                ajaxRequest = jasmine.createSpyObj("ajaxRequest", ["open", "addEventListener", "overrideMimeType", "send"]);
                spyOn(window, "XMLHttpRequest").and.returnValue(ajaxRequest);

                spyOn(util, "joinUrl").and.callFake(function (baseUrl, url) {
                    return baseUrl ? baseUrl + url : url;
                });
            });

            it("should attach an unique parameter to the given URL to circumvent caching if requested", function () {
                browser.loadDocument("non_existing_url.html", {cache: 'none'});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', jasmine.any(String), true);
                expect(ajaxRequest.open.calls.mostRecent().args[1]).toMatch(/^non_existing_url.html\?_=[0123456789]+$/);
            });

            it("should attach an unique parameter to the given URL to circumvent caching if requested (legacy: 'false')", function () {
                browser.loadDocument("non_existing_url.html", {cache: false});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', jasmine.any(String), true);
                expect(ajaxRequest.open.calls.mostRecent().args[1]).toMatch(/^non_existing_url.html\?_=[0123456789]+$/);
            });

            it("should not attach an unique parameter to the given URL by default", function () {
                browser.loadDocument("non_existing_url.html", {});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', "non_existing_url.html", true);
            });

            it("should allow caching for repeated calls if requested", function () {
                var dateNowSpy = spyOn(window.Date, 'now').and.returnValue(42);

                browser.loadDocument("non_existing_url.html", {cache: 'none'});

                expect(ajaxRequest.open.calls.mostRecent().args[1]).toEqual('non_existing_url.html?_=42');

                ajaxRequest.open.calls.reset();
                dateNowSpy.and.returnValue(43);
                browser.loadDocument("non_existing_url.html", {cache: 'repeated'});
                expect(ajaxRequest.open.calls.mostRecent().args[1]).toEqual('non_existing_url.html?_=42');

                expect(dateNowSpy.calls.count()).toEqual(1);
            });

            it("should not cache repeated calls by default", function () {
                var dateNowSpy = spyOn(window.Date, 'now').and.returnValue(42);
                browser.loadDocument("non_existing_url.html", {cache: 'none'});

                expect(ajaxRequest.open.calls.mostRecent().args[1]).toEqual('non_existing_url.html?_=42');

                ajaxRequest.open.calls.reset();
                dateNowSpy.and.returnValue(43);
                browser.loadDocument("non_existing_url.html", {cache: 'none'});
                expect(ajaxRequest.open.calls.mostRecent().args[1]).toEqual('non_existing_url.html?_=43');
            });

            it("should load URLs relative to baseUrl", function () {
                browser.loadDocument("relative/url.html", {baseUrl: "http://example.com/"});

                expect(ajaxRequest.open.calls.mostRecent().args[1]).toEqual('http://example.com/relative/url.html');

                expect(util.joinUrl).toHaveBeenCalledWith("http://example.com/", "relative/url.html");
            });
        });
    });
});
