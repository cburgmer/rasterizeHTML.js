#!/usr/bin/env node
// globals isEqual
// jshint esversion: 6
"use strict";

/* jshint ignore:start */
const path = require("path");
const puppeteer = require('puppeteer');

const fileUrl = (relPath) => {
    return 'file://' + path.resolve(process.cwd(), relPath);
};

var dataUriForBase64PNG = (pngBase64) => {
    return "data:image/png;base64," + pngBase64;
};

const renderPage = async (browser, url, successCallback) => {
    const page = await browser.newPage();

    page.on('console', msg => {
        for (let i = 0; i < msg.args().length; ++i) {
            console.log(`${i}: ${msg.args()[i]}`);
        }
    });
    page.on('pageerror', msg => {
        console.error(msg);
    });
    await page.setViewport({ width: 200, height: 100 });
    await page.goto(url);

    await new Promise(fulfill => setTimeout(fulfill, 500));

    const screenshot = await page.screenshot();
    return dataUriForBase64PNG(screenshot.toString('base64'));
};

const runTest = async (browser) => {
    const imageUrl = await renderPage(browser, fileUrl('test/integrationTestPage.html'));
    const targetImageUrl = await renderPage(browser, fileUrl('test/fixtures/testResult.png'));
    console.log('imageUrl', imageUrl);
    console.log('targetImageUrl', targetImageUrl);

    const imageDiffPage = await browser.newPage();
    await imageDiffPage.goto(fileUrl('test/diffHelperPage.html'));

    const equal = await imageDiffPage.evaluate(function (url1, url2) {
        return isEqual(url1, url2, 5);
    }, imageUrl, targetImageUrl);

    const screenshotTarget = 'build/rasterizeHtmlSmokeTestDiff.png';
    console.log('Writing diff to ' + screenshotTarget);
    await imageDiffPage.screenshot({path: screenshotTarget});

    return equal;
};

(async () => {
    try {
        const browser = await puppeteer.launch({args: ['--allow-file-access-from-files']});
        const success = await runTest(browser);
        browser.close();

        process.exit(success ? 0 : 1);
    } catch (e) {
        console.error(e);
        process.exit(2);
    }
})();
/* jshint ignore:end */
