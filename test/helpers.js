(function () {
    "use strict";

    var isWebkitOrBlink = navigator.userAgent.indexOf("WebKit") >= 0,
        isPhantomJs = navigator.userAgent.indexOf("PhantomJS") >= 0,
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
    window.ifInPhantomJsIt = function(text, functionHandle) {
        return testDisabledOnCondition(! isPhantomJs, text, functionHandle);
    };
    window.ifNotInPhantomJsIt = function(text, functionHandle) {
        return testDisabledOnCondition(isPhantomJs, text, functionHandle);
    };
    window.ifNotInPhantomJSAndNotLocalRunnerIt = function (text, functionHandle) {
        return testDisabledOnCondition(isPhantomJs || isLocalRunner, text, functionHandle);
    };
    window.ifNotLocalRunnerIt = function (text, functionHandle) {
        return testDisabledOnCondition(isLocalRunner, text, functionHandle);
    };
}());
