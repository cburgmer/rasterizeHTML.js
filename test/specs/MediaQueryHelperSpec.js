describe("Media Query Helper", function () {
    "use strict";

    describe("needsEmWorkaround", function () {

        // rough integration tests

        it("should detect issue on WebKit", function (done) {
            if (navigator.userAgent.indexOf('WebKit') < 0) {
                done();
                return;
            }

            mediaQueryHelper.needsEmWorkaround().then(function (result) {
                expect(result).toBe(true);

                done();
            });
        });

        it("should not detect issue on Firefox", function (done) {
            if (navigator.userAgent.indexOf('Firefox') < 0) {
                done();
                return;
            }

            mediaQueryHelper.needsEmWorkaround().then(function (result) {
                expect(result).toBe(false);

                done();
            });
        });
    });

    describe("workAroundWebKitEmSizeIssue", function () {
        var doc;

        var addStyle = function (styleContent) {
            var style = doc.createElement('style');

            style.textContent = styleContent;
            doc.querySelector('head').appendChild(style);
        };

        beforeEach(function () {
            doc = document.implementation.createHTMLDocument('');
        });

        // phantomjs seems not to parse the style and so is not available for manipulation
        ifNotInPhantomJsIt("should rewrite an em value into px", function () {
            addStyle('@media (min-width: 1em) {}');

            mediaQueryHelper.workAroundWebKitEmSizeIssue(doc);

            expect(doc.documentElement.innerHTML).toBe('bam');
            expect(doc.querySelector('style').textContent).toMatch(/@media (all and )?\(min-width: 16px\)/);
        });

        ifNotInPhantomJsIt("should keep a px value", function () {
            addStyle('@media (min-width: 15px) {}');

            mediaQueryHelper.workAroundWebKitEmSizeIssue(doc);

            expect(doc.querySelector('style').textContent).toMatch(/@media (all and )?\(min-width: 15px\)/);
        });

        ifNotInPhantomJsIt("should handle mixed units", function () {
            addStyle('@media (min-width: 15px), (max-width: 2em) {}');

            mediaQueryHelper.workAroundWebKitEmSizeIssue(doc);

            expect(doc.querySelector('style').textContent).toMatch(/@media (all and )?\(min-width: 15px\), (all and )?\(max-width: 32px\)/);
        });

        ifNotInPhantomJsIt("should handle fractions", function () {
            addStyle('@media (min-width: 1.2em) {}');

            mediaQueryHelper.workAroundWebKitEmSizeIssue(doc);

            expect(doc.querySelector('style').textContent).toMatch(/@media (all and )?\(min-width: 19.2px\)/);
        });
    });
});
