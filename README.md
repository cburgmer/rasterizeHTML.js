html2canvas
===========

Renders HTML into the Browser's canvas.

How it works
------------

For security reasons rendering HTML into a canvas is severly limited.

As described in http://robert.ocallahan.org/2011/11/drawing-dom-content-to-canvas.html and https://developer.mozilla.org/en/HTML/Canvas/Drawing_DOM_objects_into_a_canvas however it is possible by embedding the HTML into an SVG image as a <foreignObject> and then drawing the resulting image via ctx.drawImage().

Limitations
-----------

SVG is not allowed to link to external resources, as such all used resources need to be embedded using data: URIs.

Testing
-------

$ ./run_tests.sh

checks the code against JSHint and runs the unit tests via PhantomJS.

Demo
----

See example.html

Author
------
Christoph Burgmer christoph.burgmer@gmail.com
