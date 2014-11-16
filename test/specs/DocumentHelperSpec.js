describe("Document Helper functions", function () {
    var doc,
        setHtml = function (html) {
            doc.documentElement.innerHTML = html;
        };

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument('');
    });

    describe("persistInputValues", function () {
        it("should persist a text input's value", function () {
            setHtml('<input type="text">');

            doc.querySelector('input').value = 'my value';

            documentHelper.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/value="my value"/);
        });

        it("should persist a deleted text input's value", function () {
            setHtml('<input type="text" value="original value">');
            doc.querySelector('input').value = '';

            documentHelper.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/value=""/);
        });

        it("should keep a text input value if not changed", function () {
            setHtml('<input type="text" value="original value">');

            documentHelper.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/value="original value"/);
        });

        it("should persist a checked checkbox", function () {
            setHtml('<input value="pizza" type="checkbox">');

            doc.querySelector('input').checked = true;

            documentHelper.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/checked="(checked)?"/);
        });

        it("should persist an unchecked checkbox", function () {
            setHtml('<input value="pizza" type="checkbox" checked="checked">');

            doc.querySelector('input').checked = false;

            documentHelper.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).not.toMatch(/checked/);
        });

        it("should persist a radio button", function () {
            setHtml('<input value="pizza" type="radio">');

            doc.querySelector('input').checked = true;

            documentHelper.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/checked="(checked)?"/);
        });

        it("should persist a textarea", function () {
            setHtml('<textarea>This is text</textarea>');

            doc.querySelector('textarea').value = "Some new value";

            documentHelper.persistInputValues(doc);

            expect(doc.querySelector('textarea').outerHTML).toMatch(/<textarea>Some new value<\/textarea>/);
        });

        it("should handle a file input", function () {
            setHtml('<input type="file">');

            documentHelper.persistInputValues(doc);

            expect(doc.querySelector('input').outerHTML).toMatch(/type="file"/);
        });
    });

    describe("fakeHover", function () {
        beforeEach(function () {
            spyOn(documentUtil, 'addClassNameRecursively');
            spyOn(documentUtil, 'rewriteStyleRuleSelector');
        });

        it("should add a fake class to the selected element and adapt the document's stylesheet", function () {
            setHtml("<span>a span</span>");
            documentHelper.fakeHover(doc, 'span');

            expect(documentUtil.addClassNameRecursively).toHaveBeenCalledWith(doc.querySelector('span'), 'rasterizehtmlhover');
            expect(documentUtil.rewriteStyleRuleSelector).toHaveBeenCalledWith(doc, ':hover', '.rasterizehtmlhover');
        });

        it("should ignore non-existent selector", function () {
            documentHelper.fakeHover(doc, 'div');
        });
    });

    describe("fakeActive", function () {
        beforeEach(function () {
            spyOn(documentUtil, 'addClassNameRecursively');
            spyOn(documentUtil, 'rewriteStyleRuleSelector');
        });

        it("should add a fake class to the selected element and adapt the document's stylesheet", function () {
            setHtml("<span>a span</span>");
            documentHelper.fakeActive(doc, 'span');

            expect(documentUtil.addClassNameRecursively).toHaveBeenCalledWith(doc.querySelector('span'), 'rasterizehtmlactive');
            expect(documentUtil.rewriteStyleRuleSelector).toHaveBeenCalledWith(doc, ':active', '.rasterizehtmlactive');
        });

        it("should ignore non-existent selector", function () {
            documentHelper.fakeActive(doc, 'div');
        });
    });

    describe("findHtmlOnlyNodeNames", function () {
        it("should find html node names", function () {
            setHtml("<html><body><p><span class='whatever'><br>content</span></p></body></html>");

            var nodeNames = documentHelper.findHtmlOnlyNodeNames(doc);

            expect(nodeNames).toEqual(['html', 'head', 'body', 'p', 'span', 'br']);
        });

        it("should not include tags from other namespaces", function () {
            setHtml("<html><body><svg xmlns='http://www.w3.org/2000/svg'><rect/></svg></body></html>");

            var nodeNames = documentHelper.findHtmlOnlyNodeNames(doc);

            expect(nodeNames).toEqual(['html', 'head', 'body']);
        });

        it("should not include HTML tags if they conflict with ones from other namespaces", function () {
            setHtml('<html><body>' +
                    '<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
                    '<a xlink:href="target"></a>' +
                    '</svg>' +
                    '<a href="anotherTarget"></a></body></html>');

            var nodeNames = documentHelper.findHtmlOnlyNodeNames(doc);

            expect(nodeNames).toEqual(['html', 'head', 'body']);
        });
    });
});
