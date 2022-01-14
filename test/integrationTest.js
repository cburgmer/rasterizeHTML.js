#!/usr/bin/env node
// globals isEqual
// jshint esversion: 6
"use strict";

/* jshint ignore:start */
const path = require("path");
const puppeteer = require("puppeteer");

const viewport = { width: 200, height: 100 };

const fileUrl = (relPath) => {
    return "file://" + path.resolve(process.cwd(), relPath);
};

const screenshotToDataUri = (screenshot) => {
    return "data:image/png;base64," + screenshot.toString("base64");
};

const sleep = async (inMs) => {
    await new Promise((fulfill) => setTimeout(fulfill, inMs));
};

const renderPage = async (browser, url, successCallback) => {
    const page = await browser.newPage();

    page.on("console", (msg) => {
        for (let i = 0; i < msg.args().length; ++i) {
            console.log(`${i}: ${msg.args()[i]}`);
        }
    });
    page.on("pageerror", (msg) => {
        console.error(msg);
    });
    await page.setViewport(viewport);
    await page.goto(url);

    await sleep(500);

    const screenshot = await page.screenshot();
    return screenshotToDataUri(screenshot);
};

const runTest = async (browser) => {
    const imageUrl = await renderPage(
        browser,
        fileUrl("test/integrationTestPage.html")
    );
    const targetImageUrl = await renderPage(
        browser,
        fileUrl("test/fixtures/testResult.png")
    );
    console.log("Rendered test page", imageUrl);

    const imageDiffPage = await browser.newPage();
    await imageDiffPage.setViewport(viewport);
    await imageDiffPage.goto(fileUrl("test/diffHelperPage.html"));

    const equal = await imageDiffPage.evaluate(
        function (url1, url2) {
            return isEqual(url1, url2, 4);
        },
        imageUrl,
        targetImageUrl
    );

    const screenshot = await imageDiffPage.screenshot();
    console.log("Rendered diff", screenshotToDataUri(screenshot));

    return equal;
};

(async () => {
    try {
        const browser = await puppeteer.launch({
            args: ["--allow-file-access-from-files"],
            slowMo: 100,
            headless: true,
        });
        const success = await runTest(browser);
        browser.close();

        if (success) {
            console.log("Success");
            process.exit(0);
        } else {
            console.log("Fail");
            process.exit(1);
        }
    } catch (e) {
        console.error(e);
        process.exit(2);
    }
})();
/* jshint ignore:end */
