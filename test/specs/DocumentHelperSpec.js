describe("Document Helper functions", function () {

    describe("persistInputValues", function () {
        var doc,
            setHtml = function (html) {
                doc.documentElement.innerHTML = html;
            };

        beforeEach(function () {
            doc = document.implementation.createHTMLDocument('');
        });

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
        var doc,
            setHtml = function (html) {
                doc.documentElement.innerHTML = html;
            };

        beforeEach(function () {
            doc = document.implementation.createHTMLDocument('');

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
        var doc,
            setHtml = function (html) {
                doc.documentElement.innerHTML = html;
            };

        beforeEach(function () {
            doc = document.implementation.createHTMLDocument('');

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

});
