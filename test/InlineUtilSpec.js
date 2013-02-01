describe("Inline utilities function", function () {
    describe("cloneArray", function () {
        it("should create a copy of the given list", function () {
            var input = [1, 2, 3],
                output;

            output = rasterizeHTMLInline.util.cloneArray(input);

            expect(input).toEqual(output);
            expect(input).not.toBe(output);
        });
    });

    describe("joinUrl", function () {
        it("should append the url to a directory-only base", function () {
            var url = rasterizeHTMLInline.util.joinUrl("rel/path/", "the_relative_url");
            expect(url).toEqual("rel/path/the_relative_url");
        });

        it("should append the url to a file base", function () {
            var url = rasterizeHTMLInline.util.joinUrl("rel/path/something", "the_relative_url");
            expect(url).toEqual("rel/path/the_relative_url");
        });

        it("should merge ../ with a directory-only base", function () {
            var url = rasterizeHTMLInline.util.joinUrl("rel/path/", "../the_relative_url");
            expect(url).toEqual("rel/the_relative_url");
        });

        it("should just return the url if absolute", function () {
            var url = rasterizeHTMLInline.util.joinUrl("rel/path/", "/the_relative_url");
            expect(url).toEqual("/the_relative_url");
        });

        it("should combine a url starting with '/' with the host of the base", function () {
            var url = rasterizeHTMLInline.util.joinUrl("http://example.com/rel/path/", "/the_relative_url");
            expect(url).toEqual("http://example.com/the_relative_url");
        });

        it("should ignore base with an absolute url", function () {
            var url = rasterizeHTMLInline.util.joinUrl("http://example.com/rel/path/", "http://github.com//the_relative_url");
            expect(url).toEqual("http://github.com//the_relative_url");
        });

        it("should ignore base without directories", function () {
            var url = rasterizeHTMLInline.util.joinUrl("aFile", "anotherFile");
            expect(url).toEqual("anotherFile");
        });
    });

    describe("isDataUri", function () {
        it("should report data URI", function () {
            expect(rasterizeHTMLInline.util.isDataUri('data:image/png;base64,soMEfAkebASE64=')).toBeTruthy();
        });

        it("should handle single quotes", function () {
            expect(rasterizeHTMLInline.util.isDataUri('path/file.png')).toBeFalsy();
        });
    });

    describe("map", function () {
        it("should map each value to one function call and then call complete function", function () {
            var completedValues = [],
                completed = false;

            rasterizeHTMLInline.util.map([1, 2, 3], function (val, callback) {
                completedValues.push(val);

                callback();
            }, function () {
                completed = true;
            });

            expect(completed).toBeTruthy();
            expect(completedValues).toEqual([1, 2, 3]);
        });

        it("should pass computed results as array to complete function", function () {
            var computedResults = null;

            rasterizeHTMLInline.util.map([1, 2, 3], function (val, callback) {
                callback(val + 1);
            }, function (results) {
                computedResults = results;
            });

            expect(computedResults).toEqual([2, 3, 4]);
        });

        it("should pass computed results in the right order to complete function", function () {
            var computedResults = null,
                late2ndCallback = null;

            rasterizeHTMLInline.util.map([1, 2, 3], function (val, callback) {

                if (val === 2) {
                    late2ndCallback = callback;
                } else {
                    callback(val + 1);
                }
            }, function (results) {
                computedResults = results;
            });

            late2ndCallback(2 + 1);

            expect(computedResults).toEqual([2, 3, 4]);
        });

        it("should call complete if empty list is passed", function () {
            var completed = false,
                computedResults = null;

            rasterizeHTMLInline.util.map([], function () {}, function (results) {
                completed = true;
                computedResults = results;
            });

            expect(completed).toBeTruthy();
            expect(computedResults).toEqual([]);
        });

        it("should not call complete until last value is handled", function () {
            var completedValues = [],
                completed = false,
                lastCallback = null;

            rasterizeHTMLInline.util.map([1, 2, 3], function (val, callback) {
                completedValues.push(val);

                if (val < 3) {
                    callback();
                } else {
                    lastCallback = callback;
                }
            }, function () {
                completed = true;
            });

            expect(completed).toBeFalsy();

            lastCallback();

            expect(completed).toBeTruthy();
        });

        it("should cope with parallel changes to the input list", function () {
            var input = [1, 2, 3],
                computedResults = null;

            rasterizeHTMLInline.util.map(input, function (val, callback) {

                if (val === 2) {
                    // Remove middle element
                    input.splice(1, 1);
                }
                callback(val);
            }, function (results) {
                computedResults = results;
            });

            expect(computedResults).toEqual([1, 2, 3]);
        });

    });

    describe("ajax", function () {
        it("should load content from a URL", function () {
            var finished = false,
                loadedContent;

            rasterizeHTMLInline.util.ajax(jasmine.getFixtures().fixturesPath + "some.css", {}, function (content) {
                loadedContent = content;
                finished = true;
            }, function () {});

            waitsFor(function () {
                return finished;
            });

            runs(function () {
                expect(loadedContent).toEqual("p { font-size: 14px; }");
            });
        });

        it("should call error callback on fail", function () {
            var finished = false,
                successCallback = jasmine.createSpy("successCallback"),
                errorCallback = jasmine.createSpy("errorCallback").andCallFake(function () {
                    finished = true;
                });

            rasterizeHTMLInline.util.ajax("non_existing_url.html", {}, successCallback, errorCallback);

            waitsFor(function () {
                return finished;
            });

            runs(function () {
                expect(successCallback).not.toHaveBeenCalled();
                expect(errorCallback).toHaveBeenCalled();
            });
        });

        it("should attach an unique parameter to the given URL to circumvent caching if requested", function () {
            var ajaxRequest = jasmine.createSpyObj("ajaxRequest", ["open", "addEventListener", "overrideMimeType", "send"]);
            spyOn(window, "XMLHttpRequest").andReturn(ajaxRequest);

            rasterizeHTMLInline.util.ajax("non_existing_url.html", {cache: false}, function () {}, function () {});

            expect(ajaxRequest.open).toHaveBeenCalledWith('GET', jasmine.any(String), true);
            expect(ajaxRequest.open.mostRecentCall.args[1]).toMatch(/^non_existing_url.html\?_=[0123456789]+$/);
        });

        it("should not attach an unique parameter to the given URL by default", function () {
            var ajaxRequest = jasmine.createSpyObj("ajaxRequest", ["open", "addEventListener", "overrideMimeType", "send"]);
            spyOn(window, "XMLHttpRequest").andReturn(ajaxRequest);

            rasterizeHTMLInline.util.ajax("non_existing_url.html", {}, function () {}, function () {});

            expect(ajaxRequest.open).toHaveBeenCalledWith('GET', "non_existing_url.html", true);
        });

        it("should force mime type if requested", function () {
            var ajaxRequest = jasmine.createSpyObj("ajaxRequest", ["open", "addEventListener", "overrideMimeType", "send"]);
            spyOn(window, "XMLHttpRequest").andReturn(ajaxRequest);

            rasterizeHTMLInline.util.ajax("non_existing_url.html", {mimeType: "42"}, function () {}, function () {});

            expect(ajaxRequest.overrideMimeType).toHaveBeenCalledWith('42');
        });
    });

    describe("binaryAjax", function () {
        it("should load binary data", function () {
            var finished = false,
                loadedContent;

            rasterizeHTMLInline.util.binaryAjax(jasmine.getFixtures().fixturesPath + "green.png", {}, function (content) {
                loadedContent = content;
                finished = true;
            }, function () {});

            waitsFor(function () {
                return finished;
            });

            runs(function () {
                expect(btoa(loadedContent)).toEqual("iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABFElEQVR4nO3OMQ0AAAjAMPybhnsKxrHUQGc2r+iBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YGQHgjpgZAeCOmBkB4I6YHAAV821mT1w27RAAAAAElFTkSuQmCC");
            });
        });

        it("should handle error", function () {
            var errorCallback = jasmine.createSpy("errorCallback"),
                successCallback = jasmine.createSpy("successCallback");
            spyOn(rasterizeHTMLInline.util, "ajax").andCallFake(function (url, options, success, error) {
                error();
            });
            rasterizeHTMLInline.util.binaryAjax("url", {}, successCallback, errorCallback);
        });

        it("should circumvent caching if requested", function () {
            var ajaxSpy = spyOn(rasterizeHTMLInline.util, "ajax");

            rasterizeHTMLInline.util.binaryAjax("url", {cache: false}, function () {}, function () {});

            expect(ajaxSpy).toHaveBeenCalledWith("url", {
                mimeType : jasmine.any(String),
                cache: false
            }, jasmine.any(Function), jasmine.any(Function));
        });

    });

    describe("loadAndExecuteJavascript", function () {
        it("should load an URL and execute the included JS", function () {
            var html = "<html><body><script>document.body.innerHTML = 'dynamic content';</script></body></html>",
                the_result = null;

            rasterizeHTMLInline.util.loadAndExecuteJavascript(html, function (result) {
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
            var html = "<html><body><script>document.body.innerHTML = 'dynamic content';</script></body></html>",
                finished = false;

            rasterizeHTMLInline.util.loadAndExecuteJavascript(html, function () {
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

    describe("getDataURIForImageURL", function () {
        var binaryAjaxSpy;

        beforeEach(function () {
            binaryAjaxSpy = spyOn(rasterizeHTMLInline.util, "binaryAjax");
        });

        it("should return an image as data: URI", function () {
            var returnedDataURI = null;

            binaryAjaxSpy.andCallFake(function (url, options, successCallback) {
                if (url === 'green.png') {
                    successCallback("fakeImageContent");
                }
            });

            rasterizeHTMLInline.util.getDataURIForImageURL("green.png", {}, function (dataURI) {
                returnedDataURI = dataURI;
            }, function () {});

            expect(returnedDataURI).toEqual('data:image/png;base64,' + btoa('fakeImageContent'));
            expect(binaryAjaxSpy).toHaveBeenCalledWith('green.png', {}, jasmine.any(Function), jasmine.any(Function));
        });

        it("should return an error if the image could not be located due to a REST error", function () {
            var errorCallback = jasmine.createSpy("errorCallback"),
                successCallback = jasmine.createSpy("successCallback");

            binaryAjaxSpy.andCallFake(function (url, options, successCallback, errorCallback) {
                errorCallback();
            });

            rasterizeHTMLInline.util.getDataURIForImageURL("image_does_not_exist.png", {}, successCallback, errorCallback);

            expect(errorCallback).toHaveBeenCalled();
            expect(successCallback).not.toHaveBeenCalled();
        });

        it("should circumvent caching if requested", function () {
            rasterizeHTMLInline.util.getDataURIForImageURL("image.png", {cache: false}, function () {}, function () {});

            expect(binaryAjaxSpy).toHaveBeenCalledWith('image.png', {cache: false}, jasmine.any(Function), jasmine.any(Function));
        });

    });

    describe("extractCssUrl", function () {
        it("should extract a CSS URL", function () {
            var url = rasterizeHTMLInline.util.extractCssUrl('url(path/file.png)');
            expect(url).toEqual("path/file.png");
        });

        it("should handle double quotes", function () {
            var url = rasterizeHTMLInline.util.extractCssUrl('url("path/file.png")');
            expect(url).toEqual("path/file.png");
        });

        it("should handle single quotes", function () {
            var url = rasterizeHTMLInline.util.extractCssUrl("url('path/file.png')");
            expect(url).toEqual("path/file.png");
        });

        it("should handle whitespace", function () {
            var url = rasterizeHTMLInline.util.extractCssUrl('url(   path/file.png )');
            expect(url).toEqual("path/file.png");
        });

        it("should also handle tab, line feed, carriage return and form feed", function () {
            var url = rasterizeHTMLInline.util.extractCssUrl('url(\t\r\f\npath/file.png\t\r\f\n)');
            expect(url).toEqual("path/file.png");
        });

        it("should keep any other whitspace", function () {
            var url = rasterizeHTMLInline.util.extractCssUrl('url(\u2003\u3000path/file.png)');
            expect(url).toEqual("\u2003\u3000path/file.png");
        });

        it("should handle whitespace with double quotes", function () {
            var url = rasterizeHTMLInline.util.extractCssUrl('url( "path/file.png"  )');
            expect(url).toEqual("path/file.png");
        });

        it("should handle whitespace with single quotes", function () {
            var url = rasterizeHTMLInline.util.extractCssUrl("url( 'path/file.png'  )");
            expect(url).toEqual("path/file.png");
        });

        it("should extract a data URI", function () {
            var url = rasterizeHTMLInline.util.extractCssUrl('url("data:image/png;base64,soMEfAkebASE64=")');
            expect(url).toEqual("data:image/png;base64,soMEfAkebASE64=");
        });

        it("should throw an exception on invalid CSS URL", function () {
            expect(function () {
                rasterizeHTMLInline.util.extractCssUrl('invalid_stuff');
            }).toThrow(new Error("Invalid url"));
        });
    });

    describe("parseOptionalParameters", function () {
        var options, callback;

        beforeEach(function () {
            options = {opt: "ions"};
            callback = jasmine.createSpy("callback");
        });

        it("should copy options", function () {
            var params = rasterizeHTMLInline.util.parseOptionalParameters(options, callback);
            expect(params.options).toEqual(options);
            expect(params.options).not.toBe(options);
        });

        it("should return all parameters", function () {
            var params = rasterizeHTMLInline.util.parseOptionalParameters(options, callback);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(callback);
        });

        it("should make options optional", function () {
            var params = rasterizeHTMLInline.util.parseOptionalParameters(callback);
            expect(params.options).toEqual({});
            expect(params.callback).toBe(callback);
        });

        it("should make callback optional", function () {
            var params = rasterizeHTMLInline.util.parseOptionalParameters(options);
            expect(params.options).toEqual(options);
            expect(params.callback).toBe(null);
        });

        it("should work with empty parameter list", function () {
            var params = rasterizeHTMLInline.util.parseOptionalParameters();
            expect(params.options).toEqual({});
            expect(params.callback).toBe(null);
        });

    });
});
