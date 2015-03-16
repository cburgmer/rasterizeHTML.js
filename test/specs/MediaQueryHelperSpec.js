describe("Media Query Helper", function () {
    "use strict";

    describe("needsEmWorkaround", function () {

        // rough integration tests

        it("should detect issue on WebKit", function () {
            if (navigator.userAgent.indexOf('WebKit') < 0) {
                return;
            }

            expect(mediaQueryHelper.needsEmWorkaround()).toBe(true);
        });

        it("should not detect issue on Firefox", function () {
            if (navigator.userAgent.indexOf('Firefox') < 0) {
                return;
            }

            expect(mediaQueryHelper.needsEmWorkaround()).toBe(false);
        });
    });
});
