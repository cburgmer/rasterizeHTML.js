#!/bin/bash
set -e

# Work around https://github.com/laurentj/slimerjs/issues/172
FIREFOX_PATH=$SLIMERJSLAUNCHER
if [ -z $FIREFOX_PATH ]; then
    if which firefox; then
        FIREFOX_PATH=$(which firefox)
    else
        FIREFOX_PATH="/Applications/Firefox.app/Contents/MacOS/firefox"
    fi
fi

installDependencies() {
    npm install
}

installSlimerJS() {
    # Work around https://github.com/laurentj/slimerjs/issues/64
    wget "http://download.slimerjs.org/v0.9/0.9.1/slimerjs-0.9.1.zip"
    unzip "slimerjs-0.9.1.zip"
    mv "slimerjs-0.9.1" slimerjs
    rm "slimerjs-0.9.1.zip"
}

build() {
    ./node_modules/.bin/grunt $@
}

runIntegrationTest() {
    PATH=`pwd`/slimerjs/:$PATH SLIMERJSLAUNCHER=$FIREFOX_PATH slimerjs test/phantomIntegrationTest.js
}

main() {
    if [ ! -d node_modules ]; then
        installDependencies
    fi

    if [ ! -d slimerjs ]; then
        installSlimerJS
    fi

    build
    runIntegrationTest
}

main
