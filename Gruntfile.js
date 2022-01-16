/*global module:false*/
module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        connect: {
            server: {
                options: {
                    port: 8765,
                    hostname: "127.0.0.1",
                    middleware: function (connect, options, middlewares) {
                        middlewares.unshift(function (req, res, next) {
                            if (/\s*\.html/.test(req.url)) {
                                // work around https://github.com/gruntjs/grunt-contrib-connect/issues/95
                                res.setHeader("Content-Type", "text/html;");
                            }
                            return next();
                        });
                        return middlewares;
                    },
                },
            },
        },
        jasmine: {
            src: [
                "build/dependencies/*.js",
                "node_modules/xmlserializer/xmlserializer.js",
                "src/util.js",
                "src/proxies.js",
                "src/documentUtil.js",
                "src/documentHelper.js",
                "src/browser.js",
                "src/svg2image.js",
                "src/document2svg.js",
                "src/rasterize.js",
                "src/index.js",
            ],
            options: {
                host: "http://127.0.0.1:8765/",
                specs: "test/specs/*.js",
                vendor: ["node_modules/imagediff/imagediff.js"],
                helpers: [
                    "test/helpers.js",
                    "test/diffHelper.js",
                    "test/testHelper.js",
                    "test/gruntpath.js",
                ],
                display: "short",
                summary: true,
                version: "3.8.0", // https://github.com/gruntjs/grunt-contrib-jasmine/issues/339
            },
        },
        browserify: {
            sanedomparsererror: {
                src: "node_modules/sane-domparser-error/index.js",
                dest: "build/dependencies/sane-domparser-error.js",
                options: {
                    browserifyOptions: {
                        standalone: "sanedomparsererror",
                    },
                },
            },
            url: {
                src: "node_modules/url/url.js",
                dest: "build/dependencies/url.js",
                options: {
                    browserifyOptions: {
                        standalone: "url",
                    },
                },
            },
            inlineresources: {
                src: "node_modules/inlineresources/src/inline.js",
                dest: "build/dependencies/inlineresources.js",
                options: {
                    browserifyOptions: {
                        standalone: "inlineresources",
                    },
                },
            },
            allinone: {
                src: "dist/rasterizeHTML.js",
                dest: "build/rasterizeHTML.allinone.js",
                options: {
                    browserifyOptions: {
                        standalone: "rasterizeHTML",
                    },
                },
            },
        },
        clean: {
            all: ["build", "dist"],
        },
        umd: {
            all: {
                src: "build/rasterizeHTML.concat.js",
                dest: "build/rasterizeHTML.umd.js",
                objectToExport: "rasterizeHTML",
                indent: "    ",
                deps: {
                    default: [
                        "url",
                        "xmlserializer",
                        "sanedomparsererror",
                        "inlineresources",
                    ],
                    cjs: [
                        "url",
                        "xmlserializer",
                        "sane-domparser-error",
                        "inlineresources",
                    ],
                    amd: [
                        "url",
                        "xmlserializer",
                        "sane-domparser-error",
                        "inlineresources",
                    ],
                },
            },
        },
        concat: {
            one: {
                src: [
                    "src/util.js",
                    "src/proxies.js",
                    "src/documentUtil.js",
                    "src/documentHelper.js",
                    "src/browser.js",
                    "src/svg2image.js",
                    "src/document2svg.js",
                    "src/rasterize.js",
                    "src/index.js",
                ],
                dest: "build/rasterizeHTML.concat.js",
            },
            dist: {
                options: {
                    banner:
                        "/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - " +
                        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        "* <%= pkg.homepage %>\n" +
                        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                        " Licensed <%= pkg.license %> */\n",
                },
                src: ["build/rasterizeHTML.umd.js"],
                dest: "dist/<%= pkg.title %>",
            },
            types: {
                options: {
                    banner:
                        "/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - " +
                        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        "* <%= pkg.homepage %>\n" +
                        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                        " Licensed <%= pkg.license %> */\n",
                },
                src: "src/typings.d.ts",
                dest: "<%=pkg.types%>",
            },
        },
        uglify: {
            dist: {
                options: {
                    banner:
                        "/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - " +
                        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        "* <%= pkg.homepage %>\n" +
                        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                        " Licensed <%= pkg.license %> */\n",
                },
                files: {
                    "dist/rasterizeHTML.min.js": ["dist/rasterizeHTML.js"],
                },
            },
            allinone: {
                options: {
                    banner:
                        "/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - " +
                        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        "* <%= pkg.homepage %>\n" +
                        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                        " Licensed <%= pkg.license %> */\n" +
                        "/* Integrated dependencies:\n" +
                        " * url (MIT License),\n" +
                        " * xmlserializer (MIT License),\n" +
                        " * sane-domparser-error (BSD License),\n" +
                        " * css-font-face-src (BSD License),\n" +
                        " * inlineresources (MIT License) */\n",
                },
                files: {
                    "dist/rasterizeHTML.allinone.js": [
                        "build/rasterizeHTML.allinone.js",
                    ],
                },
            },
        },
        watch: {
            files: ["src/*.js", "test/specs/*.js"],
            tasks: ["jshint", "jasmine"],
        },
        jshint: {
            all: ["src/**/*.js", "test/**/*.js", "*.js"],
            options: {
                jshintrc: true,
            },
        },
    });

    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-connect");
    grunt.loadNpmTasks("grunt-contrib-jasmine");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-browserify");
    grunt.loadNpmTasks("grunt-umd");

    grunt.registerTask("deps", [
        "browserify:url",
        "browserify:sanedomparsererror",
        "browserify:inlineresources",
    ]);

    grunt.registerTask("test", ["jshint", "connect", "jasmine"]);

    grunt.registerTask("build", [
        "concat:one",
        "umd",
        "concat:dist",
        "concat:types",
        "browserify:allinone",
        "uglify",
    ]);

    grunt.registerTask("default", ["clean", "deps", "test", "build"]);
};
