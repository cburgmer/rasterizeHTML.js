describe("HTML Document Utility functions", function () {
    var doc,
        setHtml = function (html) {
            doc.documentElement.innerHTML = html;
        };

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument('');
    });

    describe("rewriteStyleRuleSelector", function () {
        it("should rewrite CSS rules with the new selector", function () {
            setHtml('<head><style type="text/css">a:hover { color: blue; }</style></head><body><span></span></body>');

            documentUtil.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');

            expect(doc.querySelector('style').textContent).toMatch(/a.myFakeHover \{\s*color: blue;\s*\}/);
        });

        it("should correctly handle complex selectors", function () {
            setHtml('<style type="text/css">body:hover span { color: blue; }</style>');

            documentUtil.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');

            expect(doc.querySelector('style').textContent).toMatch(/body.myFakeHover span \{\s*color: blue;\s*\}/);
        });

        it("should correctly handle simple selector occurrence", function () {
            setHtml('<style type="text/css">:hover { color: blue; }</style>');

            documentUtil.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');

            expect(doc.querySelector('style').textContent).toMatch(/.myFakeHover \{\s*color: blue;\s*\}/);
        });

        it("should not match partial selector occurrence", function () {
            setHtml('<style type="text/css">.myClass { color: blue; }</style>');

            documentUtil.rewriteStyleRuleSelector(doc, '.my', '.myFakeHover');

            expect(doc.querySelector('style').textContent).toMatch(/.myClass \{\s*color: blue;\s*\}/);
        });

        it("should correctly handle multiple selector occurrence in same rule selector", function () {
            setHtml('<style type="text/css">i:hover, a:hover { color: blue; }</style>');

            documentUtil.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');

            expect(doc.querySelector('style').textContent).toMatch(/i.myFakeHover, a.myFakeHover \{\s*color: blue;\s*\}/);
        });

        it("should correctly handle multiple sub-selector", function () {
            setHtml('<style type="text/css">i:active::after { color: blue; }</style>');

            documentUtil.rewriteStyleRuleSelector(doc, ':active', '.myFakeActive');

            expect(doc.querySelector('style').textContent).toMatch(/i.myFakeActive::?after \{\s*color: blue;\s*\}/);
        });

        it("should correctly handle multiple selector occurrences in different rules", function () {
            setHtml('<style type="text/css">a:active {color: green;}i:active { color: blue; }</style>');

            documentUtil.rewriteStyleRuleSelector(doc, ':active', '.myFakeActive');

            expect(doc.querySelector('style').textContent).toMatch(/i.myFakeActive \{\s*color: blue;\s*\}/);
        });

        it("should cope with non CSSStyleRule", function () {
            setHtml('<head><style type="text/css">@font-face { font-family: "RaphaelIcons"; src: url("raphaelicons-webfont.woff"); }</style></head><body><span></span></body>');

            documentUtil.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');
        });

        it("should not touch style elements without a matching selector", function () {
            setHtml('<style type="text/css">a { color: blue; }/* a comment*/</style>');

            documentUtil.rewriteStyleRuleSelector(doc, ':hover', '.myFakeHover');

            // Use the fact that comments are discarded when processing a style sheet
            expect(doc.querySelector('style').textContent).toMatch(/a comment/);
        });

        // On Firefox this needs a work around because of https://bugzilla.mozilla.org/show_bug.cgi?id=925493
        ifNotInPhantomJsIt("should integrate with a document loaded through ajax", function (done) {
            testHelper.readHTMLDocumentFixture("hover.html").then(function (doc) {
                documentUtil.rewriteStyleRuleSelector(doc, ':hover', '.myfakehover');

                expect(doc.querySelector('style').textContent).toMatch(/body.myfakehover/);
                done();
            });
        });
    });

    describe("lowercaseTagNameSelectors", function () {
        it("should convert matching tag name to lower case", function () {
            setHtml('<style>A { color: blue; }</style>');

            documentUtil.lowercaseTagNameSelectors(doc, ['a']);

            expect(doc.querySelector('style').textContent).toMatch(/a \{/);
        });

        it("should convert matching tag name with mixed letter case to lower case", function () {
            setHtml('<style>sPAn { color: blue; }</style>');

            documentUtil.lowercaseTagNameSelectors(doc, ['span']);

            expect(doc.querySelector('style').textContent).toMatch(/span \{/);
        });

        it("should convert matching tag name from a list of names to lower case", function () {
            setHtml('<style>SPAN { color: blue; }</style>');

            documentUtil.lowercaseTagNameSelectors(doc, ['a', 'span']);

            expect(doc.querySelector('style').textContent).toMatch(/span \{/);
        });

        it("should not touch selector parts outside of the tag name", function () {
            setHtml('<style>SPAN.aClassName { color: blue; }</style>');

            documentUtil.lowercaseTagNameSelectors(doc, ['span']);

            expect(doc.querySelector('style').textContent).toMatch(/span.aClassName \{/);
        });

        it("should not match any tag names with a matching suffix", function () {
            setHtml('<style>LI { color: blue; }</style>');

            documentUtil.lowercaseTagNameSelectors(doc, ['i']);

            expect(doc.querySelector('style').textContent).toMatch(/LI \{/);
        });

        ifNotInPhantomJsIt("should convert complext selectors", function () {
            setHtml('<style>BODY LI.COMPLEX:active { color: blue; }</style>');

            documentUtil.lowercaseTagNameSelectors(doc, ['li']);

            expect(doc.querySelector('style').textContent).toMatch(/BODY li.COMPLEX:active \{/);
        });

        it("should convert multiple different matches", function () {
            setHtml('<style>BODY LI { color: blue; }</style>');

            documentUtil.lowercaseTagNameSelectors(doc, ['body', 'li']);

            expect(doc.querySelector('style').textContent).toMatch(/body li \{/);
        });
    });

    describe("addClassNameRecursively", function () {
        it("should attach class to selected element", function () {
            setHtml("<span>a span</span>");

            documentUtil.addClassNameRecursively(doc.querySelector('span'), '.myClass');

            expect(doc.querySelector('span').className).toMatch(/myClass/);
        });

        it("should attach the fake hover class to select the parent's elements", function () {
            setHtml("<div><ol><li>a list entry</li></ol></div>");

            documentUtil.addClassNameRecursively(doc.querySelector('li'), '.myClass');

            expect(doc.querySelector('ol').className).toMatch(/myClass/);
            expect(doc.querySelector('div').className).toMatch(/myClass/);
            expect(doc.querySelector('body').className).toMatch(/myClass/);
            expect(doc.querySelector('html').className).toMatch(/myClass/);
        });

        it("should not attach the fake hover class to siblings or parent's siblings", function () {
            setHtml("<div><span>a span</span><div><a>a list entry</a><i>text</i></div></div>");

            documentUtil.addClassNameRecursively(doc.querySelector('a'), '.myClass');

            expect(doc.querySelector('i').className).toEqual('');
            expect(doc.querySelector('span').className).toEqual('');
        });
    });
});
