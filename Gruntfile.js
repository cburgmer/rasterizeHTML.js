/*global module:false*/
module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jasmine: {
            src: [
                'bower_components/uri.js/src/URI.js',
                'build/CSSOM.js',
                'build/xmlserializer.js',
                'src/*.js'
            ],
            options: {
                specs: 'test/*Spec.js',
                helpers: [
                    'test/helpers.js',
                    'bower_components/js-imagediff/imagediff.js',
                    'bower_components/jquery/jquery.js',
                    'bower_components/jasmine-jquery/lib/jasmine-jquery.js',
                    'test/gruntpath.js'
                ]
            }
        },
        browserify: {
            cssom: {
                src: 'node_modules/cssom/lib/index.js',
                dest: 'build/CSSOM.js',
                options: {
                    'standalone': 'CSSOM'
                }
            },
            xmlserializer: {
                src: 'node_modules/xmlserializer/lib/serializer.js',
                dest: 'build/xmlserializer.js',
                options: {
                    'standalone': 'xmlserializer'
                }
            }
        },
        concat: {
            options: {
                banner:'/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                    '* <%= pkg.homepage %>\n' +
                    '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                    ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n'
            },
            dist: {
                src: ['src/*.js'],
                dest: 'dist/<%= pkg.name %>'
            }
        },
        uglify: {
            dist: {
                options: {
                    banner:'/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        '* <%= pkg.homepage %>\n' +
                        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n'
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
                        '\n/* Integrated dependencies:\n' +
                        ' * URI.js (MIT License/GPL v3),\n' +
                        ' * CSSOM (MIT License),\n' +
                        ' * xmlserializer (MIT License),\n' +
                        ' * parse5 (MIT License) */\n'
                },
                files: {
                    'dist/rasterizeHTML.allinone.js': [
                        'bower_components/uri.js/src/URI.js',
                        'build/CSSOM.js',
                        'build/xmlserializer.js',
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
                    CSSOM: true,
                    URI: true
                }
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
                        CSSOM: true,
                        URI: true,
                        imagediff: true,
                        rasterizeHTML: true,
                        rasterizeHTMLInline: true,
                        rasterizeHTMLTestHelper: true
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
    grunt.loadNpmTasks('grunt-browserify');

    grunt.registerTask('default', [
        'jshint',
        'browserify',
        'jasmine',
        'regex-check',
        'concat',
        'uglify'
    ]);

};
