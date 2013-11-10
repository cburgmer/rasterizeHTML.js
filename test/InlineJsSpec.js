describe("JS inline", function () {
    var doc, joinUrlSpy, ajaxSpy, callback, externalScript, internalScript, anotherExternalScript;

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        joinUrlSpy = spyOn(rasterizeHTMLInline.util, "joinUrl");
        ajaxSpy = spyOn(rasterizeHTMLInline.util, "ajax");
        callback = jasmine.createSpy("callback");

        externalScript = window.document.createElement("script");
        externalScript.src = "url/some.js";

        internalScript = window.document.createElement("script");
        internalScript.textContent = "function () {}";

        anotherExternalScript = window.document.createElement("script");
        anotherExternalScript.src = "url/someOther.js";
        anotherExternalScript.type = "text/javascript";

        ajaxSpy.andCallFake(function (url, options, success, error) {
            if (url === externalScript.attributes.src.nodeValue) {
                success("var b = 1;");
            } else if (url === anotherExternalScript.attributes.src.nodeValue) {
                success("function something() {}");
            } else {
                error(url);
            }
        });

        joinUrlSpy.andCallFake(function (base, rel) {
            return base + rel;
        });
    });

    it("should do nothing if no linked JS is found", function () {
        rasterizeHTMLInline.loadAndInlineScript(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.getElementsByTagName("script").length).toEqual(0);
    });

    it("should inline linked JS", function () {
        doc.head.appendChild(externalScript);

        rasterizeHTMLInline.loadAndInlineScript(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("script").length).toEqual(1);
        expect(doc.head.getElementsByTagName("script")[0].textContent).toEqual("var b = 1;");
        expect(doc.head.getElementsByTagName("script")[0].src).not.toExist();
    });

    it("should keep the script's type when inlining", function () {
        doc.head.appendChild(anotherExternalScript);

        rasterizeHTMLInline.loadAndInlineScript(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("script").length).toEqual(1);
        expect(doc.head.getElementsByTagName("script")[0].type).toEqual("text/javascript");
    });

    it("should place the inlined script where the external node was", function () {
        doc.head.appendChild(externalScript);
        doc.body.appendChild(anotherExternalScript);

        rasterizeHTMLInline.loadAndInlineScript(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.getElementsByTagName("script").length).toEqual(2);
        expect(doc.head.getElementsByTagName("script")[0].textContent).toEqual("var b = 1;");
        expect(doc.body.getElementsByTagName("script")[0].textContent).toEqual("function something() {}");
    });

    it("should not touch internal scripts", function () {
        doc.head.appendChild(internalScript);

        rasterizeHTMLInline.loadAndInlineScript(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(ajaxSpy).not.toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("script").length).toEqual(1);
        expect(doc.head.getElementsByTagName("script")[0]).toEqual(internalScript);
    });

    it("should correctly quote closing HTML tags in the script", function () {
        var script = window.document.createElement("script");
        script.src = "some_url.js";

        ajaxSpy.andCallFake(function (url, options, success) {
            success('var closingScriptTag = "</script>";');
        });
        doc.head.appendChild(script);

        rasterizeHTMLInline.loadAndInlineScript(doc, callback);
        expect(doc.head.getElementsByTagName("script")[0].textContent).toEqual('var closingScriptTag = "<\\/script>";');
    });

    it("should respect the document's baseURI when loading linked JS", function () {
        var getDocumentBaseUrlSpy = spyOn(rasterizeHTMLInline.util, 'getDocumentBaseUrl').andCallThrough();

        doc = rasterizeHTMLTestHelper.readDocumentFixture("externalJS.html");

        rasterizeHTMLInline.loadAndInlineScript(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(ajaxSpy).toHaveBeenCalledWith("some.js", {baseUrl: doc.baseURI}, jasmine.any(Function), jasmine.any(Function));
        expect(getDocumentBaseUrlSpy).toHaveBeenCalledWith(doc);
    });

    it("should respect optional baseUrl when loading linked JS", function () {
        doc.head.appendChild(externalScript);

        rasterizeHTMLInline.loadAndInlineScript(doc, {baseUrl: "some_base_url/"}, callback);

        expect(callback).toHaveBeenCalled();
        expect(ajaxSpy).toHaveBeenCalledWith(externalScript.attributes.src.nodeValue, {baseUrl: "some_base_url/"}, jasmine.any(Function), jasmine.any(Function));
    });

    it("should favour explicit baseUrl over document.baseURI when loading linked JS", function () {
        doc = rasterizeHTMLTestHelper.readDocumentFixture("externalJS.html");
        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");

        rasterizeHTMLInline.loadAndInlineScript(doc, {baseUrl: "some_base_url/"}, callback);

        expect(callback).toHaveBeenCalled();
        expect(ajaxSpy).toHaveBeenCalledWith("some.js", {baseUrl: "some_base_url/"}, jasmine.any(Function), jasmine.any(Function));
    });

    it("should circumvent caching if requested", function () {
        doc.head.appendChild(externalScript);

        rasterizeHTMLInline.loadAndInlineScript(doc, {cache: 'none'}, callback);

        expect(ajaxSpy).toHaveBeenCalledWith(externalScript.attributes.src.nodeValue, {
            cache: 'none'
        }, jasmine.any(Function), jasmine.any(Function));
    });

    it("should not circumvent caching by default", function () {
        doc.head.appendChild(externalScript);

        rasterizeHTMLInline.loadAndInlineScript(doc, callback);

        expect(ajaxSpy).toHaveBeenCalledWith(externalScript.attributes.src.nodeValue, {}, jasmine.any(Function), jasmine.any(Function));
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

        it("should report an error if a script could not be loaded", function () {
            doc.head.appendChild(brokenJsScript);

            rasterizeHTMLInline.loadAndInlineScript(doc, {baseUrl: "some_base_url/"}, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "script",
                url: "some_base_url/a_document_that_doesnt_exist.js",
                msg: "Unable to load script some_base_url/a_document_that_doesnt_exist.js"
            }]);
        });

        it("should only report a failing script as error", function () {
            doc.head.appendChild(brokenJsScript);
            doc.head.appendChild(externalScript);

            rasterizeHTMLInline.loadAndInlineScript(doc, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "script",
                url: "a_document_that_doesnt_exist.js",
                msg: jasmine.any(String)
            }]);
        });

        it("should report multiple failing scripts as error", function () {
            doc.head.appendChild(brokenJsScript);
            doc.head.appendChild(anotherBrokenJsScript);

            rasterizeHTMLInline.loadAndInlineScript(doc, callback);

            expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
            expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
        });

        it("should report an empty list for a successful script", function () {
            doc.head.appendChild(externalScript);

            rasterizeHTMLInline.loadAndInlineScript(doc, callback);

            expect(callback).toHaveBeenCalledWith([]);
        });
    });

});
