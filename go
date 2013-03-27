function testFailure {
    if [ $? != 0 ]; then
        exit 1;
    fi
}

./node_modules/.bin/grunt
testFailure
cd test && phantomjs phantomIntegrationTest.js
testFailure
