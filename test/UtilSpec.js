describe("Utilities", function () {
    describe("Clone list", function () {
        it("should create a copy of the given list", function () {
            var input = [1, 2, 3],
                output;

            output = rasterizeHTML.util.cloneArray(input);

            expect(input).toEqual(output);
            expect(input).not.toBe(output);
        });
    });
    describe("Mapping", function () {
        it("should map each value to one function call and then call complete function", function () {
            var completedValues = [],
                completed = false;

            rasterizeHTML.util.map([1, 2, 3], function (val, callback) {
                completedValues.push(val);

                callback();
            }, function () {
                completed = true;
            });

            expect(completed).toBeTruthy();
            expect(completedValues).toEqual([1, 2, 3]);
        });

        it("should pass computed results as array to complete function", function () {
            var computedResults = null;

            rasterizeHTML.util.map([1, 2, 3], function (val, callback) {
                callback(val + 1);
            }, function (results) {
                computedResults = results;
            });

            expect(computedResults).toEqual([2, 3, 4]);
        });

        it("should pass computed results in the right order to complete function", function () {
            var computedResults = null,
                late2ndCallback = null;

            rasterizeHTML.util.map([1, 2, 3], function (val, callback) {

                if (val === 2) {
                    late2ndCallback = callback;
                } else {
                    callback(val + 1);
                }
            }, function (results) {
                computedResults = results;
            });

            late2ndCallback(2 + 1);

            expect(computedResults).toEqual([2, 3, 4]);
        });

        it("should call complete if empty list is passed", function () {
            var completed = false,
                computedResults = null;

            rasterizeHTML.util.map([], function (val, callback) {}, function (results) {
                completed = true;
                computedResults = results;
            });

            expect(completed).toBeTruthy();
            expect(computedResults).toEqual([]);
        });

        it("should not call complete until last value is handled", function () {
            var completedValues = [],
                completed = false,
                lastCallback = null;

            rasterizeHTML.util.map([1, 2, 3], function (val, callback) {
                completedValues.push(val);

                if (val < 3) {
                    callback();
                } else {
                    lastCallback = callback;
                }
            }, function () {
                completed = true;
            });

            expect(completed).toBeFalsy();

            lastCallback();

            expect(completed).toBeTruthy();
        });

        it("should cope with parallel changes to the input list", function () {
            var input = [1, 2, 3],
                computedResults = null;

            rasterizeHTML.util.map(input, function (val, callback) {

                if (val === 2) {
                    // Remove middle element
                    input.splice(1, 1);
                }
                callback(val);
            }, function (results) {
                computedResults = results;
            });

            expect(computedResults).toEqual([1, 2, 3]);
        });

    });
});
