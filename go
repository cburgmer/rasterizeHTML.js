#!/bin/bash
set -e

PUBLISH_SMOKE_TEST_DIFF="$1"
SMOKE_TEST_DIFF="build/rasterizeHtmlSmokeTestDiff.png"

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
    if ! ./test/integrationTest.js; then
        if [[ -n "$PUBLISH_SMOKE_TEST_DIFF" ]]; then
            curl -F file="@${SMOKE_TEST_DIFF}" https://imagebin.ca/upload.php
        fi
        exit 1
    fi
}

main
