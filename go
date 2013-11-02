#!/bin/bash
set -e

function installBuildDependencies {
    npm install
}

function installDependencies {
    ./node_modules/.bin/bower install
}

function build {
    ./node_modules/.bin/grunt $@
}

function runIntegrationTest {
    cd test && phantomjs phantomIntegrationTest.js

}


if [ ! -d node_modules ]; then
    installBuildDependencies
fi

if [ ! -d bower_components ]; then
    installDependencies
fi

build
runIntegrationTest
