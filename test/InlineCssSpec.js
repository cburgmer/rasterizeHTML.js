describe("Inline CSS content", function () {
    var joinUrlSpy, ajaxSpy, binaryAjaxSpy, getDataURIForImageURLSpy,
        callback;

    beforeEach(function () {
        joinUrlSpy = spyOn(rasterizeHTMLInline.util, "joinUrl").andCallFake(function (base, url) {
            return url;
        });
        ajaxSpy = spyOn(rasterizeHTMLInline.util, "ajax");
        binaryAjaxSpy = spyOn(rasterizeHTMLInline.util, "binaryAjax");
        getDataURIForImageURLSpy = spyOn(rasterizeHTMLInline.util, "getDataURIForImageURL");

        callback = jasmine.createSpy("callback");
    });

    describe("extractCssUrl", function () {
        it("should extract a CSS URL", function () {
            var url = rasterizeHTMLInline.css.extractCssUrl('url(path/file.png)');
            expect(url).toEqual("path/file.png");
        });

        it("should handle double quotes", function () {
            var url = rasterizeHTMLInline.css.extractCssUrl('url("path/file.png")');
            expect(url).toEqual("path/file.png");
        });

        it("should handle single quotes", function () {
            var url = rasterizeHTMLInline.css.extractCssUrl("url('path/file.png')");
            expect(url).toEqual("path/file.png");
        });

        it("should handle whitespace", function () {
            var url = rasterizeHTMLInline.css.extractCssUrl('url(   path/file.png )');
            expect(url).toEqual("path/file.png");
        });

        it("should also handle tab, line feed, carriage return and form feed", function () {
            var url = rasterizeHTMLInline.css.extractCssUrl('url(\t\r\f\npath/file.png\t\r\f\n)');
            expect(url).toEqual("path/file.png");
        });

        it("should keep any other whitspace", function () {
            var url = rasterizeHTMLInline.css.extractCssUrl('url(\u2003\u3000path/file.png)');
            expect(url).toEqual("\u2003\u3000path/file.png");
        });

        it("should handle whitespace with double quotes", function () {
            var url = rasterizeHTMLInline.css.extractCssUrl('url( "path/file.png"  )');
            expect(url).toEqual("path/file.png");
        });

        it("should handle whitespace with single quotes", function () {
            var url = rasterizeHTMLInline.css.extractCssUrl("url( 'path/file.png'  )");
            expect(url).toEqual("path/file.png");
        });

        it("should extract a data URI", function () {
            var url = rasterizeHTMLInline.css.extractCssUrl('url("data:image/png;base64,soMEfAkebASE64=")');
            expect(url).toEqual("data:image/png;base64,soMEfAkebASE64=");
        });

        it("should throw an exception on invalid CSS URL", function () {
            expect(function () {
                rasterizeHTMLInline.css.extractCssUrl('invalid_stuff');
            }).toThrow(new Error("Invalid url"));
        });
    });

    describe("adjustPathsOfCssResources", function () {
        var extractCssUrlSpy;

        beforeEach(function () {
            extractCssUrlSpy = spyOn(rasterizeHTMLInline.css, "extractCssUrl").andCallFake(function (cssUrl) {
                if (/^url/.test(cssUrl)) {
                    return cssUrl.replace(/^url\("?/, '').replace(/"?\)$/, '');
                } else {
                    throw "error";
                }
            });
        });

        it("should map resource paths relative to the stylesheet", function () {
            var rules = CSSOM.parse('div { background-image: url("../green.png"); }\n' +
                        '@font-face { font-family: "test font"; src: url("fake.woff"); }').cssRules;

            joinUrlSpy.andCallFake(function (base, url) {
                if (url === "../green.png" && base === "below/some.css") {
                    return "green.png";
                } else if (url === "fake.woff" && base === "below/some.css") {
                    return "below/fake.woff";
                }
            });

            rasterizeHTMLInline.css.adjustPathsOfCssResources("below/some.css", rules);

            expect(rules[0].style.getPropertyValue('background-image')).toMatch(/url\(\"?green\.png\"?\)/);
            expect(rules[1].style.getPropertyValue('src')).toMatch(/url\(\"?below\/fake\.woff\"?\)/);
        });

        ifNotInPhantomJsIt("should keep all src references intact when mapping resource paths", function () {
            var rules = CSSOM.parse('@font-face { font-family: "test font"; src: local("some font"), url("fake.woff"); }').cssRules;

            joinUrlSpy.andCallFake(function (base, url) {
                if (base === "some_url/some.css") {
                    return "some_url/" + url;
                }
            });

            rasterizeHTMLInline.css.adjustPathsOfCssResources("some_url/some.css", rules);

            expect(rules[0].style.getPropertyValue('src')).toMatch(/local\("?some font"?\), url\(\"?some_url\/fake\.woff\"?\)/);
        });

        it("should keep the font-family when inlining with Webkit", function () {
            var rules = CSSOM.parse("@font-face { font-family: 'test font'; src: url(\"fake.woff\"); }").cssRules;

            joinUrlSpy.andCallFake(function (base, url) {
                if (base === "some_url/some.css") {
                    return "some_url/" + url;
                }
            });

            rasterizeHTMLInline.css.adjustPathsOfCssResources("some_url/some.css", rules);

            expect(rules[0].style.getPropertyValue('font-family')).toMatch(/["']test font["']/);
        });

    });

    describe("loadCSSImportsForRules", function () {
        var adjustPathsOfCssResourcesSpy;

        beforeEach(function () {
            adjustPathsOfCssResourcesSpy = spyOn(rasterizeHTMLInline.css, 'adjustPathsOfCssResources');
        });

        it("should replace an import with the content of the given URL", function () {
            var rules = CSSOM.parse('@import url("that.css");').cssRules;

            ajaxSpy.andCallFake(function (url, options, callback) {
                if (url === 'that.css') {
                    callback("p { font-size: 10px; }");
                }
            });

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(callback).toHaveBeenCalledWith(true, []);

            expect(rules.length).toEqual(1);
            expect(rules[0].cssText).toMatch(/p \{\s*font-size: 10px;\s*\}/);
        });

        it("should inline multiple linked CSS and keep order", function () {
            var rules = CSSOM.parse('@import url("this.css");\n' +
                '@import url("that.css");').cssRules;

            ajaxSpy.andCallFake(function (url, options, callback) {
                if (url === 'this.css') {
                    callback("div { display: inline-block; }");
                } else if (url === 'that.css') {
                    callback("p { font-size: 10px; }");
                }
            });

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(rules[0].cssText).toMatch(/div \{\s*display: inline-block;\s*\}/);
            expect(rules[1].cssText).toMatch(/p \{\s*font-size: 10px;\s*\}/);
        });

        it("should support an import without the functional url() form", function () {
            var rules = CSSOM.parse('@import "that.css";').cssRules;

            ajaxSpy.andCallFake(function (url, options, callback) {
                callback("");
            });

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(ajaxSpy).toHaveBeenCalledWith("that.css", jasmine.any(Object), jasmine.any(Function), jasmine.any(Function));
        });

        it("should handle empty content", function () {
            var rules = CSSOM.parse('@import url("that.css");').cssRules;

            ajaxSpy.andCallFake(function (url, options, callback) {
                if (url === 'that.css') {
                    callback("");
                }
            });

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(rules.length).toEqual(0);
        });

        it("should not add CSS if no content is given", function () {
            var rules = CSSOM.parse('@import url("that.css");\n' +
                '@import url("this.css");').cssRules;

            ajaxSpy.andCallFake(function (url, options, callback) {
                if (url === 'that.css') {
                    callback("");
                } else if (url === 'this.css') {
                    callback("span { font-weight: bold; }");
                }
            });

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(rules.length).toEqual(1);
        });

        it("should ignore invalid values", function () {
            var rules = CSSOM.parse('@import   invalid url;').cssRules;

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(callback).toHaveBeenCalledWith(false, []);
        });

        it("should not touch unrelated CSS", function () {
            var rules = CSSOM.parse('span {   padding-left: 0; }').cssRules;

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(callback).toHaveBeenCalledWith(false, []);
        });

        it("should not include a document more than once", function () {
            var rules = CSSOM.parse('@import url("that.css");\n' +
                '@import url("that.css");').cssRules;

            ajaxSpy.andCallFake(function (url, options, callback) {
                callback('p { font-size: 12px; }');
            });

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(ajaxSpy.callCount).toEqual(1);
            expect(rules.length).toEqual(1);
        });

        it("should handle import in an import", function () {
            var rules = CSSOM.parse('@import url("this.css");').cssRules;

            ajaxSpy.andCallFake(function (url, options, callback) {
                if (url === "this.css") {
                    callback('@import url("that.css");');
                } else if (url === "that.css") {
                    callback('p { font-weight: bold; }');
                }
            });

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(rules.length).toEqual(1);
            expect(rules[0].cssText).toMatch(/p \{\s*font-weight: bold;\s*\}/);
        });

        it("should handle cyclic imports", function () {
            var rules = CSSOM.parse('@import url("this.css");').cssRules;

            ajaxSpy.andCallFake(function (url, options, callback) {
                if (url === "this.css") {
                    callback('@import url("that.css");\n' +
                        'span { font-weight: 300; }');
                } else if (url === "that.css") {
                    callback('@import url("this.css");\n' +
                        'p { font-weight: bold; }');
                }
            });

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(rules[0].cssText).toMatch(/p \{\s*font-weight: bold;\s*\}/);
            expect(rules[1].cssText).toMatch(/span \{\s*font-weight: 300;\s*\}/);
        });

        it("should handle recursive imports", function () {
            var rules = CSSOM.parse('@import url("this.css");').cssRules;

            ajaxSpy.andCallFake(function (url, options, callback) {
                if (url === "this.css") {
                    callback('@import url("this.css");');
                }
            });

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(ajaxSpy.callCount).toEqual(1);
            expect(rules.length).toEqual(0);
        });

        it("should handle a baseUrl", function () {
            var rules = CSSOM.parse('@import url("that.css");').cssRules;

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {baseUrl: 'url_base/page.html'}, callback);

            expect(joinUrlSpy).toHaveBeenCalledWith('url_base/page.html', "that.css");
        });

        it("should map resource paths relative to the stylesheet", function () {
            var rules = CSSOM.parse('@import url("url_base/that.css");').cssRules;

            joinUrlSpy.andCallFake(function (base) {
                if (base === "") {
                    return base;
                }
            });
            ajaxSpy.andCallFake(function (url, options, callback) {
                if (url === 'url_base/that.css') {
                    callback('div { background-image: url("../green.png"); }\n' +
                        '@font-face { font-family: "test font"; src: url("fake.woff"); }');
                }
            });

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(adjustPathsOfCssResourcesSpy).toHaveBeenCalledWith('url_base/that.css', jasmine.any(Object));
            expect(adjustPathsOfCssResourcesSpy.mostRecentCall.args[1][0].style.getPropertyValue('background-image')).toMatch(/url\(\"?\.\.\/green\.png\"?\)/);
        });

        it("should circumvent caching if requested", function () {
            var rules = CSSOM.parse('@import url("that.css");').cssRules;

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {cache: 'none'}, callback);

            expect(ajaxSpy).toHaveBeenCalledWith("that.css", {
                cache: 'none'
            }, jasmine.any(Function), jasmine.any(Function));
        });

        it("should not circumvent caching by default", function () {
            var rules = CSSOM.parse('@import url("that.css");').cssRules;

            rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

            expect(ajaxSpy).toHaveBeenCalledWith("that.css", {}, jasmine.any(Function), jasmine.any(Function));
        });

        describe("error handling", function () {
            beforeEach(function () {
                joinUrlSpy.andCallThrough();

                ajaxSpy.andCallFake(function (url, options, success, error) {
                    if (url === "existing_document.css") {
                        success("");
                    } else if (url === "existing_with_second_level_nonexisting.css") {
                        success('@import url("nonexisting.css");');
                    } else {
                        error();
                    }
                });
            });

            it("should report an error if a stylesheet could not be loaded", function () {
                var rules = CSSOM.parse('@import url("does_not_exist.css");').cssRules;

                rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

                expect(callback).toHaveBeenCalledWith(false, [{
                    resourceType: "stylesheet",
                    url: "does_not_exist.css",
                    msg: "Unable to load stylesheet does_not_exist.css"
                }]);
            });

            it("should include the base URI in the reported url", function () {
                var rules = CSSOM.parse('@import url("missing.css");').cssRules;

                rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {baseUrl: 'some_url/'}, callback);

                expect(callback).toHaveBeenCalledWith(false, [{
                    resourceType: "stylesheet",
                    url: "some_url/missing.css",
                    msg: "Unable to load stylesheet some_url/missing.css"
                }]);
            });

            it("should only report a failing stylesheet as error", function () {
                var rules = CSSOM.parse('@import url("existing_document.css");\n' +
                    '@import url("does_not_exist.css");').cssRules;

                rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

                expect(callback).toHaveBeenCalledWith(true, [{
                    resourceType: "stylesheet",
                    url: "does_not_exist.css",
                    msg: jasmine.any(String)
                }]);
            });

            it("should report multiple failing stylesheets as error", function () {
                var rules = CSSOM.parse('@import url("does_not_exist.css");\n' +
                    '@import url("also_does_not_exist.css");').cssRules;

                rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

                expect(callback).toHaveBeenCalledWith(false, [jasmine.any(Object), jasmine.any(Object)]);
                expect(callback.mostRecentCall.args[1][0]).not.toEqual(callback.mostRecentCall.args[1][1]);
            });

            it("should report errors from second level @imports", function () {
                var rules = CSSOM.parse('@import url("existing_with_second_level_nonexisting.css");').cssRules;

                rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

                expect(callback).toHaveBeenCalledWith(true, [
                    {
                        resourceType: "stylesheet",
                        url: "nonexisting.css",
                        msg: jasmine.any(String)
                    }
                ]);
            });

            it("should report an empty list for a successful stylesheet", function () {
                var rules = CSSOM.parse('@import url("existing_document.css");').cssRules;

                rasterizeHTMLInline.css.loadCSSImportsForRules(rules, [], {}, callback);

                expect(callback).toHaveBeenCalledWith(true, []);
            });
        });
    });

    describe("loadAndInlineCSSResourcesForRules", function () {
        var extractCssUrlSpy;

        beforeEach(function () {
            extractCssUrlSpy = spyOn(rasterizeHTMLInline.css, "extractCssUrl").andCallFake(function (cssUrl) {
                if (/^url/.test(cssUrl)) {
                    return cssUrl.replace(/^url\("?/, '').replace(/"?\)$/, '');
                } else {
                    throw "error";
                }
            });
        });

        it("should work with empty content", function () {
            rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules([], {}, callback);

            expect(callback).toHaveBeenCalled();
        });

        describe("on background-image", function () {
            it("should not touch an already inlined background-image", function () {
                var rules = CSSOM.parse('span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(rules[0].style.getPropertyValue('background-image')).toEqual('url("data:image/png;base64,soMEfAkebASE64=")');
            });

            it("should ignore invalid values", function () {
                var rules = CSSOM.parse('span { background-image: "invalid url"; }').cssRules;

                extractCssUrlSpy.andCallFake(function () {
                    throw new Error("Invalid url");
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(rules[0].style.getPropertyValue('background-image')).toEqual('"invalid url"');
            });

            it("should inline a background-image", function () {
                var anImage = "anImage.png",
                    anImagesDataUri = "data:image/png;base64,someDataUri",
                    rules = CSSOM.parse('span { background-image: url("' + anImage + '"); }').cssRules;

                getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                    if (url === anImage) {
                        successCallback(anImagesDataUri);
                    }
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(extractCssUrlSpy.mostRecentCall.args[0]).toMatch(new RegExp('url\\("?' + anImage + '"?\\)'));

                expect(rules[0].style.getPropertyValue('background-image')).toEqual('url("' + anImagesDataUri + '")');
            });

            it("should inline a background declaration", function () {
                var anImage = "anImage.png",
                    anImagesDataUri = "data:image/png;base64,someDataUri",
                    rules = CSSOM.parse('span { background: url("' + anImage + '") top left, url("data:image/png;base64,someMoreDataUri") #FFF; }').cssRules;

                getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                    if (url === anImage) {
                        successCallback(anImagesDataUri);
                    }
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(rules[0].cssText).toMatch(/(background: [^;]*url\("?data:image\/png;base64,someDataUri"?\).*\s*top\s*.*, .*url\("?data:image\/png;base64,someMoreDataUri"?\).*;)|(background-image:\s*url\("?data:image\/png;base64,someDataUri"?\)\s*,\s*url\("?data:image\/png;base64,someMoreDataUri"?\)\s*;)/);
            });

            it("should inline multiple background-images in one rule", function () {
                var backgroundImageRegex = /url\("?([^\)"]+)"?\)\s*,\s*url\("?([^\)"]+)"?\)/,
                    anImage = "anImage.png",
                    anImagesDataUri = "data:image/png;base64,someDataUri",
                    aSecondImage = "aSecondImage.png",
                    aSecondImagesDataUri = "data:image/png;base64,anotherDataUri",
                    rules = CSSOM.parse('span { background-image: url("' + anImage + '"), url("' + aSecondImage + '"); }').cssRules,
                    match;

                getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                    if (url === anImage) {
                        successCallback(anImagesDataUri);
                    } else if (url === aSecondImage) {
                        successCallback(aSecondImagesDataUri);
                    }
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(extractCssUrlSpy.mostRecentCall.args[0]).toMatch(new RegExp('url\\("?' + aSecondImage + '"?\\)'));

                expect(rules[0].style.getPropertyValue('background-image')).toMatch(backgroundImageRegex);
                match = backgroundImageRegex.exec(rules[0].style.getPropertyValue('background-image'));
                expect(match[1]).toEqual(anImagesDataUri);
                expect(match[2]).toEqual(aSecondImagesDataUri);
            });

            it("should not break background-position (#30)", function () {
                var rules = CSSOM.parse('span { background-image: url("anImage.png"); background-position: 0 center, right center;}').cssRules;

                getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                    successCallback("data:image/png;base64,someDataUri");
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(rules[0].style.getPropertyValue('background-position')).toMatch(/0(px)? (center|50%), (right|100%) (center|50%)/);
            });

            it("should handle a baseUrl", function () {
                var rules = CSSOM.parse('span { background-image: url("image.png"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {baseUrl:  'url_base/page.html'}, callback);

                expect(getDataURIForImageURLSpy.mostRecentCall.args[1].baseUrl).toEqual('url_base/page.html');
            });

            it("should circumvent caching if requested", function () {
                var anImage = "anImage.png",
                    rules = CSSOM.parse('span { background-image: url("' + anImage + '"); }').cssRules;

                getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                    successCallback("uri");
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {cache:  'none'}, callback);

                expect(getDataURIForImageURLSpy).toHaveBeenCalledWith(anImage, {cache: 'none'}, jasmine.any(Function), jasmine.any(Function));
            });

            it("should not circumvent caching by default", function () {
                var anImage = "anImage.png",
                    rules = CSSOM.parse('span { background-image: url("' + anImage + '"); }').cssRules;

                getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback) {
                    successCallback("uri");
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(getDataURIForImageURLSpy).toHaveBeenCalledWith(anImage, {}, jasmine.any(Function), jasmine.any(Function));
            });
        });

        describe("on background-image with errors", function () {
            var aBackgroundImageThatDoesExist = "a_backgroundImage_that_does_exist.png";

            beforeEach(function () {
                getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback, errorCallback) {
                    if (url === aBackgroundImageThatDoesExist) {
                        successCallback();
                    } else {
                        errorCallback();
                    }
                });
                joinUrlSpy.andCallThrough();
            });

            it("should report an error if a backgroundImage could not be loaded", function () {
                var rules = CSSOM.parse('span { background-image: url("a_backgroundImage_that_doesnt_exist.png"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {baseUrl:  'some_base_url/'}, callback);

                expect(callback).toHaveBeenCalledWith(false, [{
                    resourceType: "backgroundImage",
                    url: "some_base_url/a_backgroundImage_that_doesnt_exist.png",
                    msg: "Unable to load background-image some_base_url/a_backgroundImage_that_doesnt_exist.png"
                }]);
            });

            it("should only report a failing backgroundImage as error", function () {
                var rules = CSSOM.parse('span { background-image: url("a_backgroundImage_that_doesnt_exist.png"); }\n' +
                    'span { background-image: url("' + aBackgroundImageThatDoesExist + '"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(callback).toHaveBeenCalledWith(true, [{
                    resourceType: "backgroundImage",
                    url: "a_backgroundImage_that_doesnt_exist.png",
                    msg: jasmine.any(String)
                }]);
            });

            it("should report multiple failing backgroundImages as error", function () {
                var rules = CSSOM.parse('span { background-image: url("a_backgroundImage_that_doesnt_exist.png"); }\n' +
                    'span { background-image: url("another_backgroundImage_that_doesnt_exist.png"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(callback).toHaveBeenCalledWith(false, [jasmine.any(Object), jasmine.any(Object)]);
                expect(callback.mostRecentCall.args[1][0]).not.toEqual(callback.mostRecentCall.args[1][1]);
            });

            it("should only report one failing backgroundImage for multiple in a rule", function () {
                var rules = CSSOM.parse('span { background-image: url("' + aBackgroundImageThatDoesExist + '"), url("a_backgroundImage_that_doesnt_exist.png"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(callback).toHaveBeenCalledWith(true, [{
                    resourceType: "backgroundImage",
                    url: "a_backgroundImage_that_doesnt_exist.png",
                    msg: jasmine.any(String)
                }]);
            });

            it("should report multiple failing backgroundImages in a rule as error", function () {
                var rules = CSSOM.parse('span { background-image: url("a_backgroundImage_that_doesnt_exist.png"), url("another_backgroundImage_that_doesnt_exist.png"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(callback).toHaveBeenCalledWith(false, [jasmine.any(Object), jasmine.any(Object)]);
                expect(callback.mostRecentCall.args[1][0]).not.toEqual(callback.mostRecentCall.args[1][1]);
            });

            it("should report an empty list for a successful backgroundImage", function () {
                var rules = CSSOM.parse('span { background-image: url("' + aBackgroundImageThatDoesExist + '"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(callback).toHaveBeenCalledWith(true, []);
            });
        });

        describe("on font-face", function () {
            var fontFaceSrcRegex = /url\("?([^\)"]+)"?\)(\s*format\("?([^\)"]+)"?\))?/;

            var expectFontFaceUrlToMatch = function (rule, url, format) {
                var extractedUrl, match;

                match = fontFaceSrcRegex.exec(rule.style.getPropertyValue('src'));
                extractedUrl = match[1];
                expect(extractedUrl).toEqual(url);
                if (format) {
                    expect(match[3]).toEqual(format);
                }
            };

            it("should not touch an already inlined font", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font"; src: url("data:font/woff;base64,soMEfAkebASE64="); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expectFontFaceUrlToMatch(rules[0], "data:font/woff;base64,soMEfAkebASE64=");
            });

            it("should ignore invalid values", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font"; src: "invalid url"; }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(binaryAjaxSpy).not.toHaveBeenCalled();
                expect(callback).toHaveBeenCalledWith(false, []);
            });

            it("should ignore a local font", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font"; src: local("font name"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(binaryAjaxSpy).not.toHaveBeenCalled();
                expect(callback).toHaveBeenCalledWith(false, []);
            });

            it("should inline a font", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font"; src: url("fake.woff"); }').cssRules;

                binaryAjaxSpy.andCallFake(function (url, options, success) {
                    success("this is not a font");
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(callback).toHaveBeenCalledWith(true, []);

                expect(extractCssUrlSpy.mostRecentCall.args[0]).toMatch(new RegExp('url\\("?fake.woff"?\\)'));

                expectFontFaceUrlToMatch(rules[0], "data:font/woff;base64,dGhpcyBpcyBub3QgYSBmb250");
            });

            it("should take a font from url with alternatives", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font"; src: local("font name"), url("fake.woff"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(extractCssUrlSpy.mostRecentCall.args[0]).toMatch(new RegExp('url\\("?fake.woff"?\\)'));
            });

            it("should detect a woff", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font"; src: url("fake.woff") format("woff"); }').cssRules;

                binaryAjaxSpy.andCallFake(function (url, options, success) {
                    success("font's content");
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expectFontFaceUrlToMatch(rules[0], "data:font/woff;base64,Zm9udCdzIGNvbnRlbnQ=", 'woff');
            });

            it("should detect a truetype font", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font"; src: url("fake.ttf") format("truetype"); }').cssRules;

                binaryAjaxSpy.andCallFake(function (url, options, success) {
                    success("font's content");
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expectFontFaceUrlToMatch(rules[0], "data:font/truetype;base64,Zm9udCdzIGNvbnRlbnQ=", 'truetype');
            });

            it("should detect a opentype font", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font"; src: url("fake.otf") format("opentype"); }').cssRules;

                binaryAjaxSpy.andCallFake(function (url, options, success) {
                    success("font's content");
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expectFontFaceUrlToMatch(rules[0], "data:font/opentype;base64,Zm9udCdzIGNvbnRlbnQ=", 'opentype');
            });

            ifNotInPhantomJsIt("should keep all src references intact", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font"; src: local("Fake Font"), url("fake.otf") format("opentype"), url("fake.woff"), local("Another Fake Font"); }').cssRules;

                binaryAjaxSpy.andCallFake(function (url, options, success) {
                    success("font");
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(rules[0].style.getPropertyValue('src')).toMatch(/local\("?Fake Font"?\), url\("?data:font\/opentype;base64,Zm9udA=="?\) format\("?opentype"?\), url\("?data:font\/woff;base64,Zm9udA=="?\), local\("?Another Fake Font"?\)/);
            });

            it("should handle a baseUrl", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font"; src: url("fake.woff"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {baseUrl:  'url_base/page.html'}, callback);

                expect(binaryAjaxSpy.mostRecentCall.args[1].baseUrl).toEqual('url_base/page.html');
            });

            it("should circumvent caching if requested", function () {
                var fontUrl = "fake.woff",
                    rules = CSSOM.parse('@font-face { font-family: "test font"; src: url("' + fontUrl + '"); }').cssRules;

                binaryAjaxSpy.andCallFake(function (url, options, success) {
                    success("this is not a font");
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {cache: 'none'}, callback);

                expect(binaryAjaxSpy).toHaveBeenCalledWith(fontUrl, {cache: 'none'}, jasmine.any(Function), jasmine.any(Function));
            });

            it("should not circumvent caching by default", function () {
                var fontUrl = "fake.woff",
                    rules = CSSOM.parse('@font-face { font-family: "test font"; src: url("' + fontUrl + '"); }').cssRules;

                binaryAjaxSpy.andCallFake(function (url, options, success) {
                    success("this is not a font");
                });

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(binaryAjaxSpy).toHaveBeenCalledWith(fontUrl, {}, jasmine.any(Function), jasmine.any(Function));
            });
        });

        describe("on font-face with errors", function () {
            var aFontReferenceThatDoesExist = "a_font_that_does_exist.woff";

            beforeEach(function () {
                binaryAjaxSpy.andCallFake(function (url, options, successCallback, errorCallback) {
                    if (url === aFontReferenceThatDoesExist) {
                        successCallback();
                    } else {
                        errorCallback();
                    }
                });
                joinUrlSpy.andCallThrough();
            });

            it("should report an error if a font could not be loaded", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font"; src: url("a_font_that_doesnt_exist.woff"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {baseUrl:  'some_base_url/'}, callback);

                expect(callback).toHaveBeenCalledWith(false, [{
                    resourceType: "fontFace",
                    url: "some_base_url/a_font_that_doesnt_exist.woff",
                    msg: "Unable to load font-face some_base_url/a_font_that_doesnt_exist.woff"
                }]);
            });

            it("should only report a failing font as error", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font1"; src: url("a_font_that_doesnt_exist.woff"); }\n' +
                    '@font-face { font-family: "test font2"; src: url("' + aFontReferenceThatDoesExist + '"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(callback).toHaveBeenCalledWith(true, [{
                    resourceType: "fontFace",
                    url: "a_font_that_doesnt_exist.woff",
                    msg: jasmine.any(String)
                }]);
            });

            it("should report multiple failing fonts as error", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font1"; src: url("a_font_that_doesnt_exist.woff"); }\n' +
                    '@font-face { font-family: "test font2"; src: url("another_font_that_doesnt_exist.woff"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(callback).toHaveBeenCalledWith(false, [jasmine.any(Object), jasmine.any(Object)]);
                expect(callback.mostRecentCall.args[1][0]).not.toEqual(callback.mostRecentCall.args[1][1]);
            });

            it("should report an empty list for a successful backgroundImage", function () {
                var rules = CSSOM.parse('@font-face { font-family: "test font2"; src: url("' + aFontReferenceThatDoesExist + '"); }').cssRules;

                rasterizeHTMLInline.css.loadAndInlineCSSResourcesForRules(rules, {}, callback);

                expect(callback).toHaveBeenCalledWith(true, []);
            });
        });
    });

});
