describe("Image and image input inline", function () {
    var firstImage = "firstImage.png",
        secondImage = "secondImage.png",
        firstImageDataURI = "mock_data_URI_of_the_first_image",
        secondImageDataURI = "mock_data_URI_of_the_second_image",
        joinUrlSpy, getDataURIForImageURLSpy, doc,
        urlMocks = {};

    var setupGetDataURIForImageURLMock = function () {
        return spyOn(rasterizeHTMLInline.util, "getDataURIForImageURL").andCallFake(function (url) {
            var defer = ayepromise.defer();
            if (urlMocks[url] !== undefined) {
                defer.resolve(urlMocks[url]);
            } else {
                defer.reject();
            }
            return defer.promise;
        });
    };

    var mockGetDataURIForImageURL = function (imageUrl, imageDataUri) {
        urlMocks[imageUrl] = imageDataUri;
    };

    beforeEach(function () {
        joinUrlSpy = spyOn(rasterizeHTMLInline.util, "joinUrl");
        getDataURIForImageURLSpy = setupGetDataURIForImageURLMock();

        doc = document.implementation.createHTMLDocument("");
    });

    it("should load an external image", function (done) {
        mockGetDataURIForImageURL(firstImage, firstImageDataURI);
        doc.body.innerHTML = '<img id="image" src="' + firstImage + '" alt="test image"/>';

        rasterizeHTMLInline.loadAndInlineImages(doc, {}).then(function () {
            expect(doc.getElementById("image").attributes.src.nodeValue).toEqual(firstImageDataURI);

            done();
        });
    });

    it("should load an input with type image", function (done) {
        mockGetDataURIForImageURL(firstImage, firstImageDataURI);
        doc.body.innerHTML = '<input type="image" id="input" src="' + firstImage + '" alt="test image"/>';

        rasterizeHTMLInline.loadAndInlineImages(doc, {}).then(function () {
            expect(doc.getElementById("input").attributes.src.nodeValue).toEqual(firstImageDataURI);

            done();
        });
    });

    it("should load multiple external images", function (done) {
        mockGetDataURIForImageURL(firstImage, firstImageDataURI);
        mockGetDataURIForImageURL(secondImage, secondImageDataURI);
        doc.body.innerHTML = (
            '<img id="image1" src="' + firstImage + '" alt="test image"/>' +
            '<img id="image2" src="' + secondImage +'" alt="test image"/>'
        );

        rasterizeHTMLInline.loadAndInlineImages(doc, {}).then(function () {
            expect(doc.getElementById("image1").attributes.src.nodeValue).toEqual(firstImageDataURI);
            expect(doc.getElementById("image2").attributes.src.nodeValue).toEqual(secondImageDataURI);

            done();
        });
    });

    it("should finish if no images found", function (done) {
        rasterizeHTMLInline.loadAndInlineImages(doc, {}).then(done);
    });

    it("should not touch an already inlined image", function (done) {
        doc.body.innerHTML = '<img id="image" src="data:image/png;base64,soMEfAkebASE64=" alt="test image"/>';

        rasterizeHTMLInline.loadAndInlineImages(doc, {}).then(function () {
            expect(doc.getElementById("image").src).toEqual('data:image/png;base64,soMEfAkebASE64=');

            done();
        });
    });

    it("should not touch an image without a src", function (done) {
        doc.body.innerHTML = '<img id="image">';

        rasterizeHTMLInline.loadAndInlineImages(doc, {}).then(function () {
            expect(doc.getElementById("image").parentNode.innerHTML).toEqual('<img id="image">');

            done();
        });
    });

    it("should respect the document's baseURI when loading the image", function () {
        var getDocumentBaseUrlSpy = spyOn(rasterizeHTMLInline.util, 'getDocumentBaseUrl').andCallThrough();

        doc = rasterizeHTMLTestHelper.readDocumentFixture("image.html");

        rasterizeHTMLInline.loadAndInlineImages(doc, {});

        expect(getDataURIForImageURLSpy.mostRecentCall.args[1].baseUrl).toEqual(doc.baseURI);
        expect(getDocumentBaseUrlSpy).toHaveBeenCalledWith(doc);
    });

    it("should respect optional baseUrl when loading the image", function () {
        doc = rasterizeHTMLTestHelper.readDocumentFixtureWithoutBaseURI("image.html");

        rasterizeHTMLInline.loadAndInlineImages(doc, {baseUrl: "aBaseUrl"});

        expect(getDataURIForImageURLSpy.mostRecentCall.args[1].baseUrl).toEqual("aBaseUrl");
    });

    it("should favour explicit baseUrl over document.baseURI when loading the image", function () {
        var baseUrl = "aBaseUrl";

        doc = rasterizeHTMLTestHelper.readDocumentFixture("image.html");
        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        rasterizeHTMLInline.loadAndInlineImages(doc, {baseUrl: baseUrl});

        expect(getDataURIForImageURLSpy.mostRecentCall.args[1].baseUrl).toEqual(baseUrl);
    });

    it("should circumvent caching if requested", function () {
        doc.body.innerHTML = '<img id="image" src="' + firstImage + '" alt="test image"/>';

        rasterizeHTMLInline.loadAndInlineImages(doc, {cache: 'none'});

        expect(getDataURIForImageURLSpy).toHaveBeenCalledWith(jasmine.any(String), {cache: 'none'});
    });

    it("should not circumvent caching by default", function () {
        doc.body.innerHTML = '<img id="image" src="' + firstImage + '" alt="test image"/>';

        rasterizeHTMLInline.loadAndInlineImages(doc, {});

        expect(getDataURIForImageURLSpy).toHaveBeenCalledWith(jasmine.any(String), {});
    });

    describe("on errors", function () {
        var imageThatDoesExist = "image_that_does_exist.png";

        var deleteAdditionalFieldsFromErrorsUnderPhantomJS = function (error) {
            var newErrorObject = {},
                additionalKeys = ['sourceId', 'sourceURL', 'stack', 'stackArray', 'line'];

            Object.keys(error).forEach(function (key) {
                if (additionalKeys.indexOf(key) === -1) {
                    newErrorObject[key] = error[key];
                }
            });
            return newErrorObject;
        };

        beforeEach(function () {
            joinUrlSpy.andCallThrough();

            mockGetDataURIForImageURL(imageThatDoesExist, "theDataUri");
        });

        it("should report an error if an image could not be loaded", function (done) {
            doc.body.innerHTML = '<img src="image_that_doesnt_exist.png" alt="test image"/>';

            rasterizeHTMLInline.loadAndInlineImages(doc, {baseUrl: "some_base_url/"}).then(function (errors) {
                errors[0] = deleteAdditionalFieldsFromErrorsUnderPhantomJS(errors[0]);

                expect(errors).toEqual([{
                    resourceType: "image",
                    url: "some_base_url/image_that_doesnt_exist.png",
                    msg: "Unable to load image some_base_url/image_that_doesnt_exist.png"
                }]);

                done();
            });
        });

        it("should only report a failing image as error", function (done) {
            doc.body.innerHTML = (
                '<img src="image_that_doesnt_exist.png" alt="test image"/>' +
                '<img src="' + imageThatDoesExist + '" alt="test image"/>'
            );

            rasterizeHTMLInline.loadAndInlineImages(doc, {}).then(function (errors) {
                errors[0] = deleteAdditionalFieldsFromErrorsUnderPhantomJS(errors[0]);

                expect(errors).toEqual([{
                    resourceType: "image",
                    url: "image_that_doesnt_exist.png",
                    msg: jasmine.any(String)
                }]);

                done();
            });
        });

        it("should report multiple failing images as error", function (done) {
            doc.body.innerHTML = (
                '<img src="image_that_doesnt_exist.png" alt="test image"/>' +
                '<img src="another_image_that_doesnt_exist.png" alt="test image"/>'
            );

            rasterizeHTMLInline.loadAndInlineImages(doc, {}).then(function (errors) {
                expect(errors).toEqual([jasmine.any(Object), jasmine.any(Object)]);
                expect(errors[0]).not.toEqual(errors[1]);

                done();
            });
        });

        it("should report an empty list for a successful image", function (done) {
            doc.body.innerHTML = ('<img src="' + imageThatDoesExist + '" alt="test image"/>');

            rasterizeHTMLInline.loadAndInlineImages(doc, {}).then(function (errors) {
                expect(errors).toEqual([]);

                done();
            });
        });
    });
});
