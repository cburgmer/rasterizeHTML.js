window.rasterizeHTMLInline = (function (module, window, URI) {
    "use strict";

    module.util = {};

    module.util.getUrlRelativeToDocumentBase = function (url, baseUrl) {
        if (baseUrl && baseUrl !== "about:blank") {
            url = module.util.joinUrl(baseUrl, url);
        }

        return url;
    };

    module.util.cloneArray = function (nodeList) {
        return Array.prototype.slice.apply(nodeList, [0]);
    };

    module.util.joinUrl = function (baseUrl, url) {
        var theUrl = new URI(url);
        if (theUrl.is("relative")) {
            theUrl = theUrl.absoluteTo(baseUrl);
        }
        return theUrl.toString();
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

    var getUncachableURL = function (url, workAroundCaching, cacheRepeated) {
        if (workAroundCaching) {
            if (lastCacheDate === null || !cacheRepeated) {
                lastCacheDate = Date.now();
            }
            return url + "?_=" + lastCacheDate;
        } else {
            return url;
        }
    };

    module.util.ajax = function (url, options, successCallback, errorCallback) {
        var ajaxRequest = new window.XMLHttpRequest(),
            augmentedUrl;

        options = options || {};
        augmentedUrl = getUncachableURL(url, options.cache === false, options.cacheRepeated);

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
        var binaryContent = "";

        options = options || {};

        module.util.ajax(url, {
            mimeType: 'text/plain; charset=x-user-defined',
            cache: options.cache
        }, function (content) {
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
}(window.rasterizeHTMLInline || {}, window, URI));
