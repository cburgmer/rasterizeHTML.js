describe("JS inline", function () {
    var doc, joinUrlSpy, ajaxSpy, callback,
        internalScript,
        ajaxUrlMocks = {};

    var setupAjaxMock = function () {
        return spyOn(rasterizeHTMLInline.util, "ajax").andCallFake(function (url) {
            var defer = ayepromise.defer();
            if (ajaxUrlMocks[url] !== undefined) {
                defer.resolve(ajaxUrlMocks[url]);
            } else {
                defer.reject({
                    url: 'THEURL' + url
                });
            }
            return defer.promise;
        });
    };

    var mockAjaxUrl = function (url, content) {
        ajaxUrlMocks[url] = content;
    };

    var anExternalScript = function () {
        return anExternalScriptWith("url/some.js", "var b = 1;");
    };

    var anotherExternalScript = function () {
        var script = anExternalScriptWith("url/someOther.js", "function something() {}");
        script.type = "text/javascript";
        script.id = "myScript";
        return script;
    };

    var anExternalScriptWith = function (url, content) {
        var externalScript = window.document.createElement("script");

        externalScript.src = url;

        mockAjaxUrl(url, content);

        return externalScript;
    };

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        joinUrlSpy = spyOn(rasterizeHTMLInline.util, "joinUrl");
        ajaxSpy = setupAjaxMock();
        callback = jasmine.createSpy("callback");

        internalScript = window.document.createElement("script");
        internalScript.textContent = "function () {}";

        joinUrlSpy.andCallFake(function (base, rel) {
            return base + rel;
        });
    });

    it("should do nothing if no linked JS is found", function (done) {
        rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function () {
            expect(doc.getElementsByTagName("script").length).toEqual(0);

            done();
        });
    });

    it("should inline linked JS", function (done) {
        doc.head.appendChild(anExternalScript());

        rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function () {
            expect(doc.head.getElementsByTagName("script").length).toEqual(1);
            expect(doc.head.getElementsByTagName("script")[0].textContent).toEqual("var b = 1;");
            expect(doc.head.getElementsByTagName("script")[0].src).not.toExist();

            done();
        });
    });

    it("should remove the src attribute from the inlined script", function (done) {
        doc.head.appendChild(anotherExternalScript());

        rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function () {
            expect(doc.head.getElementsByTagName("script").length).toEqual(1);
            expect(doc.head.getElementsByTagName("script")[0].src).toBe('');

            done();
        });
    });

    it("should keep all other script's attributes inlining", function (done) {
        doc.head.appendChild(anotherExternalScript());

        rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function () {
            expect(doc.head.getElementsByTagName("script").length).toEqual(1);
            expect(doc.head.getElementsByTagName("script")[0].type).toEqual("text/javascript");
            expect(doc.head.getElementsByTagName("script")[0].id).toEqual("myScript");

            done();
        });
    });

    it("should place the inlined script where the external node was", function (done) {
        doc.head.appendChild(anExternalScript());
        doc.body.appendChild(anotherExternalScript());

        rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function () {
            expect(doc.getElementsByTagName("script").length).toEqual(2);
            expect(doc.head.getElementsByTagName("script")[0].textContent).toEqual("var b = 1;");
            expect(doc.body.getElementsByTagName("script")[0].textContent).toEqual("function something() {}");

            done();
        });
    });

    it("should not touch internal scripts", function (done) {
        doc.head.appendChild(internalScript);

        rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function () {
            expect(ajaxSpy).not.toHaveBeenCalled();
            expect(doc.head.getElementsByTagName("script").length).toEqual(1);
            expect(doc.head.getElementsByTagName("script")[0]).toEqual(internalScript);

            done();
        });
    });

    it("should correctly quote closing HTML tags in the script", function (done) {
        var script = window.document.createElement("script");
        script.src = "some_url.js";

        mockAjaxUrl("some_url.js", 'var closingScriptTag = "</script>";');
        doc.head.appendChild(script);

        rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function () {
            expect(doc.head.getElementsByTagName("script")[0].textContent).toEqual('var closingScriptTag = "<\\/script>";');

            done();
        });
    });

    it("should respect the document's baseURI when loading linked JS", function (done) {
        var getDocumentBaseUrlSpy = spyOn(rasterizeHTMLInline.util, 'getDocumentBaseUrl').andCallThrough();

        doc = rasterizeHTMLTestHelper.readDocumentFixture("externalJS.html");

        rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function () {
            expect(ajaxSpy).toHaveBeenCalledWith("some.js", {baseUrl: doc.baseURI});
            expect(getDocumentBaseUrlSpy).toHaveBeenCalledWith(doc);

            done();
        });
    });

    it("should respect optional baseUrl when loading linked JS", function (done) {
        doc.head.appendChild(anExternalScriptWith('externalScript.js', ''));

        rasterizeHTMLInline.loadAndInlineScript(doc, {baseUrl: "some_base_url/"}).then(function () {
            expect(ajaxSpy).toHaveBeenCalledWith('externalScript.js', {baseUrl: "some_base_url/"});

            done();
        });
    });

    it("should favour explicit baseUrl over document.baseURI when loading linked JS", function (done) {
        doc = rasterizeHTMLTestHelper.readDocumentFixture("externalJS.html");
        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");

        rasterizeHTMLInline.loadAndInlineScript(doc, {baseUrl: "some_base_url/"}).then(function () {
            expect(ajaxSpy).toHaveBeenCalledWith("some.js", {baseUrl: "some_base_url/"});

            done();
        });
    });

    it("should circumvent caching if requested", function (done) {
        doc.head.appendChild(anExternalScript());

        rasterizeHTMLInline.loadAndInlineScript(doc, {cache: 'none'}).then(function () {
            expect(ajaxSpy).toHaveBeenCalledWith(jasmine.any(String), {
                cache: 'none'
            });

            done();
        });
    });

    it("should not circumvent caching by default", function (done) {
        doc.head.appendChild(anExternalScript());

        rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function () {
            expect(ajaxSpy).toHaveBeenCalledWith(jasmine.any(String), {});

            done();
        });
    });

    describe("error handling", function () {
        var brokenJsScript, anotherBrokenJsScript;

        beforeEach(function () {
            brokenJsScript = window.document.createElement("script");
            brokenJsScript.src = "a_document_that_doesnt_exist.js";

            anotherBrokenJsScript = window.document.createElement("script");
            anotherBrokenJsScript.src = "another_document_that_doesnt_exist.js";

            joinUrlSpy.andCallThrough();
        });

        it("should report an error if a script could not be loaded", function (done) {
            doc.head.appendChild(brokenJsScript);

            rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function (errors) {
                errors = rasterizeHTMLTestHelper.deleteAdditionalFieldsFromErrorsUnderPhantomJS(errors);
                expect(errors).toEqual([{
                    resourceType: "script",
                    url: 'THEURL' + "a_document_that_doesnt_exist.js",
                    msg: "Unable to load script " + 'THEURL' + "a_document_that_doesnt_exist.js"
                }]);

                done();
            });
        });

        it("should only report a failing script as error", function (done) {
            doc.head.appendChild(brokenJsScript);
            doc.head.appendChild(anExternalScript());

            rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function (errors) {
                errors = rasterizeHTMLTestHelper.deleteAdditionalFieldsFromErrorsUnderPhantomJS(errors);
                expect(errors).toEqual([{
                    resourceType: "script",
                    url: 'THEURL' + "a_document_that_doesnt_exist.js",
                    msg: jasmine.any(String)
                }]);

                done();
            });
        });

        it("should report multiple failing scripts as error", function (done) {
            doc.head.appendChild(brokenJsScript);
            doc.head.appendChild(anotherBrokenJsScript);

            rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function (errors) {
                expect(errors).toEqual([jasmine.any(Object), jasmine.any(Object)]);
                expect(errors[0]).not.toEqual(errors[1]);

                done();
            });
        });

        it("should report an empty list for a successful script", function (done) {
            doc.head.appendChild(anExternalScript());

            rasterizeHTMLInline.loadAndInlineScript(doc, {}).then(function (errors) {
                expect(errors).toEqual([]);

                done();
            });
        });
    });

});
