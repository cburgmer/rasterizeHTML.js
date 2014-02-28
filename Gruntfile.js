/*global module:false*/
module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jasmine: {
            src: [
                'build/dependencies/*.js',
                'node_modules/ayepromise/ayepromise.js',
                'src/inlineUtil.js',
                'src/inlineCss.js',
                'src/inline.js',
                'src/rasterizeHTML.js'
            ],
            options: {
                specs: 'test/*Spec.js',
                vendor: [
                    'bower_components/js-imagediff/imagediff.js',
                    'bower_components/jquery/jquery.js',
                ],
                helpers: [
                    'test/helpers.js',
                    'test/diffHelper.js',
                    'test/gruntpath.js'
                ]
            }
        },
        browserify: {
            cssom: {
                src: 'node_modules/cssom/lib/index.js',
                dest: 'build/dependencies/cssom.js',
                options: {
                    'standalone': 'cssom'
                }
            },
            xmlserializer: {
                src: 'node_modules/xmlserializer/lib/serializer.js',
                dest: 'build/dependencies/xmlserializer.js',
                options: {
                    'standalone': 'xmlserializer'
                }
            },
            url: {
                src: 'node_modules/url/url.js',
                dest: 'build/dependencies/url.js',
                options: {
                    'standalone': 'url'
                }
            }
        },
        clean: {
            dist: ['build/*.js', 'build/dependencies/'],
            all: ['build']
        },
        umd: {
            all: {
                src: 'build/rasterizeHTML.concat.js',
                dest: 'build/rasterizeHTML.umd.js',
                objectToExport: 'rasterizeHTML',
                deps: {
                    'default': ['url', 'xmlserializer', 'cssom', 'ayepromise']
                }
            }
        },
        concat: {
            one: {
                src: ['src/inlineUtil.js', 'src/inlineCss.js', 'src/inline.js', 'src/rasterizeHTML.js'],
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
                        ' * xmlserializer (MIT License) */\n'
                },
                files: {
                    'dist/rasterizeHTML.allinone.js': [
                        'build/dependencies/*.js',
                        'node_modules/ayepromise/ayepromise.js',
                        'dist/rasterizeHTML.js'
                    ]
                }
            }
        },
        watch: {
            files: [
                'src/*.js',
                'test/*Spec.js'
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
                    inlineUtil: true,
                    inlineCss: true,
                    inline: true,
                    cssom: true,
                    url: true,
                    xmlserializer: true,
                    ayepromise: true
                },
                exported: ['inline', 'inlineCss', 'inlineUtil']
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
                        waitsFor: true,
                        runs: true,
                        expect: true,
                        spyOn: true,
                        readFixtures: true,
                        setFixtures: true,
                        ifNotInWebkitIt: true,
                        ifNotInPhantomJsIt: true,
                        ifNotInPhantomJSAndNotLocalRunnerIt: true,
                        inlineUtil: true,
                        inlineCss: true,
                        inline: true,
                        cssom: true,
                        url: true,
                        ayepromise: true,
                        imagediff: true,
                        rasterizeHTML: true,
                        rasterizeHTMLInline: true,
                        rasterizeHTMLTestHelper: true,
                        diffHelper: true
                    }
                },
                files: {
                    src: ['test/*Spec.js']
                }
            }
        },
        "regex-check": {
            files: [
                'src/*',
                // 'test/{,*/}*'
                'test/*.html',
                'test/*.js',
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

    grunt.registerTask('default', [
        'clean:dist',
        'browserify',
        'jshint',
        'jasmine',
        'regex-check',
        'concat:one',
        'umd',
        'concat:dist',
        'uglify'
    ]);

};
