phantom.injectJs('linter.js');

jslinter.setFiles(['../html2canvas.js', 'EmbedSpec.js']);
jslinter.run();

phantom.exit();
