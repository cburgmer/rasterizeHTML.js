window.diffHelper = (function () {
    var module = {};

    // Work around https://github.com/HumbleSoftware/js-imagediff/issues/18
    module.imageEquals = function (a, b, tolerancePercentage) {
        var aData = imagediff.toImageData(a).data,
            bData = imagediff.toImageData(b).data,
            length = aData.length,
            sumDifferences = 0,
            i;

        tolerancePercentage = tolerancePercentage || 0;

        for (i = 0; i < length; i++) {
            sumDifferences += Math.abs(aData[i] - bData[i]);
        };

        return sumDifferences / (255 * length) <= tolerancePercentage / 100;
    };

    module.matcher = {
        toEqualImage: function (util, customEqualityTesters) {
            return {
                compare: function (actual, expected, tolerancePercentage) {
                    var result = {};
                    result.pass = module.imageEquals(actual, expected, tolerancePercentage);
                    return result;
                }
            };
        },
        // work around imagediff only supporting jasmine 1.x
        toImageDiffEqual: function (util, customEqualityTesters) {
            return {
                compare: function (actual, expected, tolerancePercentage) {
                    var context = {actual: actual},
                        result = {};
                    result.pass = imagediff.jasmine.toImageDiffEqual.call(context, expected, tolerancePercentage);
                    return result;
                }
            };
        }
    };

    return module;
}());
