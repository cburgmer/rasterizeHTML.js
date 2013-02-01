describe("Integration test", function () {
    var canvas, finished, callback, referenceImg,
        width = 204,
        height = 100;

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
        this.addMatchers(imagediff.jasmine);
        canvas = $('<canvas width="' + width + '" height="' + height + '"></canvas>'); // Firefox adds a space between the divs and needs the canvas to fit horizontally for all content to be rendered

        referenceImg = $('<img src="'+ jasmine.getFixtures().fixturesPath + '/testResult.png" alt="test image"/>');

        finished = false;
        callback = jasmine.createSpy("callback").andCallFake(function () { finished = true; });
    });

    ifNotInWebkitIt("should take a document, inline all displayable content and render to the given canvas (flaky in Firefox)", function () {
        var doc = null;

        loadDocFixture(jasmine.getFixtures().fixturesPath + "test.html", function (xmlDoc) {
            doc = xmlDoc;
        });

        waitsFor(function () {
            return doc !== null;
        });

        runs(function () {
            rasterizeHTML.drawDocument(doc, canvas.get(0), {cache: false}, callback);
        });

        waitsFor(function () {
            return finished;
        });

        runs(function () {
            expect(callback).toHaveBeenCalledWith(jasmine.any(Object), []);
            expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0), 10);
        });
    });

    ifNotInWebkitIt("should take a HTML string, inline all displayable content and render to the given canvas (flaky in Firefox)", function () {
        var html = null;

        html = readFixtures("test.html");

        runs(function () {
            rasterizeHTML.drawHTML(html, canvas.get(0), {baseUrl: jasmine.getFixtures().fixturesPath, cache: false}, callback);
        });

        waitsFor(function () {
            return finished;
        });

        runs(function () {
            expect(callback).toHaveBeenCalledWith(jasmine.any(Object), []);
            expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0), 70);
        });
    });

    ifNotInWebkitIt("should take a URL, inline all displayable content and render to the given canvas (flaky in Firefox)", function () {
        runs(function () {
            rasterizeHTML.drawURL(jasmine.getFixtures().fixturesPath + "testWithJs.html", canvas.get(0), {cache: false, executeJs: true}, callback);
        });

        waitsFor(function () {
            return finished;
        });

        runs(function () {
            expect(callback).toHaveBeenCalledWith(jasmine.any(Object), []);
            expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0), 90);
        });
    });

    ifNotInWebkitIt("should take a URL, inline all displayable content and return the image (flaky in Firefox)", function () {
        runs(function () {
            rasterizeHTML.drawURL(jasmine.getFixtures().fixturesPath + "testWithJs.html", {cache: false, width: width, height: height, executeJs: true}, callback);
        });

        waitsFor(function () {
            return finished;
        });

        runs(function () {
            expect(callback).toHaveBeenCalledWith(jasmine.any(Object), []);
            expect(callback.mostRecentCall.args[0]).toImageDiffEqual(referenceImg.get(0), 90);
        });
    });
});
