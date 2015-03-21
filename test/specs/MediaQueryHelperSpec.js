describe("Media Query Helper", function () {
    "use strict";

    describe("needsEmWorkaround", function () {

        // rough integration tests

        ifNotInPhantomJsIt("should detect issue on WebKit", function (done) {
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
});
