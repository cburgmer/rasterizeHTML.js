var util = (function (url) {
    "use strict";

    var module = {};

    var uniqueIdList = [];

    module.joinUrl = function (baseUrl, relUrl) {
        if (!baseUrl) {
            return relUrl;
        }
        return url.resolve(baseUrl, relUrl);
    };

    module.getConstantUniqueIdFor = function (element) {
        // HACK, using a list results in O(n), but how do we hash e.g. a DOM node?
        if (uniqueIdList.indexOf(element) < 0) {
            uniqueIdList.push(element);
        }
        return uniqueIdList.indexOf(element);
    };

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

    var isObject = function (obj) {
        return typeof obj === "object" && obj !== null;
    };

    var isCanvas = function (obj) {
        return isObject(obj) &&
            Object.prototype.toString.apply(obj).match(/\[object (Canvas|HTMLCanvasElement)\]/i);
    };

    var isFunction = function (func) {
        return typeof func === "function";
    };

    // args: canvas, options
    // legacy API: args: canvas, options, callback
    module.parseOptionalParameters = function (args) {
        var parameters = {
            canvas: null,
            options: {},
            callback: null
        };

        if (isFunction(args[0])) {
            parameters.callback = args[0];
        } else {
            if (args[0] == null || isCanvas(args[0])) {
                parameters.canvas = args[0] || null;

                if (isFunction(args[1])) {
                    parameters.callback = args[1];
                } else {
                    parameters.options = module.clone(args[1]);
                    parameters.callback = args[2] || null;
                }

            } else {
                parameters.options = module.clone(args[0]);
                parameters.callback = args[1] || null;
            }
        }

        return parameters;
    };

    return module;
}(url));
