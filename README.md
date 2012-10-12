rasterizeHTML.js
================

Renders HTML into the browser's canvas.

See the [API](https://github.com/cburgmer/rasterizeHTML.js/wiki/API).

How it works
------------

For security reasons rendering HTML into a canvas is severly limited. Firefox offers such a function via ctx.drawWindow(), but only with Chrome privileges (see https://developer.mozilla.org/en/Drawing_Graphics_with_Canvas).

As described in http://robert.ocallahan.org/2011/11/drawing-dom-content-to-canvas.html and https://developer.mozilla.org/en/HTML/Canvas/Drawing_DOM_objects_into_a_canvas however it is possible by embedding the HTML into an SVG image as a &lt;foreignObject&gt; and then drawing the resulting image via ctx.drawImage().

To cope with the existing limitations, rasterizeHTML.js will load external images, fonts and stylesheets and store them inline via data: URIs or inline style elements respectively.

Limitations
-----------

This code is experimental.

SVG is not allowed to link to external resources, as such all used resources need to be embedded using data: URIs. While the solution to that is loading and inlining external resources those can only be loaded if from the same origin (unless CORS is used).

The code is tested under Firefox, Chrome & Safari. However IE is not supported so far.

At the time of writing it seems that the individual browsers still have some issues with rendering SVGs with embedded HTML to the canvas. See the [wiki for a list of known issues](https://github.com/cburgmer/rasterizeHTML.js/wiki/Browser-issues) and do add your findings there.

Testing
-------

Run

    $ npm install
    $ ./node_modules/.bin/grunt

for linting, jasmine tests and minification.

Alternatively point your browser to test/SpecRunner.html (under Chrome you will either need to start the browser passing in the option "--allow-file-access-from-files" or load the page through a local webserver).

Possibly due to a bug with the same origin policy under Webkit certain tests that need to read the canvas will fail and are disabled.

[![Build Status](https://secure.travis-ci.org/cburgmer/rasterizeHTML.js.png?branch=master)](http://travis-ci.org/cburgmer/rasterizeHTML.js)

Dependencies
------------
- URI.js, >=1.6.2 (http://medialize.github.com/URI.js/)
- cssParser.js, JSCSSP (http://glazman.org/JSCSSP/)
- htmlparser.js, HTML Parser By John Resig (patched version under https://github.com/cburgmer/rasterizeHTML.js/blob/master/lib/htmlparser.js)

Demo
----

See example.html

Author
------
Christoph Burgmer christoph.burgmer@gmail.com. Licensed under MIT. Reach out [on Twitter](https://twitter.com/cburgmer)