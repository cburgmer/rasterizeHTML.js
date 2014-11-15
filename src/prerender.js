var prerender = (function (util, proxies, ayepromise, theWindow) {
    "use strict";

    var module = {};

    var createHiddenIFrame = function (doc, width, height, executeJs) {
        var iframe = doc.createElement('iframe');
        iframe.style.width = width + "px";
        iframe.style.height = height + "px";
        // 'display: none' doesn't cut it, as browsers seem to be lazy loading content
        iframe.style.visibility = "hidden";
        iframe.style.position = "absolute";
        iframe.style.top = (-10000 - height) + "px";
        iframe.style.left = (-10000 - width) + "px";
        if (! executeJs) {
            iframe.sandbox = 'allow-same-origin';
        }
        return iframe;
    };

    var createIframeWithSizeAtZoomLevel1 = function (width, height, zoom, executeJs) {
        var scaledViewportWidth = Math.floor(width / zoom),
            scaledViewportHeight = Math.floor(height / zoom);

        return createHiddenIFrame(theWindow.document, scaledViewportWidth, scaledViewportHeight, executeJs);
    };

    var calculateZoomedContentSizeAndRoundUp = function (actualViewport, requestedWidth, requestedHeight, zoom) {
        return {
            width: Math.max(actualViewport.width * zoom, requestedWidth),
            height: Math.max(actualViewport.height * zoom, requestedHeight)
        };
    };

    var calculateContentSize = function (doc, selector, requestedWidth, requestedHeight, zoom) {
            // clientWidth/clientHeight needed for PhantomJS
        var actualViewportWidth = Math.max(doc.documentElement.scrollWidth, doc.body.clientWidth),
            actualViewportHeight = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, doc.body.clientHeight),
            top, left, originalWidth, originalHeight, rootFontSize,
            element, rect, contentSize;

        if (selector) {
            element = doc.querySelector(selector);

            if (!element) {
                throw {
                    message: "Clipping selector not found"
                };
            }

            rect = element.getBoundingClientRect();

            top = rect.top;
            left = rect.left;
            originalWidth = rect.width;
            originalHeight = rect.height;
        } else {
            top = 0;
            left = 0;
            originalWidth = actualViewportWidth;
            originalHeight = actualViewportHeight;
        }

        contentSize = calculateZoomedContentSizeAndRoundUp({
                width: originalWidth,
                height: originalHeight
            },
            requestedWidth,
            requestedHeight,
            zoom);

        rootFontSize = theWindow.getComputedStyle(doc.documentElement).fontSize;

        return {
            left: left,
            top: top,
            width: contentSize.width,
            height: contentSize.height,
            viewportWidth: actualViewportWidth,
            viewportHeight: actualViewportHeight,

            rootFontSize: rootFontSize
        };
    };

    module.prerender = function (doc, options) {
        var html = doc.documentElement.outerHTML,
            iframeErrorsMessages = [],
            defer = ayepromise.defer(),
            zoom = options.zoom || 1,
            executeJs = options.executeJs || false,
            timeout = options.executeJsTimeout || 0,
            iframe;
        iframe = createIframeWithSizeAtZoomLevel1(options.width, options.height, zoom, executeJs);

        var doResolve = function () {
            var renderedDoc = iframe.contentDocument,
                size;

            try {
                size = calculateContentSize(renderedDoc, options.clip, options.width, options.height, zoom);
                
                defer.resolve({
                    document: renderedDoc,
                    size: size,
                    errors: iframeErrorsMessages
                });
            } catch (e) {
                defer.reject(e);
            } finally {
                //theWindow.document.getElementsByTagName("body")[0].removeChild(iframe);
            }
        };

        // We need to add the element to the document so that its content gets loaded
        theWindow.document.getElementsByTagName("body")[0].appendChild(iframe);

        var waitForJavaScriptToRun = function () {
            var d = ayepromise.defer();
            if (timeout > 0) {
                setTimeout(d.resolve, timeout);
            } else {
                d.resolve();
            }
            return d.promise;
        };

        iframe.onload = function () {
            waitForJavaScriptToRun()
                .then(finishNotifyXhrProxy.waitForRequestsToFinish)
                .then(doResolve);
        };

        var xhr = iframe.contentWindow.XMLHttpRequest,
            finishNotifyXhrProxy = proxies.finishNotifyingXhr(xhr),
            baseUrlXhrProxy = proxies.baseUrlRespectingXhr(finishNotifyXhrProxy, options.baseUrl);

        iframe.contentDocument.open();
        iframe.contentWindow.XMLHttpRequest = baseUrlXhrProxy;
        iframe.contentWindow.Image = proxies.baseUrlRespectingImage(iframe.contentWindow.Image, options.baseUrl);
        iframe.contentWindow.onerror = function (msg) {
            iframeErrorsMessages.push({
                resourceType: "scriptExecution",
                msg: msg
            });
        };

        iframe.contentDocument.write(html);
        iframe.contentDocument.close();

        return defer.promise;
    };

    return module;
}(util, proxies, ayepromise, window));
