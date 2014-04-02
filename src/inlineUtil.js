var inlineUtil = (function (window, ayepromise, url) {
    "use strict";

    var module = {};

    module.clone = function (object) {
        var theClone = {},
            i;
        for (i in object) {
            if (object.hasOwnProperty(i)) {
               theClone[i] = object[i];
            }
        }
        return theClone;
    };

    module.joinUrl = function (baseUrl, relUrl) {
        return url.resolve(baseUrl, relUrl);
    };

    return module;
}(window, ayepromise, url));
