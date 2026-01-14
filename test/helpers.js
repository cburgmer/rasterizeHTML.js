(function () {
    "use strict";

    var isWebkitOrBlink = navigator.userAgent.indexOf("WebKit") >= 0,
        testDisabledOnCondition = function (condition, text, functionHandle) {
            if (condition) {
                return xit(text, functionHandle);
            } else {
                return it(text, functionHandle);
            }
        };
    window.ifNotInWebkitOrBlinkIt = function (text, functionHandle) {
        return testDisabledOnCondition(isWebkitOrBlink, text, functionHandle);
    };
})();
