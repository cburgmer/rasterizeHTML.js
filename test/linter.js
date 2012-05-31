// Inspired by https://github.com/arthurakay/PhantomLint
var JSHINT;

phantom.injectJs('lib/jshint.js');

jslinter = (function () {
    var filesystem = require('fs'),
        j = 0,
        files,
        file, js;

    var setFiles = function (new_files) {
        files = new_files;
    };

    var run = function () {
        console.log("Files: " + files);
        for (; j < files.length; j++) {

            file = files[j];
            js   = filesystem.read(file);

            var i           = 0,
                result      = JSHINT(js),
                totalErrors = JSHINT.errors.length,
                error;

            if (!result) {
                for  (; i < totalErrors; i++)  {
                    error = JSHINT.errors[i];

                    if (error) {
                        /**
                         * Output error and stop
                         */
                        console.log(
                            [
                                file,
                                error.line,
                                error.character,
                                error.reason
                            ].join(':'),
                            true
                        );

                        console.log("\nDude, uncool");
                        phantom.exit(1);
                    }
                }
            }
        }
    };

    return {
        setFiles: setFiles,
        run: run
    };
}());
