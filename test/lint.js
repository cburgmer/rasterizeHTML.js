phantom.injectJs('linter.js');

jslinter.setFiles(['../html2canvas.js', 'RenderSpec.js']);
jslinter.run();

phantom.exit();
