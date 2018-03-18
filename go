#!/bin/bash
set -e

npm install
./node_modules/.bin/grunt
./test/integrationTest.js
