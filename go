#!/bin/bash
set -e

PUBLISH_SMOKE_TEST_DIFF="$1"
SMOKE_TEST_DIFF="test/rasterizeHtmlSmokeTestDiff.png"

installDependencies() {
    npm install
}

build() {
    ./node_modules/.bin/grunt
}

runIntegrationTest() {
    ./node_modules/.bin/slimerjs test/phantomIntegrationTest.js
}

main() {
    if [ ! -d node_modules ]; then
        installDependencies
    fi

    build
    runIntegrationTest | tee /tmp/go.$$
    if [[ -f "$SMOKE_TEST_DIFF" && -n "$PUBLISH_SMOKE_TEST_DIFF" ]]; then
        curl -F file="@${SMOKE_TEST_DIFF}" https://imagebin.ca/upload.php
    fi
    # Sadly slimerjs cannot return errorcodes
    cat /tmp/go.$$ | grep success
}

main
