phantom.injectJs('linter.js');

jslinter.setFiles(['../rasterizeHTML.js', 'IntegrationSpec.js', 'MainInterfaceSpec.js', 'RenderSpec.js', 'InlineImagesSpec.js', 'InlineCssSpec.js', 'InlineCSSResourcesSpec.js', 'UtilSpec.js']);
jslinter.run();

phantom.exit();
