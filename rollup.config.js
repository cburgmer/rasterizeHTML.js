const pkg = require("./package.json");

const today = new Date().toISOString().split("T")[0];
const year = new Date().getFullYear();

const banner = `/*! ${pkg.title || pkg.name} - v${pkg.version} - ${today}
* ${pkg.homepage}
* Copyright (c) ${year} ${pkg.author.name}; Licensed ${pkg.license} */`;

module.exports = [
    // UMD build (for browsers and CommonJS)
    {
        input: "build/rasterizeHTML.concat.js",
        output: {
            file: "dist/rasterizeHTML.js",
            format: "umd",
            name: "rasterizeHTML",
            banner,
            globals: {
                url: "url",
                xmlserializer: "xmlserializer",
                "sane-domparser-error": "sanedomparsererror",
                inlineresources: "inlineresources",
            },
        },
        external: [
            "url",
            "xmlserializer",
            "sane-domparser-error",
            "inlineresources",
        ],
    },
    // ESM build
    {
        input: "build/rasterizeHTML.concat.js",
        output: {
            file: "dist/rasterizeHTML.mjs",
            format: "es",
            banner,
        },
        external: [
            "url",
            "xmlserializer",
            "sane-domparser-error",
            "inlineresources",
        ],
    },
];
