describe("Integration test", function () {

    var loadDocFixture = function (url, callback) {
        var request = new window.XMLHttpRequest(),
            doc;

        request.onreadystatechange = function () {
            if (request.readyState == 4) {
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
    });

    ifNotInWebkitIt("should take a document, inline all displayable content and render to the given canvas (flaky in Firefox)", function () {
        var canvas = $('<canvas width="204" height="100"></canvas>'), // Firefox adds a space between the divs and needs the canvas to fit horizontally for all content to be rendered
            finished = false,
            callback = function () { finished = true; },
            referenceImg = $('<img src="fixtures/testResult.png" alt="test image"/>'),
            doc = null;

        loadDocFixture("fixtures/test.html", function (xmlDoc) {
            doc = xmlDoc;
        });

        waitsFor(function () {
            return doc !== null;
        });

        runs(function () {
            rasterizeHTML.drawDocument(doc, canvas.get(0), callback);
        });

        waitsFor(function () {
            return finished;
        });

        runs(function () {
            expect(canvas.get(0)).toImageDiffEqual(referenceImg.get(0));
        });
    });

});