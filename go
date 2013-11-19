#!/bin/bash
set -e

installBuildDependencies() {
    npm install
}

installDependencies() {
    ./node_modules/.bin/bower install
}

build() {
    ./node_modules/.bin/grunt $@
}

runIntegrationTest() {
    phantomjs test/phantomIntegrationTest.js
}

runCharacterisationTest() {
    ./test/inlineIntegration/runInlineTests.sh
}

main() {
    if [ ! -d node_modules ]; then
        installBuildDependencies
    fi

    if [ ! -d bower_components ]; then
        installDependencies
    fi

    build
    runIntegrationTest
    runCharacterisationTest
}

main
