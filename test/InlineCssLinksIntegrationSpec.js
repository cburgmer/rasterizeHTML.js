describe("Inline CSS content (integration)", function () {
    var doc, callback, ajaxSpy, ajaxSpyUrlMap = {};

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");
        callback = jasmine.createSpy("callback");

        ajaxSpy = spyOn(rasterizeHTMLInline.util, "ajax").andCallFake(function (url, options, success) {
            var respondWith = ajaxSpyUrlMap[url];
            if (respondWith) {
                success(respondWith);
            }
        });
    });

    var appendStylesheetLink = function (doc, href) {
        var cssLink = window.document.createElement("link");
        cssLink.href = href;
        cssLink.rel = "stylesheet";
        cssLink.type = "text/css";

        doc.head.appendChild(cssLink);
    };

    var mockAjaxWithSuccess = function (params) {
        ajaxSpyUrlMap[params.url] = params.respondWith;
    };

    // https://github.com/cburgmer/rasterizeHTML.js/issues/42
    it("should correctly inline a font as second rule with CSSOM fallback", function () {
        mockAjaxWithSuccess({
            url: "some.html",
            respondWith: 'p { font-size: 14px; } @font-face { font-family: "test font"; src: url("fake.woff"); }'
        });
        mockAjaxWithSuccess({
            url: "fake.woff",
            respondWith: "this is not a font"
        });

        appendStylesheetLink(doc, "some.html");

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();

        expect(doc.head.getElementsByTagName("style")[0].textContent).toMatch(
            /p\s*\{\s*font-size:\s*14px;\s*\}\s*@font-face\s*\{\s*font-family:\s*["']test font["'];\s*src:\s*url\("?data:font\/woff;base64,dGhpcyBpcyBub3QgYSBmb250"?\);\s*\}/
        );
    });
});
