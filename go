#!/bin/bash
set -e

installDependencies() {
    npm install
}

installDependenciesNotYetOnNPM() {
    ./node_modules/.bin/bower install
}

installSlimerJS() {
    # Work around https://github.com/laurentj/slimerjs/issues/64
    wget "http://download.slimerjs.org/v0.9/0.9.1/slimerjs-0.9.1.zip"
    unzip "slimerjs-0.9.1.zip"
    mv "slimerjs-0.9.1" slimerjs
}

build() {
    ./node_modules/.bin/grunt $@
}

runIntegrationTest() {
    phantomjs test/phantomIntegrationTest.js
}

runCharacterisationTest() {
    # Work around https://github.com/laurentj/slimerjs/issues/172
    FIREFOX_PATH=$SLIMERJSLAUNCHER
    if [ -z $FIREFOX_PATH ]; then
        FIREFOX_PATH="/Applications/Firefox.app/Contents/MacOS/firefox"
    fi
    PATH=`pwd`/slimerjs/:$PATH SLIMERJSLAUNCHER=$FIREFOX_PATH ./test/inlineIntegration/runInlineTests.sh
}

main() {
    if [ ! -d node_modules ]; then
        installDependencies
    fi

    if [ ! -d bower_components ]; then
        installDependenciesNotYetOnNPM
    fi

    if [ ! -d slimerjs ]; then
        installSlimerJS
    fi

    build
    runIntegrationTest
    runCharacterisationTest
}

main
