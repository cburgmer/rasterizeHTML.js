describe("Inline external resources", function () {
    var doc;

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        this.addMatchers(imagediff.jasmine);

        setFixtures(
            '<img id="referenceImage1" src="fixtures/rednblue.png" alt="test image"/>' +
            '<img id="referenceImage2" src="fixtures/green.png" alt="test image"/>'
        );
    });

    describe("img inline", function () {
        var getLocalDocumentImage = function (image, finishHandler) {
            var img = new window.Image();

            img.onload = function () {
                finishHandler(img);
            };
            img.src = image.attributes.src.nodeValue; // Chrome 19 sets image.src to ""
        };

        it("should load external images", function () {
            var inlineFinished = false,
                localImg = null;

            doc.body.innerHTML = '<img id="image" src="fixtures/rednblue.png" alt="test image"/>';

            HTML2Canvas.loadAndInlineImages(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "HTML2Canvas.loadAndInlineImages", 2000);

            // Gecko & Webkit won't allow direct comparison of images, need to get local first
            runs(function () {
                getLocalDocumentImage(doc.getElementById("image"), function (img) { localImg = img; });
            });

            waitsFor(function () {
                return localImg !== null;
            }, "Move of image to local", 200);

            runs(function () {
                expect(doc.getElementById("image").src).toMatch(/^data:image\/png;base64,/);
                expect(localImg).toImageDiffEqual(window.document.getElementById("referenceImage1"));
            });
        });

        it("should load multiple external images", function () {
            var inlineFinished = false,
                localImg1 = null,
                localImg2 = null;

            doc.body.innerHTML = (
                    '<img id="image1" src="fixtures/rednblue.png" alt="test image"/>' +
                    '<img id="image2" src="fixtures/green.png" alt="test image"/>'
                );

            HTML2Canvas.loadAndInlineImages(doc, function () { inlineFinished = true; });

            waitsFor(function () {
                return inlineFinished;
            }, "HTML2Canvas.loadAndInlineImages", 2000);

            // Gecko & Webkit won't allow direct comparison of images, need to get local first
            runs(function () {
                getLocalDocumentImage(doc.getElementById("image1"), function (img) { localImg1 = img; });
                getLocalDocumentImage(doc.getElementById("image2"), function (img) { localImg2 = img; });
            });

            waitsFor(function () {
                return localImg1 !== null && localImg2 !== null;
            }, "Move of image to local", 200);

            runs(function () {
                expect(doc.getElementById("image1").src).toMatch(/^data:image\/png;base64,/);
                expect(localImg1).toImageDiffEqual(window.document.getElementById("referenceImage1"));
                expect(doc.getElementById("image2").src).toMatch(/^data:image\/png;base64,/);
                expect(localImg2).toImageDiffEqual(window.document.getElementById("referenceImage2"));
            });
        });
    });
});
