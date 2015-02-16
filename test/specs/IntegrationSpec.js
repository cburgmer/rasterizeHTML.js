describe("Integration test", function () {
    "use strict";

    var canvas, finished, callback, referenceImg,
        width = 200,
        height = 100;

    var fulfilled = function (value) {
        var defer = ayepromise.defer();
        defer.resolve(value);
        return defer.promise;
    };

    var forceImageSizeForPlatformCompatibility = function (image) {
        image.width = width;
        image.height = height;
    };

    beforeEach(function () {
        jasmine.addMatchers(diffHelper.matcher);
        jasmine.addMatchers(imagediff.jasmine);

        canvas = $('<canvas width="' + width + '" height="' + height + '"></canvas>'); // Firefox adds a space between the divs and needs the canvas to fit horizontally for all content to be rendered

        referenceImg = $('<img src="'+ testHelper.fixturesPath + '/testResult.png" alt="test image"/>');

        finished = false;
        callback = jasmine.createSpy("callback").and.callFake(function () { finished = true; });
    });

    ifNotInWebkitIt("should take a document, inline all displayable content and render to the given canvas", function (done) {
        testHelper.readHTMLDocumentFixture("test.html").then(function (doc) {
            rasterizeHTML.drawDocument(doc, canvas.get(0), {
                    cache: 'none',
                    baseUrl: testHelper.fixturesPath, // we need this because of workAroundFirefoxNotLoadingStylesheetStyles()
                    active: '.bgimage',
                    hover: '.webfont',
                    clip: 'body'
                }).then(function (result) {
                    expect(result.errors).toEqual([]);
                    expect(result.svg).toMatch(/<svg[^]+body[^]+bgimage/);

                    forceImageSizeForPlatformCompatibility(result.image);
                    expect(result.image).toEqualImage(referenceImg.get(0), 2);

                    expect(canvas.get(0)).toEqualImage(referenceImg.get(0), 2);
                    // expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0), 10);

                    done();
            });
        });
    });

    ifNotInWebkitIt("should take a HTML string, inline all displayable content and render to the given canvas", function (done) {
        testHelper.readHTMLFixture("test.html").then(function (html) {
            rasterizeHTML.drawHTML(html, canvas.get(0), {
                baseUrl: testHelper.fixturesPath,
                cache: 'none',
                active: '.bgimage',
                hover: '.webfont',
                clip: 'body'
            }).then(function (result) {
                expect(result.errors).toEqual([]);

                forceImageSizeForPlatformCompatibility(result.image);
                expect(result.image).toEqualImage(referenceImg.get(0), 2);

                expect(canvas.get(0)).toEqualImage(referenceImg.get(0), 2);
                // expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0), 70);

                done();
            });
        });
    });

    ifNotInWebkitIt("should take a URL, inline all displayable content and render to the given canvas", function (done) {
        rasterizeHTML.drawURL(testHelper.fixturesPath + "testScaled50PercentWithJs.html", canvas.get(0), {
            cache: 'none',
            executeJs: true,
            executeJsTimeout: 100,
            zoom: 2,
            active: '.bgimage',
            hover: '.webfont',
            focus: 'img',
            clip: 'body'
        }).then(function (result) {
            expect(result.errors).toEqual([]);
            forceImageSizeForPlatformCompatibility(result.image);
            expect(result.image).toEqualImage(referenceImg.get(0), 2);

            expect(canvas.get(0)).toEqualImage(referenceImg.get(0), 2);
            // expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0), 90);

            done();
        });
    });

    ifNotInWebkitIt("should render a URL without canvas", function (done) {
        rasterizeHTML.drawURL(testHelper.fixturesPath + "testScaled50PercentWithJs.html", {
            cache: 'none',
            width: width,
            height: height,
            executeJs: true,
            executeJsTimeout: 100,
            zoom: 2,
            active: '.bgimage',
            hover: '.webfont',
            focus: 'img',
            clip: 'body'
        }).then(function (result) {
            expect(result.errors).toEqual([]);

            forceImageSizeForPlatformCompatibility(result.image);
            expect(result.image).toEqualImage(referenceImg.get(0), 2);
            // expect(result.image).toImageDiffEqual(referenceImg.get(0), 90);

            done();
        });
    });

    ifNotInPhantomJSAndNotLocalRunnerIt("should take a URL and load non UTF-8 content", function (done) {
        var inlineReferencesSpy = spyOn(inlineresources, 'inlineReferences').and.returnValue(fulfilled());

        rasterizeHTML.drawURL(testHelper.fixturesPath + "nonUTF8Encoding.html").then(function () {
            expect(inlineReferencesSpy).toHaveBeenCalled();

            var doc = inlineReferencesSpy.calls.mostRecent().args[0];

            // This fails if SpecRunner is opened locally in Firefox. Open over a local webserver helps here.
            expect(doc.body.innerHTML.trim()).toEqual('这是中文');

            done();
        });
    });

    ifNotInWebKitAndNotLocalRunnerIt("should work around Firefox bug with `null` style properties", function (done) {
        // The bug only turns up when there's no JS executed which creates a new document
        // In addition this test will due to https://bugzilla.mozilla.org/show_bug.cgi?id=942138
        rasterizeHTML.drawURL(testHelper.fixturesPath + "test.html", {
                cache: 'none',
                active: '.bgimage',
                hover: '.webfont',
                clip: 'body',
                width: 200,
                height: 100
            })
            .then(function (result) {
                forceImageSizeForPlatformCompatibility(result.image);
                expect(result.image).toEqualImage(referenceImg.get(0), 2);

                done();
            });
    });

    ifNotInPhantomJsIt("should report a source error on invalid input from HTML", function (done) {
        rasterizeHTML.drawHTML("<html><weird:element></html>", {cache: 'none'}).then(null, function (error) {
            expect(error.message).toEqual("Invalid source");

            done();
        });
    });

    ifNotInPhantomJsIt("should report a source error on invalid input from URL", function (done) {
        rasterizeHTML.drawURL(testHelper.fixturesPath + "invalidInput.html", {cache: 'none'}).then(null, function (error) {
            expect(error.message).toEqual("Invalid source");

            done();
        });
    });
});
