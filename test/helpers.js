var isWebkit = navigator.userAgent.indexOf("WebKit") >= 0,
    isPhantomJs = navigator.userAgent.indexOf("PhantomJS") >= 0,
    isLocalRunner = document.baseURI.substr(0, 'file://'.length) === 'file://',
    ifNotInWebkitIt = function(text, functionHandle) {
        if (! isWebkit) {
            return it(text, functionHandle);
        } else {
            console.log('Warning: "' + text + '" is disabled on this platform');
        }
    },
    ifNotInPhantomJsIt = function(text, functionHandle) {
        if (! isPhantomJs) {
            return it(text, functionHandle);
        } else {
            console.log('Warning: "' + text + '" is disabled on this platform');
        }
    },
    ifNotInPhantomJSAndNotLocalRunnerIt = function (text, functionHandle) {
        if (! isPhantomJs && ! isLocalRunner) {
            return it(text, functionHandle);
        } else {
            console.log('Warning: "' + text + '" is disabled on this platform');
        }
    };
