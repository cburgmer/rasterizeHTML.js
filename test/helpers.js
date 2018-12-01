(function () {
    "use strict";

    var isWebkitOrBlink = navigator.userAgent.indexOf("WebKit") >= 0,
        isHeadlessChrome = navigator.userAgent.indexOf("HeadlessChrome") >= 0,
        isLocalRunner = document.baseURI.substr(0, 'file://'.length) === 'file://',
        testDisabledOnCondition = function (condition, text, functionHandle) {
            var spec = it(text, functionHandle);
            if (condition) {
                spec.pend('disabled on this platform');
            }
            return spec;
        };
    window.ifNotInWebkitOrBlinkIt = function (text, functionHandle) {
        return testDisabledOnCondition(isWebkitOrBlink, text, functionHandle);
    };
    window.ifNotInHeadlessChromeAndNotLocalRunnerIt = function (text, functionHandle) {
        return testDisabledOnCondition(isHeadlessChrome || isLocalRunner, text, functionHandle);
    };
    window.ifNotLocalRunnerIt = function (text, functionHandle) {
        return testDisabledOnCondition(isLocalRunner, text, functionHandle);
    };
}());
