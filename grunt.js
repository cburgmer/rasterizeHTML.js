/*global module:false*/
module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg:'<json:package.json>',
        meta:{
            banner:'/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */',
            bannerAllInOne:'/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                '\n/* Integrated dependencies:\n' +
                ' * URI.js (MIT License/GPL v3),\n' +
                ' * cssParser.js (MPL 1.1/GPL 2.0/LGPL 2.1),\n' +
                ' * htmlparser.js */'
        },
        lint:{
            src:'src/*.js',
            grunt:'grunt.js',
            test:'test/*Spec.js'
        },
        jasmine:{
            src:['lib/*.js', 'src/*.js'],
            specs:'test/*Spec.js',
            helpers:['test/helpers.js', 'test/lib/*.js', 'test/gruntpath.js'],
            timeout:10000
        },
        concat:{
            dist:{
                src:['<banner:meta.banner>', 'src/inline.js','<file_strip_banner:src/<%= pkg.name %>>'],
                dest:'dist/<%= pkg.name %>'
            }
        },
        min:{
            dist:{
                src:['<banner:meta.banner>', '<config:concat.dist.dest>'],
                dest:'dist/rasterizeHTML.min.js'
            },
            allinone:{
                src:['<banner:meta.bannerAllInOne>', 'lib/*.js', '<config:concat.dist.dest>'],
                dest:'dist/rasterizeHTML.allinone.js'
            }
        },
        watch:{
            files:'<config:lint.files>',
            tasks:'lint jasmine'
        },
        jshint:{
            options:{
                curly:true,
                eqeqeq:true,
                immed:true,
                latedef:true,
                newcap:true,
                noarg:true,
                undef:true,
                unused:true,
                eqnull:true,
                trailing:true,
                browser:true
            },
            src:{
                globals:{
                    btoa:true,
                    CSSParser:true,
                    URI:true
                }
            },
            test:{
                globals:{
                    "$":true,
                    jasmine:true,
                    describe:true,
                    it:true,
                    beforeEach:true,
                    afterEach:true,
                    waitsFor:true,
                    runs:true,
                    expect:true,
                    spyOn:true,
                    readFixtures:true,
                    setFixtures:true,
                    ifNotInWebkitIt:true,
                    btoa:true,
                    CSSParser:true,
                    URI:true,
                    imagediff:true,
                    rasterizeHTML:true,
                    rasterizeHTMLInline:true,
                    rasterizeHTMLTestHelper:true
                }
            }
        },
        uglify:{}
    });

    grunt.loadNpmTasks('grunt-jasmine-runner');

    // Default task.
    grunt.registerTask('default', 'lint jasmine concat min');

};
