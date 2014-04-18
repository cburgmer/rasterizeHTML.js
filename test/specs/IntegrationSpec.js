describe("Integration test", function () {
    var canvas, finished, callback, referenceImg,
        width = 200,
        height = 100;

    var fulfilled = function (value) {
        var defer = ayepromise.defer();
        defer.resolve(value);
        return defer.promise;
    };

    var loadDocFixture = function (url, callback) {
        var request = new window.XMLHttpRequest(),
            doc;

        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                callback(request.responseXML);
            }
        };
        request.open('GET', url, true);
        // Seems to not work on Safari (https://developer.mozilla.org/en/HTML_in_XMLHttpRequest)
        request.responseType = "document";
        request.overrideMimeType("text/html");
        request.send(null);

        return doc;
    };

    beforeEach(function () {
        jasmine.addMatchers(diffHelper.matcher);

        canvas = $('<canvas width="' + width + '" height="' + height + '"></canvas>'); // Firefox adds a space between the divs and needs the canvas to fit horizontally for all content to be rendered

        referenceImg = $('<img src="'+ testHelper.fixturesPath + '/testResult.png" alt="test image"/>');

        finished = false;
        callback = jasmine.createSpy("callback").and.callFake(function () { finished = true; });
    });

    ifNotInWebkitIt("should take a document, inline all displayable content and render to the given canvas", function (done) {
        loadDocFixture(testHelper.fixturesPath + "test.html", function (doc) {
            rasterizeHTML.drawDocument(doc, canvas.get(0), {cache: 'none'}).then(function (result) {
                expect(result.errors).toEqual([]);
                expect(result.image).toEqualImage(referenceImg.get(0), 1);

                expect(canvas.get(0)).toEqualImage(referenceImg.get(0), 1);
                // expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0), 10);

                done();
            });
        });
    });

    ifNotInWebkitIt("should take a HTML string, inline all displayable content and render to the given canvas", function (done) {
        var html = testHelper.readHTMLFixture("test.html");

        rasterizeHTML.drawHTML(html, canvas.get(0), {baseUrl: testHelper.fixturesPath, cache: 'none'}).then(function (result) {
            expect(result.errors).toEqual([]);
            expect(result.image).toEqualImage(referenceImg.get(0), 1);

            expect(canvas.get(0)).toEqualImage(referenceImg.get(0), 1);
            // expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0), 70);

            done();
        });
    });

    ifNotInWebkitIt("should take a URL, inline all displayable content and render to the given canvas", function (done) {
        rasterizeHTML.drawURL(testHelper.fixturesPath + "testScaled50PercentWithJs.html", canvas.get(0), {
            cache: 'none',
            executeJs: true,
            zoom: 2
        }).then(function (result) {
            expect(result.errors).toEqual([]);
            expect(result.image).toEqualImage(referenceImg.get(0), 1);

            expect(canvas.get(0)).toEqualImage(referenceImg.get(0), 1);
            // expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0), 90);

            done();
        });
    });

    ifNotInWebkitIt("should take a URL, inline all displayable content and return the image", function (done) {
        rasterizeHTML.drawURL(testHelper.fixturesPath + "testScaled50PercentWithJs.html", {
            cache: 'none',
            width: width,
            height: height,
            executeJs: true,
            zoom: 2
        }).then(function (result) {
            expect(result.errors).toEqual([]);
            expect(result.image).toEqualImage(referenceImg.get(0), 1);
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
