phantom.injectJs('linter.js');

jslinter.setFiles(['../rasterizeHTML.js', 'RenderSpec.js', 'InlineSpec.js']);
jslinter.run();

phantom.exit();
