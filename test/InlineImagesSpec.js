describe("Image and image input inline", function () {
    var firstImage = "firstImage.png",
        secondImage = "secondImage.png",
        firstImageDataURI = "mock_data_URI_of_the_first_image",
        secondImageDataURI = "mock_data_URI_of_the_second_image",
        joinUrlSpy, getDataURIForImageURLSpy, doc;

    beforeEach(function () {
        joinUrlSpy = spyOn(rasterizeHTMLInline.util, "joinUrl");
        getDataURIForImageURLSpy = spyOn(rasterizeHTMLInline.util, "getDataURIForImageURL").andCallFake(function (url, options, successCallback) {
            if (url === firstImage) {
                successCallback(firstImageDataURI);
            } else if (url === secondImage) {
                successCallback(secondImageDataURI);
            } else {
                successCallback();
            }
        });

        doc = document.implementation.createHTMLDocument("");
    });

    it("should load an external image", function () {
        var callback = jasmine.createSpy("callback");

        doc.body.innerHTML = '<img id="image" src="' + firstImage + '" alt="test image"/>';

        rasterizeHTMLInline.loadAndInlineImages(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.getElementById("image").attributes.src.nodeValue).toEqual(firstImageDataURI);
    });

    it("should load an input with type image", function () {
        var callback = jasmine.createSpy("callback");

        doc.body.innerHTML = '<input type="image" id="input" src="' + firstImage + '" alt="test image"/>';

        rasterizeHTMLInline.loadAndInlineImages(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.getElementById("input").attributes.src.nodeValue).toEqual(firstImageDataURI);
    });

    it("should load multiple external images", function () {
        var callback = jasmine.createSpy("callback");

        doc.body.innerHTML = (
            '<img id="image1" src="' + firstImage + '" alt="test image"/>' +
            '<img id="image2" src="' + secondImage +'" alt="test image"/>'
        );

        rasterizeHTMLInline.loadAndInlineImages(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.getElementById("image1").attributes.src.nodeValue).toEqual(firstImageDataURI);
        expect(doc.getElementById("image2").attributes.src.nodeValue).toEqual(secondImageDataURI);
    });

    it("should finish if no images found", function () {
        var callback = jasmine.createSpy("callback");

        rasterizeHTMLInline.loadAndInlineImages(doc, callback);

        expect(callback).toHaveBeenCalled();
    });

    it("should not touch an already inlined image", function () {
        var callback = jasmine.createSpy("callback");

        doc.body.innerHTML = '<img id="image" src="data:image/png;base64,soMEfAkebASE64=" alt="test image"/>';

        rasterizeHTMLInline.loadAndInlineImages(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.getElementById("image").src).toEqual('data:image/png;base64,soMEfAkebASE64=');
    });

    it("should not touch an image without a src", function () {
        var callback = jasmine.createSpy("callback");

        doc.body.innerHTML = '<img id="image">';

        rasterizeHTMLInline.loadAndInlineImages(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.getElementById("image").parentNode.innerHTML).toEqual('<img id="image">');
    });

    it("should respect the document's baseURI when loading the image", function () {
        var callback = jasmine.createSpy("callback"),
            getDocumentBaseUrlSpy = spyOn(rasterizeHTMLInline.util, 'getDocumentBaseUrl').andCallThrough();

        doc = rasterizeHTMLTestHelper.readDocumentFixture("image.html");

        rasterizeHTMLInline.loadAndInlineImages(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(getDataURIForImageURLSpy.mostRecentCall.args[1].baseUrl).toEqual(doc.baseURI);
        expect(getDocumentBaseUrlSpy).toHaveBeenCalledWith(doc);
    });

    it("should respect optional baseUrl when loading the image", function () {
        var callback = jasmine.createSpy("callback");

        doc = rasterizeHTMLTestHelper.readDocumentFixtureWithoutBaseURI("image.html");

        rasterizeHTMLInline.loadAndInlineImages(doc, {baseUrl: "aBaseUrl"}, callback);

        expect(callback).toHaveBeenCalled();

        expect(getDataURIForImageURLSpy.mostRecentCall.args[1].baseUrl).toEqual("aBaseUrl");
    });

    it("should favour explicit baseUrl over document.baseURI when loading the image", function () {
        var callback = jasmine.createSpy("callback"),
            baseUrl = "aBaseUrl";

        doc = rasterizeHTMLTestHelper.readDocumentFixture("image.html");
        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        rasterizeHTMLInline.loadAndInlineImages(doc, {baseUrl: baseUrl}, callback);

        expect(callback).toHaveBeenCalled();

        expect(getDataURIForImageURLSpy.mostRecentCall.args[1].baseUrl).toEqual(baseUrl);
    });

    it("should circumvent caching if requested", function () {
        var callback = jasmine.createSpy("callback");

        doc.body.innerHTML = '<img id="image" src="' + firstImage + '" alt="test image"/>';

        rasterizeHTMLInline.loadAndInlineImages(doc, {cache: 'none'}, callback);

        expect(callback).toHaveBeenCalled();

        expect(getDataURIForImageURLSpy).toHaveBeenCalledWith(jasmine.any(String), {cache: 'none'}, jasmine.any(Function), jasmine.any(Function));
    });

    it("should not circumvent caching by default", function () {
        var callback = jasmine.createSpy("callback");

        doc.body.innerHTML = '<img id="image" src="' + firstImage + '" alt="test image"/>';

        rasterizeHTMLInline.loadAndInlineImages(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(getDataURIForImageURLSpy).toHaveBeenCalledWith(jasmine.any(String), {}, jasmine.any(Function), jasmine.any(Function));
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

            rasterizeHTMLInline.loadAndInlineImages(doc, {baseUrl: "some_base_url/"}, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "image",
                url: "some_base_url/image_that_doesnt_exist.png",
                msg: "Unable to load image some_base_url/image_that_doesnt_exist.png"
            }]);
        });

        it("should only report a failing image as error", function () {
            doc.body.innerHTML = (
                '<img src="image_that_doesnt_exist.png" alt="test image"/>' +
                '<img src="' + imageThatDoesExist + '" alt="test image"/>'
            );

            rasterizeHTMLInline.loadAndInlineImages(doc, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "image",
                url: "image_that_doesnt_exist.png",
                msg: jasmine.any(String)
            }]);
        });

        it("should report multiple failing images as error", function () {
            doc.body.innerHTML = (
                '<img src="image_that_doesnt_exist.png" alt="test image"/>' +
                '<img src="another_image_that_doesnt_exist.png" alt="test image"/>'
            );

            rasterizeHTMLInline.loadAndInlineImages(doc, callback);

            expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
            expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
        });

        it("should report an empty list for a successful image", function () {
            doc.body.innerHTML = ('<img src="' + imageThatDoesExist + '" alt="test image"/>');

            rasterizeHTMLInline.loadAndInlineImages(doc, callback);

            expect(callback).toHaveBeenCalledWith([]);
        });
    });
});
