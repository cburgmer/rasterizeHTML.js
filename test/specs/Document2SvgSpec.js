describe("Document to SVG conversion", function () {
    describe("on document to SVG conversion", function () {
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

        var sandbox;

        beforeEach(function () {
            sandbox = document.createElement('div');
            document.body.appendChild(sandbox);
        });

        afterEach(function () {
            document.body.removeChild(sandbox);
        });

        it("should return a SVG with embeded HTML", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "Test content";

            var svgCode = document2svg.getSvgForDocument(doc, aRenderSize(), defaultZoomLevel);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" .*>' +
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
        });

        it("should return a SVG with embedded image", function () {
            var doc = document.implementation.createHTMLDocument(""),
                canonicalXML;
            doc.body.innerHTML = '<img src="data:image/png;base64,sOmeFAKeBasE64="/>';

            var svgCode = document2svg.getSvgForDocument(doc, aRenderSize(), defaultZoomLevel);

            expect(svgCode).not.toBeNull();
            canonicalXML = svgCode.replace(/ +\/>/, '/>');
            expect(canonicalXML).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" .*>' +
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
        });

        it("should return a SVG with the given size", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var svgCode = document2svg.getSvgForDocument(doc, aRenderSize(123, 987, 200, 1000, 2, 7), defaultZoomLevel);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="987"[^>]*>' +
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
        });

        it("should zoom by the given factor", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var zoomFactor = 10;
            var svgCode = document2svg.getSvgForDocument(doc, aRenderSize(123, 987, 12, 99), zoomFactor);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="987"[^>]*>' +
                    '<foreignObject x="0" y="0" width="12" height="99" style="-webkit-transform: scale\\(10\\); -webkit-transform-origin: 0 0; transform: scale\\(10\\); transform-origin: 0 0;.*">' +
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
        });

        it("should ignore zoom factor 0", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var zoomLevel = 0;
            var svgCode = document2svg.getSvgForDocument(doc, aRenderSize(123, 987), zoomLevel);

            expect(svgCode).not.toMatch(new RegExp("scale"));
        });

        it("should return a SVG with a root font size to preserve rem units", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "Test content";

            var svgCode = document2svg.getSvgForDocument(doc, aRenderSizeWithRootFontSize('42px'), defaultZoomLevel);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" [^>]*font-size="42px"[^>]*>' +
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
        });

        it("should raise an error on invalid source", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var error = new Error();
            spyOn(browser, 'validateXHTML').and.throwError(error);

            expect(function () { document2svg.getSvgForDocument(doc, aRenderSize(), 1); }).toThrow(error);
        });

        it("should work around collapsing margins in Chrome & Safari", function () {
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
            tempChild.innerHTML = document2svg.getSvgForDocument(doc, aRenderSize(100, 100), 1);

            sandbox.appendChild(tempChild.childNodes[0]);


            // Work around WebKit reporting offset across the SVG element
            sandbox.querySelector('svg').style.position = "relative";

            expect(sandbox.querySelector('.svgContent').offsetTop).toBe(200);
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
            spyOn(documentHelper, 'fakeHover');
            spyOn(documentHelper, 'fakeActive');
            calculatedSize = {the: 'calculated_size'};
            spyOn(browser, 'calculateDocumentContentSize').and.returnValue(fulfilled(calculatedSize));
            spyOn(document2svg, 'getSvgForDocument');
        });

        it("should draw as svg (legacy)", function (done) {
            var svg = "the svg";

            document2svg.getSvgForDocument.and.returnValue(svg);

            document2svg.drawDocumentAsSvg(doc, {}, {zoom: 42}).then(function (theSvg) {
                expect(theSvg).toBe(svg);

                expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(
                    doc,
                    jasmine.objectContaining({zoom: 42})
                );
                expect(document2svg.getSvgForDocument).toHaveBeenCalledWith(doc, calculatedSize, 42);

                done();
            });
        });

        it("should draw as svg", function () {
            var svg = "the svg";

            document2svg.getSvgForDocument.and.returnValue(svg);

            var theSvg = document2svg.drawDocumentAsSvg(doc, calculatedSize, {zoom: 42});

            expect(theSvg).toBe(svg);

            expect(browser.calculateDocumentContentSize).not.toHaveBeenCalled();

            expect(document2svg.getSvgForDocument).toHaveBeenCalledWith(doc, calculatedSize, 42);
        });

        it("should take an optional width and height", function () {
            document2svg.drawDocumentAsSvg(doc, {}, {width: 42, height: 4711});

            expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(doc, {width: 42, height: 4711});
        });

        it("should trigger hover effect", function () {
            document2svg.drawDocumentAsSvg(doc, {}, {hover: '.mySpan'});

            expect(documentHelper.fakeHover).toHaveBeenCalledWith(doc, '.mySpan');
        });

        it("should not trigger hover effect by default", function () {
            document2svg.drawDocumentAsSvg(doc, {}, {});

            expect(documentHelper.fakeHover).not.toHaveBeenCalled();
        });

        it("should trigger active effect", function () {
            document2svg.drawDocumentAsSvg(doc, {}, {active: '.mySpan'});

            expect(documentHelper.fakeActive).toHaveBeenCalledWith(doc, '.mySpan');
        });

        it("should not trigger active effect by default", function () {
            document2svg.drawDocumentAsSvg(doc, {}, {});

            expect(documentHelper.fakeActive).not.toHaveBeenCalled();
        });

        it("should render the selected element", function () {
            document2svg.drawDocumentAsSvg(doc, {}, {clip: '.mySpan'});

            expect(browser.calculateDocumentContentSize).toHaveBeenCalledWith(
                doc,
                jasmine.objectContaining({clip: '.mySpan'})
            );
        });
    });
});
