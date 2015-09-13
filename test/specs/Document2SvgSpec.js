describe("Document to SVG conversion", function () {
    "use strict";

    var successfulPromise = function (value) {
        var defer = ayepromise.defer();
        defer.resolve(value);
        return defer.promise;
    };

    describe("getSvgForDocument", function () {
        var defaultZoomLevel = 1;

        var aRenderSize = function (width, height, viewportWidth, viewportHeight, left, top) {
            return {
                left: left || 0,
                top: top || 0,
                width: width || 123,
                height: height || 456 ,
                viewportWidth: viewportWidth || width || 123,
                viewportHeight: viewportHeight || height || 456,
                rootFontSize: '123px'
            };
        };

        var aRenderSizeWithRootFontSize = function (rootFontSize) {
            var size = aRenderSize();
            size.rootFontSize = rootFontSize;
            return size;
        };

        var setUpNeedsEmWorkaroundToReturn = function (value) {
            mediaQueryHelper.needsEmWorkaround.and.returnValue(successfulPromise(value));
        };

        var sandbox;

        beforeEach(function () {
            sandbox = document.createElement('div');
            document.body.appendChild(sandbox);

            spyOn(documentHelper, 'rewriteTagNameSelectorsToLowerCase');
            spyOn(mediaQueryHelper, 'needsEmWorkaround');
            spyOn(mediaQueryHelper, 'workAroundWebKitEmSizeIssue');

            setUpNeedsEmWorkaroundToReturn(false);
        });

        afterEach(function () {
            document.body.removeChild(sandbox);
        });

        it("should return a SVG with embeded HTML", function (done) {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "Test content";

             document2svg.getSvgForDocument(doc, aRenderSize(), defaultZoomLevel).then(function (svgCode) {
                 expect(svgCode).toMatch(new RegExp(
                     '<svg xmlns="http://www.w3.org/2000/svg" .*>' +
                         '.*' +
                         '<foreignObject .*>' +
                         '<html xmlns="http://www.w3.org/1999/xhtml">' +
                         '<head>' +
                         '<title(/>|></title>)' +
                         '</head>' +
                         '<body>' +
                         "Test content" +
                         '</body>' +
                         '</html>' +
                         '</foreignObject>' +
                         '</svg>'
                 ));

                 done();
            });
        });

        it("should return a SVG with embedded image", function (done) {
            var doc = document.implementation.createHTMLDocument(""),
                canonicalXML;
            doc.body.innerHTML = '<img src="data:image/png;base64,sOmeFAKeBasE64="/>';

            document2svg.getSvgForDocument(doc, aRenderSize(), defaultZoomLevel).then(function (svgCode) {
                expect(svgCode).not.toBeNull();
                canonicalXML = svgCode.replace(/ +\/>/, '/>');
                expect(canonicalXML).toMatch(new RegExp(
                    '<svg xmlns="http://www.w3.org/2000/svg" .*>' +
                        '.*' +
                        '<foreignObject .*>' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                        '<head>' +
                        '<title(/>|></title>)' +
                        '</head>' +
                        '<body>' +
                        '<img src="data:image/png;base64,sOmeFAKeBasE64="/>' +
                        '</body>' +
                        '</html>' +
                        '</foreignObject>' +
                        '</svg>'
                ));

                done();
            });
        });

        it("should return a SVG with the given size", function (done) {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            document2svg.getSvgForDocument(doc, aRenderSize(123, 987, 200, 1000, 2, 7), defaultZoomLevel).then(function (svgCode) {
                expect(svgCode).toMatch(new RegExp(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="987"[^>]*>' +
                        '.*' +
                        '<foreignObject x="-2" y="-7" width="200" height="1000".*>' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                        '<head>' +
                        '<title(/>|></title>)' +
                        '</head>' +
                        '<body>' +
                        "content" +
                        '</body>' +
                        '</html>' +
                        '</foreignObject>' +
                        '</svg>'
                ));

                done();
            });
        });

        it("should zoom by the given factor", function (done) {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var zoomFactor = 10;
            document2svg.getSvgForDocument(doc, aRenderSize(123, 987, 12, 99), zoomFactor).then(function (svgCode) {
                expect(svgCode).toMatch(new RegExp(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="987"[^>]*>' +
                        '.*' +
                        '<foreignObject x="0" y="0" width="12" height="99" transform="scale\\(10\\)".*>' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                        '<head>' +
                        '<title(/>|></title>)' +
                        '</head>' +
                        '<body>' +
                        "content" +
                        '</body>' +
                        '</html>' +
                        '</foreignObject>' +
                        '</svg>'
                ));

                done();
            });
        });

        it("should ignore zoom factor 0", function (done) {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var zoomLevel = 0;
            document2svg.getSvgForDocument(doc, aRenderSize(123, 987), zoomLevel).then(function (svgCode) {
                expect(svgCode).not.toMatch(new RegExp("scale"));

                done();
            });
        });

        it("should return a SVG with a root font size to preserve rem units", function (done) {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "Test content";

            document2svg.getSvgForDocument(doc, aRenderSizeWithRootFontSize('42px'), defaultZoomLevel).then(function (svgCode) {
                expect(svgCode).toMatch(new RegExp(
                    '<svg xmlns="http://www.w3.org/2000/svg" [^>]*font-size="42px"[^>]*>' +
                        '.*' +
                        '<foreignObject .*>' +
                        '<html xmlns="http://www.w3.org/1999/xhtml"[^>]*>' +
                        '<head>' +
                        '<title(/>|></title>)' +
                        '</head>' +
                        '<body>' +
                        "Test content" +
                        '</body>' +
                        '</html>' +
                        '</foreignObject>' +
                        '</svg>'
                ));

                done();
            });
        });

        it("should raise an error on invalid source", function (done) {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var error = new Error();
            spyOn(browser, 'validateXHTML').and.throwError(error);

            document2svg.getSvgForDocument(doc, aRenderSize(), 1).then(null, function (e) {
                expect(e).toBe(error);

                done();
            });
        });

        it("should work around collapsing margins in Chrome & Safari", function (done) {
            // Bottom margin that would trigger a collapsing margin with the following SVG
            var topChild = document.createElement('div');
            topChild.style.marginBottom = "200px";
            topChild.innerHTML = 'text';

            sandbox.appendChild(topChild);


            var doc = document.implementation.createHTMLDocument("");
            // Margin top will inside the SVG will collapse
            doc.body.innerHTML = '<div class="svgContent" style="margin-top: 200px;">content</div>';
            // HACK avoid XHTML being pasted into the DOM below
            doc.head.querySelector('title').innerText = "meh";

            var tempChild = document.createElement('div');
            document2svg.getSvgForDocument(doc, aRenderSize(100, 100), 1).then(function (svgCode) {
                tempChild.innerHTML = svgCode;

                sandbox.appendChild(tempChild.childNodes[0]);

                // Work around WebKit reporting offset across the SVG element
                sandbox.querySelector('svg').style.position = "relative";

                expect(sandbox.querySelector('.svgContent').offsetTop).toBe(200);

                done();
            });
        });

        it("should work around XHTML case-sensitivity for tag name selectors", function (done) {
            var doc = document.implementation.createHTMLDocument("");

            document2svg.getSvgForDocument(doc, aRenderSize(), 1).then(function () {
                expect(documentHelper.rewriteTagNameSelectorsToLowerCase).toHaveBeenCalledWith(doc);

                done();
            });
        });

        it("should work around WebKit's EM media query issue", function (done) {
            var doc = document.implementation.createHTMLDocument("");
            setUpNeedsEmWorkaroundToReturn(true);

            document2svg.getSvgForDocument(doc, aRenderSize(), 1).then(function () {
                expect(mediaQueryHelper.workAroundWebKitEmSizeIssue).toHaveBeenCalledWith(doc);

                done();
            });
        });

        it("should not work around EM media query if no issue exists", function (done) {
            var doc = document.implementation.createHTMLDocument("");
            setUpNeedsEmWorkaroundToReturn(false);

            document2svg.getSvgForDocument(doc, aRenderSize(), 1).then(function () {
                expect(mediaQueryHelper.workAroundWebKitEmSizeIssue).not.toHaveBeenCalled();

                done();
            });
        });

        it("should hide scrollbars on Chrome under Linux", function (done) {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "Test content";

            document2svg.getSvgForDocument(doc, aRenderSize(), defaultZoomLevel).then(function (svgCode) {
                expect(svgCode).toMatch(new RegExp(
                    '<svg xmlns="http://www.w3.org/2000/svg" .*>' +
                        '<style scoped="">html::-webkit-scrollbar { display: none; }</style>' +
                        '<foreignObject .*>' +
                        '.*' +
                        '</foreignObject>' +
                        '</svg>'
                ));

                done();
            });
        });
    });

    describe("drawDocumentAsSvg", function () {
        var doc = "doc",
            calculatedSize;

        var fulfilled = function (value) {
            var defer = ayepromise.defer();
            defer.resolve(value);
            return defer.promise;
        };

        beforeEach(function () {
            spyOn(documentHelper, 'fakeUserAction');
            calculatedSize = 'the_calculated_size';
            spyOn(browser, 'calculateDocumentContentSize').and.returnValue(fulfilled(calculatedSize));
            spyOn(document2svg, 'getSvgForDocument');
        });

        it("should draw as svg", function (done) {
            var svg = "the svg";

            document2svg.getSvgForDocument.and.returnValue(successfulPromise(svg));

            document2svg.drawDocumentAsSvg(doc, {zoom: 42}).then(function (theSvg) {
                expect(theSvg).toBe(svg);

                expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(
                    doc,
                    jasmine.objectContaining({zoom: 42})
                );
                expect(document2svg.getSvgForDocument).toHaveBeenCalledWith(doc, calculatedSize, 42);

                done();
            });
        });

        it("should take an optional width and height", function () {
            document2svg.drawDocumentAsSvg(doc, {width: 42, height: 4711});

            expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(doc, {width: 42, height: 4711});
        });

        it("should trigger hover effect", function () {
            document2svg.drawDocumentAsSvg(doc, {hover: '.mySpan'});

            expect(documentHelper.fakeUserAction).toHaveBeenCalledWith(doc, '.mySpan', 'hover');
        });

        it("should trigger active effect", function () {
            document2svg.drawDocumentAsSvg(doc, {active: '.mySpan'});

            expect(documentHelper.fakeUserAction).toHaveBeenCalledWith(doc, '.mySpan', 'active');
        });

        it("should trigger focus effect", function () {
            document2svg.drawDocumentAsSvg(doc, {focus: '.mySpan'});

            expect(documentHelper.fakeUserAction).toHaveBeenCalledWith(doc, '.mySpan', 'focus');
        });

        it("should trigger target effect", function () {
            document2svg.drawDocumentAsSvg(doc, {target: '.mySpan'});

            expect(documentHelper.fakeUserAction).toHaveBeenCalledWith(doc, '.mySpan', 'target');
        });

        it("should not trigger focus effect by default", function () {
            document2svg.drawDocumentAsSvg(doc, {});

            expect(documentHelper.fakeUserAction).not.toHaveBeenCalled();
        });

        it("should render the selected element", function () {
            document2svg.drawDocumentAsSvg(doc, {clip: '.mySpan'});

            expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(
                doc,
                jasmine.objectContaining({clip: '.mySpan'})
            );
        });
    });
});
