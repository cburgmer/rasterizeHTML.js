describe("Inline utilities function", function () {
    describe("clone", function () {
        it("should create a copy of the given object", function () {
            var input = {anOption: '1', yetAnotherOption: '21'},
                output;

            output = rasterizeHTMLInline.util.clone(input);

            expect(input).toEqual(output);
            expect(input).not.toBe(output);
        });
    });

    describe("cloneArray", function () {
        it("should create a copy of the given list", function () {
            var input = [1, 2, 3],
                output;

            output = rasterizeHTMLInline.util.cloneArray(input);

            expect(input).toEqual(output);
            expect(input).not.toBe(output);
        });
    });

    describe("getDocumentBaseUrl", function () {
        var endsWith = function (str, matchStr) {
            return str.substr(-matchStr.length) === matchStr;
        };

        it("should return a document's base url", function () {
            var fixturePath = jasmine.getFixtures().fixturesPath + "image.html",
                doc = rasterizeHTMLTestHelper.readDocumentFixture("image.html"),
                url, nonQueryPart;

            url = rasterizeHTMLInline.util.getDocumentBaseUrl(doc);
            nonQueryPart = url.split('?')[0];

            expect(endsWith(nonQueryPart, fixturePath)).toBeTruthy();
        });

        it("should return null if document has no base url", function () {
            var doc = document.implementation.createHTMLDocument(""),
                url;

            url = rasterizeHTMLInline.util.getDocumentBaseUrl(doc);

            expect(url).toBe(null);
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

        it("should ignore an undefined base", function () {
            var url = rasterizeHTMLInline.util.joinUrl(undefined, "aFile");
            expect(url).toEqual("aFile");
        });

        it("should keep a relative base URL", function () {
            var url = rasterizeHTMLInline.util.joinUrl("../rel/path/", "the_relative_url");
            expect(url).toEqual("../rel/path/the_relative_url");
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
                rasterizeHTMLInline.util.ajax("non_existing_url.html", {cache: 'none'}, function () {}, function () {});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', jasmine.any(String), true);
                expect(ajaxRequest.open.mostRecentCall.args[1]).toMatch(/^non_existing_url.html\?_=[0123456789]+$/);
            });

            it("should attach an unique parameter to the given URL to circumvent caching if requested (legacy: 'false')", function () {
                rasterizeHTMLInline.util.ajax("non_existing_url.html", {cache: false}, function () {}, function () {});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', jasmine.any(String), true);
                expect(ajaxRequest.open.mostRecentCall.args[1]).toMatch(/^non_existing_url.html\?_=[0123456789]+$/);
            });

            it("should not attach an unique parameter to the given URL by default", function () {
                rasterizeHTMLInline.util.ajax("non_existing_url.html", {}, function () {}, function () {});

                expect(ajaxRequest.open).toHaveBeenCalledWith('GET', "non_existing_url.html", true);
            });

            it("should allow caching for repeated calls if requested", function () {
                var dateNowSpy = spyOn(window.Date, 'now').andReturn(42);

                rasterizeHTMLInline.util.ajax("non_existing_url.html", {cache: 'none'}, function () {}, function () {});

                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=42');

                dateNowSpy.andReturn(43);
                rasterizeHTMLInline.util.ajax("non_existing_url.html", {cache: 'repeated'}, function () {}, function () {});
                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=42');

                expect(dateNowSpy.callCount).toEqual(1);
            });

            it("should not cache repeated calls by default", function () {
                var dateNowSpy = spyOn(window.Date, 'now').andReturn(42);
                rasterizeHTMLInline.util.ajax("non_existing_url.html", {cache: 'none'}, function () {}, function () {});

                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=42');

                dateNowSpy.andReturn(43);
                rasterizeHTMLInline.util.ajax("non_existing_url.html", {cache: 'none'}, function () {}, function () {});
                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('non_existing_url.html?_=43');
            });

            it("should force mime type if requested", function () {
                rasterizeHTMLInline.util.ajax("non_existing_url.html", {mimeType: "42"}, function () {}, function () {});

                expect(ajaxRequest.overrideMimeType).toHaveBeenCalledWith('42');
            });

            it("should load URLs relative to baseUrl", function () {
                rasterizeHTMLInline.util.ajax("relative/url.png", {baseUrl: "http://example.com/"}, function () {}, function () {});

                expect(ajaxRequest.open.mostRecentCall.args[1]).toEqual('http://example.com/relative/url.png');

                expect(rasterizeHTMLInline.util.joinUrl).toHaveBeenCalledWith("http://example.com/", "relative/url.png");
            });
        });

    });

    describe("binaryAjax", function () {
        beforeEach(function () {
            spyOn(rasterizeHTMLInline.util, "joinUrl").andCallFake(function (baseUrl, url) {
                return url;
            });
        });

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

            rasterizeHTMLInline.util.binaryAjax("url", {cache: 'none'}, function () {}, function () {});

            expect(ajaxSpy).toHaveBeenCalledWith("url", {
                mimeType : jasmine.any(String),
                cache: 'none'
            }, jasmine.any(Function), jasmine.any(Function));
        });

        it("should cache by default", function () {
            var ajaxSpy = spyOn(rasterizeHTMLInline.util, "ajax");

            rasterizeHTMLInline.util.binaryAjax("url", {}, function () {}, function () {});

            expect(ajaxSpy).toHaveBeenCalledWith("url", {
                mimeType : jasmine.any(String)
            }, jasmine.any(Function), jasmine.any(Function));
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

        it("should return a SVG as data: URI", function () {
            var returnedDataURI = null,
                svgImageHead = '<?xml version="1.0" encoding="utf-8"?>';

            binaryAjaxSpy.andCallFake(function (url, options, successCallback) {
                if (url === 'green.svg') {
                    successCallback(svgImageHead);
                }
            });

            rasterizeHTMLInline.util.getDataURIForImageURL("green.svg", {}, function (dataURI) {
                returnedDataURI = dataURI;
            }, function () {});

            expect(returnedDataURI).toEqual('data:image/svg+xml;base64,' + btoa(svgImageHead));
        });

        it("should return a SVG as data: URI without XML head", function () {
            var returnedDataURI = null,
                svgImageHead = '<svg xmlns="http://www.w3.org/2000/svg">';

            binaryAjaxSpy.andCallFake(function (url, options, successCallback) {
                if (url === 'green.svg') {
                    successCallback(svgImageHead);
                }
            });

            rasterizeHTMLInline.util.getDataURIForImageURL("green.svg", {}, function (dataURI) {
                returnedDataURI = dataURI;
            }, function () {});

            expect(returnedDataURI).toEqual('data:image/svg+xml;base64,' + btoa(svgImageHead));
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
            rasterizeHTMLInline.util.getDataURIForImageURL("image.png", {cache: 'none'}, function () {}, function () {});

            expect(binaryAjaxSpy).toHaveBeenCalledWith('image.png', {cache: 'none'}, jasmine.any(Function), jasmine.any(Function));
        });

    });

    describe("memoize", function () {
        var func, callback, aResult, anotherResult, memo, hasher;

        beforeEach(function () {
            memo = {};

            aResult = "the function result";
            anotherResult = "another function result";
            func = jasmine.createSpy('func').andCallFake(function (_1, _2, _3, cllbck) {
                cllbck(aResult, anotherResult);
            });
            callback = jasmine.createSpy('callback');
            hasher = function (x) { return x; };
        });

        it("should call the memoized function for the first time", function () {
            var memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo);

            expect(func).not.toHaveBeenCalled();
            memoized('a parameter', 1, 'and a 3rd parameter', callback);

            expect(func).toHaveBeenCalledWith('a parameter', 1, 'and a 3rd parameter', jasmine.any(Function));
        });

        it("should call the callback with the functions result", function () {
            var memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo);

            memoized('a parameter', 1, 'and a 3rd parameter', callback);
            expect(callback).toHaveBeenCalledWith(aResult, anotherResult);
        });

        it("should not call the memoized function for a second time with the same parameters", function () {
            var memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo);

            memoized('a parameter', 1, 'and a 3rd parameter', callback);
            func.reset();
            memoized('a parameter', 1, 'and a 3rd parameter', callback);

            expect(func).not.toHaveBeenCalled();
        });

        it("should call the callback with the functions results for the second time", function () {
            var memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo);

            memoized('a parameter', 1, 'and a 3rd parameter', callback);
            callback.reset();
            memoized('a parameter', 1, 'and a 3rd parameter', callback);
            expect(callback).toHaveBeenCalledWith(aResult, anotherResult);
        });

        it("should call the memoized function again with different parameters", function () {
            var memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo);

            memoized('a parameter', 1, 'and a 3rd parameter', callback);
            func.reset();
            memoized('another parameter', 1, 2, callback);

            expect(func).toHaveBeenCalledWith('another parameter', 1, 2, jasmine.any(Function));
        });

        it("should memoize different functions independently", function () {
            var func2 = jasmine.createSpy('func2').andCallFake(function (_1, _2, _3, cllbck) {
                    cllbck('yet another result');
                }),
                callback2 = jasmine.createSpy('callback2'),
                memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo),
                memoized2 = rasterizeHTMLInline.util.memoize(func2, hasher, memo);

            memoized('a parameter', 1, 'and a 3rd parameter', callback);
            memoized2('a parameter', 1, 'and a 3rd parameter', callback2);

            expect(func2).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledWith('yet another result');
        });

        it("should memoize across the same memo objects", function () {
            var memoized1 = rasterizeHTMLInline.util.memoize(func, hasher, memo),
                memoized2 = rasterizeHTMLInline.util.memoize(func, hasher, memo);

            memoized1('a parameter', 1, 'and a 3rd parameter', callback);
            func.reset();
            memoized2('a parameter', 1, 'and a 3rd parameter', callback);

            expect(func).not.toHaveBeenCalled();
        });

        it("should not memoize across different memo objects", function () {
            var memoized1 = rasterizeHTMLInline.util.memoize(func, hasher, memo),
                memoized2 = rasterizeHTMLInline.util.memoize(func, hasher, {});

            memoized1('a parameter', 1, 'and a 3rd parameter', callback);
            func.reset();
            memoized2('a parameter', 1, 'and a 3rd parameter', callback);

            expect(func).toHaveBeenCalledWith('a parameter', 1, 'and a 3rd parameter', jasmine.any(Function));
        });

        it("should use hash function result when comparing parameter keys with disjunct values", function () {
            var hasher = JSON.stringify,
                memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo);

            memoized({a: 1}, 1, 2, callback);
            func.reset();
            memoized({b: 2}, 1, 2, callback);
            expect(func).toHaveBeenCalled();
        });

        it("should use hash function result when comparing parameter keys with same values", function () {
            var hasher = function (x) { return typeof x === 'object' ? {} : x; },
                memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo);

            memoized({a: 1}, 1, 2, callback);
            func.reset();
            memoized({b: 2}, 1, 2, callback);
            expect(func).not.toHaveBeenCalled();
        });

        it("should throw an error if the memo is not an object", function () {
            try {
                rasterizeHTMLInline.util.memoize(func, hasher, 42);
                expect(true).toBe(false);
            } catch (e) {
                expect(e.message).toEqual("cacheBucket is not an object");
            }
        });

        describe('(successCallback, errorCallback) style function', function () {
            var errorCallback;

            beforeEach(function () {
                errorCallback = jasmine.createSpy('errorCallback');
            });

            it("should accept an errorCallback", function () {
                var func = jasmine.createSpy('func').andCallFake(function (_1, _2, successCallback) {
                        successCallback(aResult, anotherResult);
                    }),
                    memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo);

                memoized('a parameter', 1, callback, errorCallback);
                expect(func).toHaveBeenCalledWith('a parameter', 1, jasmine.any(Function), jasmine.any(Function));
                expect(callback).toHaveBeenCalledWith(aResult, anotherResult);
                expect(errorCallback).not.toHaveBeenCalled();
            });

            it("should correctly memoize a successful call", function () {
                var func = jasmine.createSpy('func').andCallFake(function (_1, _2, successCallback) {
                        successCallback(aResult, anotherResult);
                    }),
                    memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo);

                memoized('a parameter', 1, callback, errorCallback);
                expect(func).toHaveBeenCalledWith('a parameter', 1, jasmine.any(Function), jasmine.any(Function));

                func.reset();
                memoized('a parameter', 1, callback, function () {});
                expect(func).not.toHaveBeenCalled();
            });

            it("should delegate the errorCallback", function () {
                var func = jasmine.createSpy('func').andCallFake(function (_1, _2, successCallback, errorCallback) {
                        errorCallback(aResult, anotherResult);
                    }),
                    memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo);

                memoized('a parameter', 1, callback, errorCallback);
                expect(callback).not.toHaveBeenCalled();
                expect(errorCallback).toHaveBeenCalledWith(aResult, anotherResult);
            });

            it("should not memoize the return value if the error callback is triggered", function () {
                var func = jasmine.createSpy('func').andCallFake(function (_1, _2, successCallback, errorCallback) {
                        errorCallback(aResult, anotherResult);
                    }),
                    memoized = rasterizeHTMLInline.util.memoize(func, hasher, memo);

                memoized('a parameter', 1, callback, errorCallback);
                expect(func).toHaveBeenCalled();

                func.reset();
                memoized('a parameter', 1, callback, errorCallback);
                expect(func).toHaveBeenCalled();
            });
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
