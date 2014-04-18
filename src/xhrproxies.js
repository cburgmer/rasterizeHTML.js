var xhrproxies = (function (util, ayepromise) {
    var module = {};

    // Bases all XHR calls on the given base URL
    module.baseUrlRespecting = function (XHRObject, baseUrl) {
        var xhrConstructor = function () {
            var xhr = new XHRObject(),
                open = xhr.open;

            xhr.open = function () {
                var args = Array.prototype.slice.call(arguments),
                    method = args.shift(),
                    url = args.shift(),
                    joinedUrl = util.joinUrl(baseUrl, url);

                return open.apply(this, [method, joinedUrl].concat(args));
            };

            return xhr;
        };

        return xhrConstructor;
    };

    // Provides a convenient way of being notified when all pending XHR calls are finished
    module.finishNotifying = function (XHRObject) {
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
            var xhr = new XHRObject(),
                send = xhr.send;

            xhr.send = function () {
                totalXhrCount += 1;
                return send.apply(this, arguments);
            };

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
