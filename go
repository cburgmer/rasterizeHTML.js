#!/bin/bash
set -e

installDependencies() {
    npm install
}

build() {
    ./node_modules/.bin/grunt $@
}

runIntegrationTest() {
    SLIMERJSLAUNCHER=$FIREFOX_PATH ./node_modules/.bin/slimerjs test/phantomIntegrationTest.js
}

main() {
    if [ ! -d node_modules ]; then
        installDependencies
    fi

    build
    runIntegrationTest
}

main
