describe("Utilities function", function () {
    // TODO tests for log and getConstantUniqueIdFor

    describe("executeJavascript", function () {
        var doc;

        beforeEach(function () {
            doc = window.document.implementation.createHTMLDocument("");
        });

        it("should load an URL and execute the included JS", function (done) {
            doc.documentElement.innerHTML = "<body><script>document.body.innerHTML = 'dynamic content';</script></body>";

            rasterizeHTML.util.executeJavascript(doc, undefined, 0).then(function (result) {
                expect(result.document.body.innerHTML).toEqual('dynamic content');

                done();
            });
        });

        it("should remove the iframe element when done", function (done) {
            doc.documentElement.innerHTML = "<body></body>";

            rasterizeHTML.util.executeJavascript(doc, undefined, 0).then(function () {
                expect($("iframe")).not.toExist();

                done();
            });
        });

        it("should wait a configured period of time before calling back", function (done) {
            doc.documentElement.innerHTML = "<body onload=\"setTimeout(function () {document.body.innerHTML = 'dynamic content';}, 1);\"></body>";

            rasterizeHTML.util.executeJavascript(doc, undefined, 20).then(function (result) {
                expect(result.document.body.innerHTML).toEqual('dynamic content');

                done();
            });
        });

        it("should be able to access CSS", function (done) {
            doc.documentElement.innerHTML = '<head><style>div { height: 20px; }</style></head><body onload="var elem = document.getElementById(\'elem\'); document.body.innerHTML = elem.offsetHeight;"><div id="elem"></div></body>';

            rasterizeHTML.util.executeJavascript(doc, undefined, 0).then(function (result) {
                expect(result.document.body.innerHTML).toEqual('20');

                done();
            });
        });

        it("should report failing JS", function (done) {
            doc.documentElement.innerHTML = "<body><script>undefinedVar.t = 42</script></body>";

            rasterizeHTML.util.executeJavascript(doc, undefined, 0).then(function (result) {
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

            rasterizeHTML.util.executeJavascript(doc, undefined, 0).then(function (result) {
                expect(result.document.body.innerHTML).toEqual('1');

                done();
            });
        });

        ifNotInPhantomJsIt("should be able to load content via AJAX from the correct url", function (done) {
            rasterizeHTMLTestHelper.readHTMLDocumentFixture('ajax.html', function (doc) {
                rasterizeHTML.util.executeJavascript(doc, jasmine.getFixtures().fixturesPath, 100).then(function (result) {
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

    describe("persistInputValues", function () {
        var doc,
            setHtml = function (html) {
                doc.documentElement.innerHTML = html;
            };

        beforeEach(function () {
            doc = document.implementation.createHTMLDocument('');
        });

        it("should persist a text input's value", function () {
            setHtml('<input type="text">');

            doc.querySelector('input').value = 'my value';

            rasterizeHTML.util.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/value="my value"/);
        });

        it("should persist a deleted text input's value", function () {
            setHtml('<input type="text" value="original value">');
            doc.querySelector('input').value = '';

            rasterizeHTML.util.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/value=""/);
        });

        it("should keep a text input value if not changed", function () {
            setHtml('<input type="text" value="original value">');

            rasterizeHTML.util.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/value="original value"/);
        });

        it("should persist a checked checkbox", function () {
            setHtml('<input value="pizza" type="checkbox">');

            doc.querySelector('input').checked = true;

            rasterizeHTML.util.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/checked="(checked)?"/);
        });

        it("should persist an unchecked checkbox", function () {
            setHtml('<input value="pizza" type="checkbox" checked="checked">');

            doc.querySelector('input').checked = false;

            rasterizeHTML.util.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).not.toMatch(/checked/);
        });

        it("should persist a radio button", function () {
            setHtml('<input value="pizza" type="radio">');

            doc.querySelector('input').checked = true;

            rasterizeHTML.util.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/checked="(checked)?"/);
        });

        it("should persist a textarea", function () {
            setHtml('<textarea>This is text</textarea>');

            doc.querySelector('textarea').value = "Some new value";

            rasterizeHTML.util.persistInputValues(doc);

            expect(doc.querySelector('textarea').outerHTML).toMatch(/<textarea>Some new value<\/textarea>/);
        });

        it("should handle a file input", function () {
            setHtml('<input type="file">');

            rasterizeHTML.util.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/type="file"/);
        });
    });

    describe("rewriteStyleRuleSelector", function () {
        var doc,
            setHtml = function (html) {
                doc.documentElement.innerHTML = html;
            };

        beforeEach(function () {
            doc = document.implementation.createHTMLDocument('');
        });

        it("should rewrite CSS rules with the new selector", function () {
            setHtml('<head><style type="text/css">a:hover { color: blue; }</style></head><body><span></span></body>');

            rasterizeHTML.util.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');

            expect(doc.querySelector('style').textContent).toMatch(/a.myFakeHover \{\s*color: blue;\s*\}/);
        });

        it("should correctly handle complex selectors", function () {
            setHtml('<style type="text/css">body:hover span { color: blue; }</style>');

            rasterizeHTML.util.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');

            expect(doc.querySelector('style').textContent).toMatch(/body.myFakeHover span \{\s*color: blue;\s*\}/);
        });

        it("should correctly handle simple selector occurrence", function () {
            setHtml('<style type="text/css">:hover { color: blue; }</style>');

            rasterizeHTML.util.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');

            expect(doc.querySelector('style').textContent).toMatch(/.myFakeHover \{\s*color: blue;\s*\}/);
        });

        it("should not match partial selector occurrence", function () {
            setHtml('<style type="text/css">.myClass { color: blue; }</style>');

            rasterizeHTML.util.rewriteStyleRuleSelector(doc, '.my', '.myFakeHover');

            expect(doc.querySelector('style').textContent).toMatch(/.myClass \{\s*color: blue;\s*\}/);
        });

        it("should correctly handle multiple selector occurrence in same rule selector", function () {
            setHtml('<style type="text/css">i:hover, a:hover { color: blue; }</style>');

            rasterizeHTML.util.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');

            expect(doc.querySelector('style').textContent).toMatch(/i.myFakeHover, a.myFakeHover \{\s*color: blue;\s*\}/);
        });

        it("should correctly handle multiple sub-selector", function () {
            setHtml('<style type="text/css">i:active::after { color: blue; }</style>');

            rasterizeHTML.util.rewriteStyleRuleSelector(doc, ':active', '.myFakeActive');

            expect(doc.querySelector('style').textContent).toMatch(/i.myFakeActive::?after \{\s*color: blue;\s*\}/);
        });

        it("should correctly handle multiple selector occurrences in different rules", function () {
            setHtml('<style type="text/css">a:active {color: green;}i:active { color: blue; }</style>');

            rasterizeHTML.util.rewriteStyleRuleSelector(doc, ':active', '.myFakeActive');

            expect(doc.querySelector('style').textContent).toMatch(/i.myFakeActive \{\s*color: blue;\s*\}/);
        });

        it("should cope with non CSSStyleRule", function () {
            setHtml('<head><style type="text/css">@font-face { font-family: "RaphaelIcons"; src: url("raphaelicons-webfont.woff"); }</style></head><body><span></span></body>');

            rasterizeHTML.util.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');
        });

        it("should not touch style elements without a matching selector", function () {
            setHtml('<style type="text/css">a { color: blue; }/* a comment*/</style>');

            rasterizeHTML.util.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');

            // Use the fact that comments are discarded when processing a style sheet
            expect(doc.querySelector('style').textContent).toMatch(/a comment/);
        });
    });

    describe("addClassNameRecursively", function () {
        var doc,
            setHtml = function (html) {
                doc.documentElement.innerHTML = html;
            };

        beforeEach(function () {
            doc = document.implementation.createHTMLDocument('');
        });

        it("should attach class to selected element", function () {
            setHtml("<span>a span</span>");

            rasterizeHTML.util.addClassNameRecursively(doc.querySelector('span'), '.myClass');

            expect(doc.querySelector('span').className).toMatch(/myClass/);
        });

        it("should attach the fake hover class to select the parent's elements", function () {
            setHtml("<div><ol><li>a list entry</li></ol></div>");

            rasterizeHTML.util.addClassNameRecursively(doc.querySelector('li'), '.myClass');

            expect(doc.querySelector('ol').className).toMatch(/myClass/);
            expect(doc.querySelector('div').className).toMatch(/myClass/);
            expect(doc.querySelector('body').className).toMatch(/myClass/);
            expect(doc.querySelector('html').className).toMatch(/myClass/);
        });

        it("should not attach the fake hover class to siblings or parent's siblings", function () {
            setHtml("<div><span>a span</span><div><a>a list entry</a><i>text</i></div></div>");

            rasterizeHTML.util.addClassNameRecursively(doc.querySelector('a'), '.myClass');

            expect(doc.querySelector('i').className).toEqual('');
            expect(doc.querySelector('span').className).toEqual('');
        });
    });

    describe("fakeHover", function () {
        var doc,
            setHtml = function (html) {
                doc.documentElement.innerHTML = html;
            };

        beforeEach(function () {
            doc = document.implementation.createHTMLDocument('');

            spyOn(rasterizeHTML.util, 'addClassNameRecursively');
            spyOn(rasterizeHTML.util, 'rewriteStyleRuleSelector');
        });

        it("should add a fake class to the selected element and adapt the document's stylesheet", function () {
            setHtml("<span>a span</span>");
            rasterizeHTML.util.fakeHover(doc, 'span');

            expect(rasterizeHTML.util.addClassNameRecursively).toHaveBeenCalledWith(doc.querySelector('span'), 'rasterizehtmlhover');
            expect(rasterizeHTML.util.rewriteStyleRuleSelector).toHaveBeenCalledWith(doc, ':hover', '.rasterizehtmlhover');
        });

        it("should ignore non-existent selector", function () {
            rasterizeHTML.util.fakeHover(doc, 'div');
        });
    });

    describe("fakeActive", function () {
        var doc,
            setHtml = function (html) {
                doc.documentElement.innerHTML = html;
            };

        beforeEach(function () {
            doc = document.implementation.createHTMLDocument('');

            spyOn(rasterizeHTML.util, 'addClassNameRecursively');
            spyOn(rasterizeHTML.util, 'rewriteStyleRuleSelector');
        });

        it("should add a fake class to the selected element and adapt the document's stylesheet", function () {
            setHtml("<span>a span</span>");
            rasterizeHTML.util.fakeActive(doc, 'span');

            expect(rasterizeHTML.util.addClassNameRecursively).toHaveBeenCalledWith(doc.querySelector('span'), 'rasterizehtmlactive');
            expect(rasterizeHTML.util.rewriteStyleRuleSelector).toHaveBeenCalledWith(doc, ':active', '.rasterizehtmlactive');
        });

        it("should ignore non-existent selector", function () {
            rasterizeHTML.util.fakeActive(doc, 'div');
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

            rasterizeHTML.util.calculateDocumentContentSize(doc, 300, 200).then(function (size) {
                expect(size.height).toEqual(316);

                done();
            });
        });

        it("should return the minimum height viewport", function (done) {
            setHtml('<div style="height: 100px;"></div>');

            rasterizeHTML.util.calculateDocumentContentSize(doc, 300, 200).then(function (size) {
                expect(size.height).toEqual(200);

                done();
            });
        });

        it("should return the minimum width of the viewport", function (done) {
            setHtml('<div>The content</div>');

            rasterizeHTML.util.calculateDocumentContentSize(doc, 300, 200).then(function (size) {
                expect(size.width).toEqual(300);

                done();
            });
        });

        ifNotInPhantomJsIt("should return width greater than viewport width", function (done) {
            setHtml('<div style="width: 400px; height: 10px;"></div>');

            rasterizeHTML.util.calculateDocumentContentSize(doc, 300, 200).then(function (size) {
                expect(size.width).toEqual(408);

                done();
            });
        });

        it("should remove the iframe when done calculating", function (done) {
            setHtml('<div>The content</div>');

            rasterizeHTML.util.calculateDocumentContentSize(doc, 300, 200).then(function () {
                expect($('iframe')).not.toExist();

                done();
            });
        });

        it("should not execute JavaScript", function (done) {
            setHtml('<div></div><script>document.querySelector("div").style.height="100";</script>');

            rasterizeHTML.util.calculateDocumentContentSize(doc, 300, 10).then(function (size) {
                expect(size.height).toEqual(10);

                done();
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
        it("should load document from a URL", function (done) {
            rasterizeHTML.util.loadDocument(jasmine.getFixtures().fixturesPath + "test.html", {}).then(function (doc) {
                expect(doc.querySelector('title').textContent).toEqual("Test page with full resource includes");

                done();
            });
        });

        it("should call error callback on fail", function (done) {
            rasterizeHTML.util.loadDocument(jasmine.getFixtures().fixturesPath + "non_existing_url.html", {}).fail(done);
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
                rasterizeHTML.util.loadDocument("non_existing_url.html", {cache: 'none'});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', jasmine.any(String), true);
                expect(ajaxRequest.open.mostRecentCall.args[1]).toMatch(/^non_existing_url.html\?_=[0123456789]+$/);
            });

            it("should attach an unique parameter to the given URL to circumvent caching if requested (legacy: 'false')", function () {
                rasterizeHTML.util.loadDocument("non_existing_url.html", {cache: false});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', jasmine.any(String), true);
                expect(ajaxRequest.open.mostRecentCall.args[1]).toMatch(/^non_existing_url.html\?_=[0123456789]+$/);
            });

            it("should not attach an unique parameter to the given URL by default", function () {
                rasterizeHTML.util.loadDocument("non_existing_url.html", {});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', "non_existing_url.html", true);
            });

            it("should allow caching for repeated calls if requested", function () {
                var dateNowSpy = spyOn(window.Date, 'now').andReturn(42);

                rasterizeHTML.util.loadDocument("non_existing_url.html", {cache: 'none'});

                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=42');

                ajaxRequest.open.reset();
                dateNowSpy.andReturn(43);
                rasterizeHTML.util.loadDocument("non_existing_url.html", {cache: 'repeated'});
                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=42');

                expect(dateNowSpy.callCount).toEqual(1);
            });

            it("should not cache repeated calls by default", function () {
                var dateNowSpy = spyOn(window.Date, 'now').andReturn(42);
                rasterizeHTML.util.loadDocument("non_existing_url.html", {cache: 'none'});

                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=42');

                ajaxRequest.open.reset();
                dateNowSpy.andReturn(43);
                rasterizeHTML.util.loadDocument("non_existing_url.html", {cache: 'none'});
                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=43');
            });

            it("should load URLs relative to baseUrl", function () {
                rasterizeHTML.util.loadDocument("relative/url.html", {baseUrl: "http://example.com/"});

                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('http://example.com/relative/url.html');

                expect(rasterizeHTMLInline.util.joinUrl).toHaveBeenCalledWith("http://example.com/", "relative/url.html");
            });
        });
    });
});
