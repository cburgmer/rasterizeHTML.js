/*global module:false*/
module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jasmine: {
            src: [
                'build/dependencies/*.js',
                'node_modules/ayepromise/ayepromise.js',
                'src/util.js',
                'src/xhrproxies.js',
                'src/documentUtil.js',
                'src/documentHelper.js',
                'src/browser.js',
                'src/render.js',
                'src/rasterizeHTML.js'
            ],
            options: {
                specs: 'test/specs/*.js',
                vendor: [
                    'node_modules/imagediff/imagediff.js',
                    'node_modules/jquery/dist/jquery.js',
                ],
                helpers: [
                    'test/helpers.js',
                    'test/diffHelper.js',
                    'test/testHelper.js',
                    'test/gruntpath.js'
                ]
            }
        },
        browserify: {
            xmlserializer: {
                src: 'node_modules/xmlserializer/lib/serializer.js',
                dest: 'build/dependencies/xmlserializer.js',
                options: {
                    bundleOptions: {
                        standalone: 'xmlserializer'
                    }
                }
            },
            url: {
                src: 'node_modules/url/url.js',
                dest: 'build/dependencies/url.js',
                options: {
                    bundleOptions: {
                        standalone: 'url'
                    }
                }
            },
            inlineresources: {
                src: 'node_modules/inlineresources/src/inline.js',
                dest: 'build/dependencies/inlineresources.js',
                options: {
                    bundleOptions: {
                        'standalone': 'inlineresources'
                    }
                }
            },
            allinone: {
                src: 'dist/rasterizeHTML.js',
                dest: 'build/rasterizeHTML.allinone.js',
                options: {
                    bundleOptions: {
                        standalone: 'rasterizeHTML',
                    },
                    // Don't use the dependency browserify is providing. Use the one we fixed in package.json
                    alias: ['node_modules/url/url.js:url']
                }
            }
        },
        clean: {
            all: ['build']
        },
        umd: {
            all: {
                src: 'build/rasterizeHTML.concat.js',
                dest: 'build/rasterizeHTML.umd.js',
                objectToExport: 'rasterizeHTML',
                indent: '    ',
                deps: {
                    'default': ['url', 'xmlserializer', 'ayepromise', 'inlineresources']
                }
            }
        },
        concat: {
            one: {
                src: [
                    'src/util.js',
                    'src/xhrproxies.js',
                    'src/documentUtil.js',
                    'src/documentHelper.js',
                    'src/browser.js',
                    'src/render.js',
                    'src/rasterizeHTML.js'
                ],
                dest: 'build/rasterizeHTML.concat.js'
            },
            dist: {
                options: {
                    banner:'/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        '* <%= pkg.homepage %>\n' +
                        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                        ' Licensed <%= pkg.license %> */\n'
                },
                src: ['build/rasterizeHTML.umd.js'],
                dest: 'dist/<%= pkg.title %>'
            }
        },
        uglify: {
            dist: {
                options: {
                    banner:'/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        '* <%= pkg.homepage %>\n' +
                        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                        ' Licensed <%= pkg.license %> */\n'
                },
                files: {
                    'dist/rasterizeHTML.min.js': ['dist/rasterizeHTML.js']
                }
            },
            allinone: {
                options: {
                    banner:'/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        '* <%= pkg.homepage %>\n' +
                        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                        ' Licensed <%= pkg.license %> */\n' +
                        '/* Integrated dependencies:\n' +
                        ' * url (MIT License),\n' +
                        ' * CSSOM.js (MIT License),\n' +
                        ' * ayepromise (BSD License & WTFPL),\n' +
                        ' * xmlserializer (MIT License),\n' +
                        ' * inlineresources (MIT License) */\n'
                },
                files: {
                    'dist/rasterizeHTML.allinone.js': ['build/rasterizeHTML.allinone.js']
                }
            }
        },
        watch: {
            files: [
                'src/*.js',
                'test/specs/*.js'
            ],
            tasks: ['jshint', 'jasmine']
        },
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                undef: true,
                unused: true,
                eqnull: true,
                trailing: true,
                browser: true,
                globals: {
                    util: true,
                    xhrproxies: true,
                    documentUtil: true,
                    documentHelper: true,
                    browser: true,
                    render: true,

                    url: true,
                    xmlserializer: true,
                    ayepromise: true,
                    inlineresources: true
                },
                exported: ['rasterizeHTML', 'render', 'util', 'xhrproxies', 'browser', 'documentUtil', 'documentHelper']
            },
            uses_defaults: [
                'src/*.js',
                'Gruntfile.js',
            ],
            with_overrides: {
                options: {
                    globals: {
                        "$": true,
                        jasmine: true,
                        describe: true,
                        it: true,
                        xit: true,
                        beforeEach: true,
                        afterEach: true,
                        expect: true,
                        spyOn: true,

                        ifNotInWebkitIt: true,
                        ifNotInPhantomJsIt: true,
                        ifNotInPhantomJSAndNotLocalRunnerIt: true,
                        testHelper: true,
                        diffHelper: true,

                        util: true,
                        xhrproxies: true,
                        documentUtil: true,
                        documentHelper: true,
                        browser: true,
                        render: true,
                        rasterizeHTML: true,

                        url: true,
                        ayepromise: true,
                        inlineresources: true,

                        imagediff: true
                    }
                },
                files: {
                    src: ['test/specs/*.js']
                }
            }
        },
        "regex-check": {
            files: [
                'src/*',
                // 'test/{,*/}*'
                'test/*.html',
                'test/*.js',
                'test/specs/*.js',
                'test/*/*.html',
            ],
            options: {
                pattern : /FIXME/g
            },
        },
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-regex-check');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-umd');

    grunt.registerTask('deps', [
        'browserify:url',
        'browserify:xmlserializer',
        'browserify:inlineresources'
    ]);

    grunt.registerTask('test', [
        'jshint',
        'jasmine',
        'regex-check',
    ]);

    grunt.registerTask('build', [
        'concat:one',
        'umd',
        'concat:dist',
        'browserify:allinone',
        'uglify'
    ]);

    grunt.registerTask('default', [
        'clean',
        'deps',
        'test',
        'build'
    ]);

};
