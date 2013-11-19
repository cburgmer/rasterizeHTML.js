rasterizeHTML.js
================

Renders HTML into the browser's canvas.

See the [API](https://github.com/cburgmer/rasterizeHTML.js/wiki/API).

Example
-------

    var canvas = document.getElementById("canvas");
    rasterizeHTML.drawHTML('Some <span style="color: green">HTML</span> with an image <img src="someimg.png" />', canvas);

See [the examples page](https://github.com/cburgmer/rasterizeHTML.js/wiki/Examples) and [the examples shipped with the code](https://github.com/cburgmer/rasterizeHTML.js/tree/master/examples).

How does it work
----------------

For security reasons rendering HTML into a canvas is severly limited. Firefox offers such a function via `ctx.drawWindow()`, but only with Chrome privileges (see https://developer.mozilla.org/en/Drawing_Graphics_with_Canvas).

As described in http://robert.ocallahan.org/2011/11/drawing-dom-content-to-canvas.html and https://developer.mozilla.org/en/HTML/Canvas/Drawing_DOM_objects_into_a_canvas however it is possible by embedding the HTML into an SVG image as a `<foreignObject>` and then drawing the resulting image via `ctx.drawImage()`.

To cope with the existing limitations, rasterizeHTML.js will load external images, fonts and stylesheets and store them inline via data: URIs or inline style elements respectively.

Limitations
-----------

SVG is not allowed to link to external resources, as such all resources need to be embedded using data: URIs. While the solution to that is loading and inlining external resources those can only be loaded if from the same origin (unless CORS is used).

The code is tested under Firefox, Chrome & Safari. However IE is not supported so far.

At the time of writing it seems that the individual browsers still have some issues with rendering SVGs with embedded HTML to the canvas. See the [wiki for a list of known issues](https://github.com/cburgmer/rasterizeHTML.js/wiki/Browser-issues) and do add your findings there.

Development
-----------

For linting, tests and minification install Node.js, SlimerJS, Firefox and run

    $ ./go

For the integration test under Chrome and Safari open `test/manualIntegrationTestForWebkit.html` (under Chrome you will either need to start the browser passing in the option `--allow-file-access-from-files` or load the page through a local webserver).

[![Build Status](https://secure.travis-ci.org/cburgmer/rasterizeHTML.js.png?branch=master)](http://travis-ci.org/cburgmer/rasterizeHTML.js)

Where is it used?
-----------------

* [CSS Critic](https://github.com/cburgmer/csscritic), a lightweight framework for regression testing of Cascading Style Sheets
* ...

Author
------
Christoph Burgmer. Licensed under MIT. Reach out [on Twitter](https://twitter.com/cburgmer).
