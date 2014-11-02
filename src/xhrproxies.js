// Proxy objects by monkey patching
var xhrproxies = (function (util, ayepromise) {
    var module = {};

    var monkeyPatchInstanceMethod = function (object, methodName, proxyFunc) {
        var originalFunc = object[methodName];

        object[methodName] = function () {
            var args = Array.prototype.slice.call(arguments);

            return proxyFunc.apply(this, [args, originalFunc]);
        };

        return originalFunc;
    };

    // Bases the image's source on the given base URL
    module.baseUrlRespectingImage = function (ImageObject, baseUrl) {
        var emptyStringIfUndefined = function (src) {
            return src === undefined ? '' : src;
        };
        var nullIfUndefined = function (src) {
            return src === undefined ? null : src;
        };

        var imageConstructor = function () {
            var image = new ImageObject(),
                setAttribute, getAttribute,
                originalSrc;

            var augmentSrc = function (src) {
                originalSrc = src;
                return util.joinUrl(baseUrl, src);
            };

            setAttribute = monkeyPatchInstanceMethod(image, 'setAttribute', function (args, originalSetAttribute) {
                var attr = args.shift(),
                    value = args.shift();

                if (attr === 'src') {
                    value = augmentSrc(value);
                }
                return originalSetAttribute.apply(this, [attr, value].concat(args));
            });
            getAttribute = monkeyPatchInstanceMethod(image, 'getAttribute', function (args, originalGetAttribute) {
                var attr = args.shift();

                if (attr === 'src') {
                    return nullIfUndefined(originalSrc);
                }
                return originalGetAttribute.apply(this, [attr].concat(args));
            });

            image.__defineSetter__('src', function (url) {
                setAttribute.call(image, 'src', augmentSrc(url));
            });
            image.__defineGetter__('src', function () {
                return emptyStringIfUndefined(originalSrc);
            });

            return image;
        };

        return imageConstructor;
    };

    // Bases all XHR calls on the given base URL
    module.baseUrlRespectingXhr = function (XHRObject, baseUrl) {
        var xhrConstructor = function () {
            var xhr = new XHRObject();

            monkeyPatchInstanceMethod(xhr, 'open', function (args, originalOpen) {
                var method = args.shift(),
                    url = args.shift(),
                    joinedUrl = util.joinUrl(baseUrl, url);

                return originalOpen.apply(this, [method, joinedUrl].concat(args));
            });

            return xhr;
        };

        return xhrConstructor;
    };

    // Provides a convenient way of being notified when all pending XHR calls are finished
    module.finishNotifyingXhr = function (XHRObject) {
        var totalXhrCount = 0,
            doneXhrCount = 0,
            waitingForPendingToClose = false,
            defer = ayepromise.defer();

        var checkAllRequestsFinished = function () {
            var pendingXhrCount = totalXhrCount - doneXhrCount;

            if (pendingXhrCount <= 0 && waitingForPendingToClose) {
                defer.resolve({totalCount: totalXhrCount});
            }
        };

        var xhrConstructor = function () {
            var xhr = new XHRObject();

            monkeyPatchInstanceMethod(xhr, 'send', function (_, originalSend) {
                totalXhrCount += 1;
                return originalSend.apply(this, arguments);
            });

            xhr.addEventListener('load', function () {
                doneXhrCount += 1;

                checkAllRequestsFinished();
            });

            return xhr;
        };

        xhrConstructor.waitForRequestsToFinish = function () {
            waitingForPendingToClose = true;
            checkAllRequestsFinished();
            return defer.promise;
        };

        return xhrConstructor;
    };

    return module;
}(util, ayepromise));
