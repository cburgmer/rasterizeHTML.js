window.rasterizeHTMLInline = (function (module, window, url) {
    "use strict";

    module.util = {};

    module.util.getDocumentBaseUrl = function (doc) {
        if (doc.baseURI !== 'about:blank') {
            return doc.baseURI;
        }

        return null;
    };

    module.util.clone = function (object) {
        var theClone = {},
            i;
        for (i in object) {
            if (object.hasOwnProperty(i)) {
               theClone[i] = object[i];
            }
        }
        return theClone;
    };

    module.util.cloneArray = function (nodeList) {
        return Array.prototype.slice.apply(nodeList, [0]);
    };

    module.util.joinUrl = function (baseUrl, relUrl) {
        return url.resolve(baseUrl, relUrl);
    };

    module.util.isDataUri = function (url) {
        return (/^data:/).test(url);
    };

    module.util.map = function (list, func, callback) {
        var completedCount = 0,
            // Operating inline on array-like structures like document.getElementByTagName() (e.g. deleting a node),
            // will change the original list
            clonedList = module.util.cloneArray(list),
            results = [],
            i;

        if (clonedList.length === 0) {
            callback(results);
        }

        var callForItem = function (idx) {
            function funcFinishCallback(result) {
                completedCount += 1;

                results[idx] = result;

                if (completedCount === clonedList.length) {
                    callback(results);
                }
            }

            func(clonedList[idx], funcFinishCallback);
        };

        for(i = 0; i < clonedList.length; i++) {
            callForItem(i);
        }
    };

    var lastCacheDate = null;

    var getUncachableURL = function (url, cache) {
        if (cache === false || cache === 'none' || cache === 'repeated') {
            if (lastCacheDate === null || cache !== 'repeated') {
                lastCacheDate = Date.now();
            }
            return url + "?_=" + lastCacheDate;
        } else {
            return url;
        }
    };

    module.util.ajax = function (url, options, successCallback, errorCallback) {
        var ajaxRequest = new window.XMLHttpRequest(),
            joinedUrl = module.util.joinUrl(options.baseUrl, url),
            augmentedUrl;

        augmentedUrl = getUncachableURL(joinedUrl, options.cache);

        ajaxRequest.addEventListener("load", function () {
            if (ajaxRequest.status === 200 || ajaxRequest.status === 0) {
                successCallback(ajaxRequest.response);
            } else {
                errorCallback();
            }
        }, false);

        ajaxRequest.addEventListener("error", function () {
            errorCallback();
        }, false);

        try {
            ajaxRequest.open('GET', augmentedUrl, true);
            ajaxRequest.overrideMimeType(options.mimeType);
            ajaxRequest.send(null);
        } catch (err) {
            errorCallback();
        }
    };

    module.util.binaryAjax = function (url, options, successCallback, errorCallback) {
        var binaryContent = "",
            ajaxOptions = module.util.clone(options);

        ajaxOptions.mimeType = 'text/plain; charset=x-user-defined';

        module.util.ajax(url, ajaxOptions, function (content) {
            for (var i = 0; i < content.length; i++) {
                binaryContent += String.fromCharCode(content.charCodeAt(i) & 0xFF);
            }
            successCallback(binaryContent);
        }, errorCallback);
    };

    var detectMimeType = function (content) {
        var startsWith = function (string, substring) {
            return string.substring(0, substring.length) === substring;
        };

        if (startsWith(content, '<?xml') || startsWith(content, '<svg')) {
            return 'image/svg+xml';
        }
        return 'image/png';
    };

    module.util.getDataURIForImageURL = function (url, options, successCallback, errorCallback) {
        var base64Content, mimeType;

        module.util.binaryAjax(url, options, function (content) {
            base64Content = btoa(content);

            mimeType = detectMimeType(content);

            successCallback('data:' + mimeType + ';base64,' + base64Content);
        }, function () {
            errorCallback();
        });
    };

    var uniqueIdList = [];

    var constantUniqueIdFor = function (element) {
        // HACK, using a list results in O(n), but how do we hash a function?
        if (uniqueIdList.indexOf(element) < 0) {
            uniqueIdList.push(element);
        }
        return uniqueIdList.indexOf(element);
    };

    module.util.memoize = function (func, hasher, memo) {
        if (typeof memo !== "object") {
            throw new Error("cacheBucket is not an object");
        }

        return function () {
            var args = Array.prototype.slice.call(arguments),
                successCallback, errorCallback;

            if (args.length > 2 && typeof args[args.length-2] === 'function') {
                 errorCallback = args.pop();
                 successCallback = args.pop();
            } else {
                successCallback = args.pop();
            }

            var argumentHash = hasher(args),
                funcHash = constantUniqueIdFor(func),
                allArgs;

            if (memo[funcHash] && memo[funcHash][argumentHash]) {
                successCallback.apply(null, memo[funcHash][argumentHash]);
            } else {
                allArgs = args.concat(function () {
                    memo[funcHash] = memo[funcHash] || {};
                    memo[funcHash][argumentHash] = arguments;
                    successCallback.apply(null, arguments);
                });
                if (errorCallback) {
                    allArgs = allArgs.concat(errorCallback);
                }
                func.apply(null, allArgs);
            }
        };
    };

    var cloneObject = function(object) {
        var newObject = {},
            i;
        for (i in object) {
            if (object.hasOwnProperty(i)) {
                newObject[i] = object[i];
            }
        }
        return newObject;
    };

    var isFunction = function (func) {
        return typeof func === "function";
    };

    module.util.parseOptionalParameters = function () { // args: options, callback
        var parameters = {
            options: {},
            callback: null
        };

        if (isFunction(arguments[0])) {
            parameters.callback = arguments[0];
        } else {
            parameters.options = cloneObject(arguments[0]);
            parameters.callback = arguments[1] || null;
        }

        return parameters;
    };

    return module;
}(window.rasterizeHTMLInline || {}, window, url));
