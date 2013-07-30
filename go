set -e

./node_modules/.bin/grunt
cd test && phantomjs phantomIntegrationTest.js
