const globals = require("globals");
const { defineConfig, globalIgnores } = require("eslint/config");

const commonRules = {
    // curly: true
    curly: "error",
    // eqeqeq: true + eqnull: true
    eqeqeq: ["error", "always", { null: "ignore" }],
    // immed: true (wrap immediately invoked function expressions)
    "wrap-iife": ["error", "any"],
    // latedef: true
    "no-use-before-define": [
        "error",
        { functions: true, classes: true, variables: true },
    ],
    // newcap: true
    "new-cap": "error",
    // noarg: true
    "no-caller": "error",
    // undef: true
    "no-undef": "error",
    // trailing: true
    "no-trailing-spaces": "error",
    // laxbreak: true - allow line breaks before operators
    "operator-linebreak": "off",
};

module.exports = defineConfig([
    globalIgnores([
        "test/performance_test_pages/**/*.js",
        "test/fixtures/*.js",
    ]),
    {
        files: ["src/**/*.js"],
        languageOptions: {
            ecmaVersion: 2018,
            sourceType: "script",
            globals: {
                ...globals.browser,
                util: "readonly",
                proxies: "readonly",
                documentUtil: "readonly",
                documentHelper: "readonly",
                browser: "readonly",
                svg2image: "readonly",
                document2svg: "readonly",
                rasterize: "readonly",
                // external dependencies
                url: "readonly",
                xmlserializer: "readonly",
                sanedomparsererror: "readonly",
                inlineresources: "readonly",
            },
        },
        rules: {
            ...commonRules,
            // unused: true - but allow exported module-level vars
            "no-unused-vars": [
                "error",
                {
                    varsIgnorePattern:
                        "^(util|proxies|documentUtil|documentHelper|browser|svg2image|document2svg|rasterize|rasterizeHTML)$",
                },
            ],
            // strict: true
            strict: ["error", "function"],
        },
    },
    {
        files: ["test/**/*.js"],
        languageOptions: {
            ecmaVersion: 2018,
            sourceType: "script",
            globals: {
                ...globals.browser,
                ...globals.node,
                Promise: true,
                // console etc from devel
                console: true,
                alert: true,
                // jasmine globals
                jasmine: true,
                describe: true,
                it: true,
                xit: true,
                beforeEach: true,
                afterEach: true,
                expect: true,
                fail: true,
                spyOn: true,
                // project test helpers
                ifNotInWebkitOrBlinkIt: true,
                testHelper: true,
                diffHelper: true,
                // project globals
                util: true,
                proxies: true,
                documentUtil: true,
                documentHelper: true,
                browser: true,
                svg2image: true,
                document2svg: true,
                rasterize: true,
                rasterizeHTML: true,
                imagediff: true,
                // external dependencies
                inlineresources: true,
                isEqual: true,
            },
        },
        rules: {
            ...commonRules,
            // unused: true - allow unused function parameters (common in test callbacks)
            "no-unused-vars": ["error", { args: "none" }],
            // strict: true - disabled in test files as they have mixed patterns
            strict: "off",
        },
    },
    {
        files: ["Gruntfile.js"],
        languageOptions: {
            ecmaVersion: 2018,
            sourceType: "script",
            globals: {
                ...globals.node,
                module: true,
            },
        },
        rules: {
            ...commonRules,
            "no-unused-vars": "error",
            strict: "off",
        },
    },
]);
