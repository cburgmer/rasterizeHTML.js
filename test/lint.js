phantom.injectJs('linter.js');

jslinter.setFiles(['../rasterizeHTML.js', 'IntegrationSpec.js', 'MainInterfaceSpec.js', 'RenderSpec.js', 'InlineSpec.js', 'UtilSpec.js']);
jslinter.run();

phantom.exit();
