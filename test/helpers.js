(function () {
    "use strict";

    var isWebkitOrBlink = navigator.userAgent.indexOf("WebKit") >= 0,
        testDisabledOnCondition = function (condition, text, functionHandle) {
            var spec = it(text, functionHandle);
            if (condition) {
                spec.pend("disabled on this platform");
            }
            return spec;
        };
    window.ifNotInWebkitOrBlinkIt = function (text, functionHandle) {
        return testDisabledOnCondition(isWebkitOrBlink, text, functionHandle);
    };
})();
