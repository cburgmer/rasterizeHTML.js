describe("Image inline", function () {
    var joinUrlSpy = null,
        doc;

    beforeEach(function () {
        joinUrlSpy = spyOn(rasterizeHTML.util, "joinUrl");

        doc = document.implementation.createHTMLDocument("");

        this.addMatchers(imagediff.jasmine);

        setFixtures(
            '<img id="referenceImage1" src="fixtures/rednblue.png" alt="test image"/>' +
            '<img id="referenceImage2" src="fixtures/green.png" alt="test image"/>'
        );
    });

    it("should load external images", function () {
        var inlineFinished = false,
            image;

        doc.body.innerHTML = '<img id="image" src="fixtures/rednblue.png" alt="test image"/>';

        rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        // Gecko & Webkit won't allow direct comparison of images, need to get local first
        runs(function () {
            image = doc.getElementById("image");
            expect(image.src).toMatch(/^data:image\/png;base64,/);
            rasterizeHTMLTestHelper.compareImageToReference(image, "referenceImage1");
        });
    });

    it("should load multiple external images", function () {
        var inlineFinished = false,
            image1, image2;

        doc.body.innerHTML = (
            '<img id="image1" src="fixtures/rednblue.png" alt="test image"/>' +
            '<img id="image2" src="fixtures/green.png" alt="test image"/>'
        );

        rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            image1 = doc.getElementById("image1");
            image2 = doc.getElementById("image2");
            expect(image1.src).toMatch(/^data:image\/png;base64,/);
            rasterizeHTMLTestHelper.compareImageToReference(image1, "referenceImage1");
            expect(image2.src).toMatch(/^data:image\/png;base64,/);
            rasterizeHTMLTestHelper.compareImageToReference(image2, "referenceImage2");
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
        var inlineFinished = false,
            image;

        doc = rasterizeHTMLTestHelper.readDocumentFixture("image.html");
        joinUrlSpy.andCallThrough();

        rasterizeHTML.loadAndInlineImages(doc, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "rednblue.png");

            image = doc.getElementsByTagName("img")[0];
            expect(image.attributes.src.nodeValue).toMatch(/^data:image\/png;base64,/);
            rasterizeHTMLTestHelper.compareImageToReference(image, "referenceImage1");
        });
    });

    it("should respect optional baseUrl when loading the image", function () {
        var inlineFinished = false;

        doc = rasterizeHTMLTestHelper.readDocumentFixtureWithoutBaseURI("image.html");

        joinUrlSpy.andCallThrough();

        rasterizeHTML.loadAndInlineImages(doc, "./fixtures/", function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            expect(joinUrlSpy).toHaveBeenCalled();
            expect(joinUrlSpy).toHaveBeenCalledWith("./fixtures/", "rednblue.png");
        });
    });

    it("should favour explicit baseUrl over document.baseURI when loading the image", function () {
        var inlineFinished = false,
            baseUrl = "./fixtures/";

        doc = rasterizeHTMLTestHelper.readDocumentFixture("image.html");
        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        joinUrlSpy.andCallThrough();

        rasterizeHTML.loadAndInlineImages(doc, baseUrl, function () { inlineFinished = true; });

        waitsFor(function () {
            return inlineFinished;
        }, "rasterizeHTML.loadAndInlineImages", 2000);

        runs(function () {
            expect(joinUrlSpy).toHaveBeenCalledWith("./fixtures/", "rednblue.png");
        });
    });

    describe("Image inline error handling", function () {
        var callback;

        beforeEach(function () {
            callback = jasmine.createSpy("callback");

            joinUrlSpy.andCallThrough();
        });

        it("should report an error if an image could not be loaded", function () {
            doc.body.innerHTML = '<img src="image_that_doesnt_exist.png" alt="test image"/>';

            rasterizeHTML.loadAndInlineImages(doc, "some_base_url/", callback);

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
                '<img src="fixtures/green.png" alt="test image"/>'
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
            doc.body.innerHTML = ('<img src="fixtures/green.png" alt="test image"/>');

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
