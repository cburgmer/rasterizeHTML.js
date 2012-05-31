#!/bin/sh
cd test
echo "Running jshint..."
phantomjs lint.js
exit_status=$?
if [ "$exit_status" != "0" ]; then
    exit $exit_status
fi
echo "Running jasmine"
phantomjs lib/phantomjs-testrunner.js file://`pwd`/SpecRunner.html
