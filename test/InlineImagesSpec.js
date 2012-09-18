describe("Image inline", function () {
    var firstImage = "firstImage.png",
        secondImage = "secondImage.png",
        firstImageDataURI = "mock_data_URI_of_the_first_image",
        secondImageDataURI = "mock_data_URI_of_the_second_image",
        joinUrlSpy, getDataURIForImageURLSpy, doc;

    var setUpGetDataURIForImageURLSpyToRouteFirstAndSecondImage = function() {
        getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback, errorCallback) {
            if (url === firstImage) {
                successCallback(firstImageDataURI);
            } else if (url === secondImage) {
                successCallback(secondImageDataURI);
            }
        });
    };

    beforeEach(function () {
        joinUrlSpy = spyOn(rasterizeHTML.util, "joinUrl");
        getDataURIForImageURLSpy = spyOn(rasterizeHTML.util, "getDataURIForImageURL");

        doc = document.implementation.createHTMLDocument("");
    });

    it("should load external images", function () {
        var inlineFinished = false;
        setUpGetDataURIForImageURLSpyToRouteFirstAndSecondImage();

        doc.body.innerHTML = '<img id="image" src="' + firstImage + '" alt="test image"/>';

        rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            expect(doc.getElementById("image").attributes.src.nodeValue).toEqual(firstImageDataURI);
        });
    });

    it("should load multiple external images", function () {
        var inlineFinished = false;
        setUpGetDataURIForImageURLSpyToRouteFirstAndSecondImage();

        doc.body.innerHTML = (
            '<img id="image1" src="' + firstImage + '" alt="test image"/>' +
            '<img id="image2" src="' + secondImage +'" alt="test image"/>'
        );

        rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            expect(doc.getElementById("image1").attributes.src.nodeValue).toEqual(firstImageDataURI);
            expect(doc.getElementById("image2").attributes.src.nodeValue).toEqual(secondImageDataURI);
        });
    });

    it("should finish if no images found", function () {
        var inlineFinished = false;

        rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);
    });

    it("should not touch an already inlined image", function () {
        var inlineFinished = false;

        doc.body.innerHTML = '<img id="image" src="data:image/png;base64,soMEfAkebASE64=" alt="test image"/>';

        rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            expect(doc.getElementById("image").src).toEqual('data:image/png;base64,soMEfAkebASE64=');
        });
    });

    it("should respect the document's baseURI when loading the image", function () {
        var inlineFinished = false;

        doc = rasterizeHTMLTestHelper.readDocumentFixture("image.html");
        getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback, errorCallback) {
            successCallback();
        });

        rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "rednblue.png");
        });
    });

    it("should respect optional baseUrl when loading the image", function () {
        var inlineFinished = false;

        doc = rasterizeHTMLTestHelper.readDocumentFixtureWithoutBaseURI("image.html");
        getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback, errorCallback) {
            successCallback();
        });

        rasterizeHTML.loadAndInlineImages(doc, {baseUrl: "aBaseUrl"}, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            expect(joinUrlSpy).toHaveBeenCalledWith("aBaseUrl", "rednblue.png");
        });
    });

    it("should favour explicit baseUrl over document.baseURI when loading the image", function () {
        var inlineFinished = false,
            baseUrl = "aBaseUrl";
        getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback, errorCallback) {
            successCallback();
        });

        doc = rasterizeHTMLTestHelper.readDocumentFixture("image.html");
        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        rasterizeHTML.loadAndInlineImages(doc, {baseUrl: baseUrl}, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            expect(joinUrlSpy).toHaveBeenCalledWith(baseUrl, "rednblue.png");
        });
    });

    it("should circumvent caching if requested", function () {
        var inlineFinished = false;
        setUpGetDataURIForImageURLSpyToRouteFirstAndSecondImage();

        doc.body.innerHTML = '<img id="image" src="' + firstImage + '" alt="test image"/>';

        rasterizeHTML.loadAndInlineImages(doc, {cache: false}, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            expect(getDataURIForImageURLSpy).toHaveBeenCalledWith(jasmine.any(String), {cache: false}, jasmine.any(Function), jasmine.any(Function));
        });
    });

    it("should not circumvent caching by default", function () {
        var inlineFinished = false;
        setUpGetDataURIForImageURLSpyToRouteFirstAndSecondImage();

        doc.body.innerHTML = '<img id="image" src="' + firstImage + '" alt="test image"/>';

        rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            expect(getDataURIForImageURLSpy).toHaveBeenCalledWith(jasmine.any(String), {cache: true}, jasmine.any(Function), jasmine.any(Function));
        });
    });

    describe("on errors", function () {
        var callback,
            imageThatDoesExist = "image_that_does_exist.png";

        beforeEach(function () {
            callback = jasmine.createSpy("callback");

            joinUrlSpy.andCallThrough();
            getDataURIForImageURLSpy.andCallFake(function (url, options, successCallback, errorCallback) {
                if (url === imageThatDoesExist) {
                    successCallback("theDataUri");
                } else {
                    errorCallback();
                }
            });
        });

        it("should report an error if an image could not be loaded", function () {
            doc.body.innerHTML = '<img src="image_that_doesnt_exist.png" alt="test image"/>';

            rasterizeHTML.loadAndInlineImages(doc, {baseUrl: "some_base_url/"}, callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineImages");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([{
                    resourceType: "image",
                    url: "some_base_url/image_that_doesnt_exist.png"
                }]);
            });
        });

        it("should only report a failing image as error", function () {
            doc.body.innerHTML = (
                '<img src="image_that_doesnt_exist.png" alt="test image"/>' +
                '<img src="' + imageThatDoesExist + '" alt="test image"/>'
            );

            rasterizeHTML.loadAndInlineImages(doc, callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineImages");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([{
                    resourceType: "image",
                    url: "image_that_doesnt_exist.png"
                }]);
            });
        });

        it("should report multiple failing images as error", function () {
            doc.body.innerHTML = (
                '<img src="image_that_doesnt_exist.png" alt="test image"/>' +
                '<img src="another_image_that_doesnt_exist.png" alt="test image"/>'
            );

            rasterizeHTML.loadAndInlineImages(doc, callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineImages");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
                expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
            });
        });

        it("should report an empty list for a successful image", function () {
            doc.body.innerHTML = ('<img src="' + imageThatDoesExist + '" alt="test image"/>');

            rasterizeHTML.loadAndInlineImages(doc, callback);

            waitsFor(function () {
                return callback.wasCalled;
            }, "rasterizeHTML.loadAndInlineImages");

            runs(function () {
                expect(callback).toHaveBeenCalledWith([]);
            });
        });
    });
});
