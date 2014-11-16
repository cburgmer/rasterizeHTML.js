var documentHelper = (function (documentUtil) {
    "use strict";

    var module = {};

    var asArray = function (arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    };

    module.fakeHover = function (doc, hoverSelector) {
        var elem = doc.querySelector(hoverSelector),
            fakeHoverClass = 'rasterizehtmlhover';
        if (! elem) {
            return;
        }

        documentUtil.addClassNameRecursively(elem, fakeHoverClass);
        documentUtil.rewriteStyleRuleSelector(doc, ':hover', '.' + fakeHoverClass);
    };

    module.fakeActive = function (doc, activeSelector) {
        var elem = doc.querySelector(activeSelector),
            fakeActiveClass = 'rasterizehtmlactive';
        if (! elem) {
            return;
        }

        documentUtil.addClassNameRecursively(elem, fakeActiveClass);
        documentUtil.rewriteStyleRuleSelector(doc, ':active', '.' + fakeActiveClass);
    };

    module.persistInputValues = function (doc) {
        var inputs = doc.querySelectorAll('input'),
            textareas = doc.querySelectorAll('textarea'),
            isCheckable = function (input) {
                return input.type === 'checkbox' || input.type === 'radio';
            };

        asArray(inputs).filter(isCheckable)
            .forEach(function (input) {
                if (input.checked) {
                    input.setAttribute('checked', '');
                } else {
                    input.removeAttribute('checked');
                }
            });

        asArray(inputs).filter(function (input) { return !isCheckable(input); })
            .forEach(function (input) {
                input.setAttribute('value', input.value);
            });

        asArray(textareas)
            .forEach(function (textarea) {
                textarea.textContent = textarea.value;
            });
    };

    module.findHtmlOnlyNodeNames = function (doc) {
        var treeWalker = doc.createTreeWalker(doc, NodeFilter.SHOW_ELEMENT),
            htmlNodeNames = {},
            nonHtmlNodeNames = {},
            currentTagName;

        while(treeWalker.nextNode()) {
            currentTagName = treeWalker.currentNode.tagName.toLowerCase();
            if (treeWalker.currentNode.namespaceURI === 'http://www.w3.org/1999/xhtml') {
                htmlNodeNames[currentTagName] = true;
            } else {
                nonHtmlNodeNames[currentTagName] = true;
            }
        }

        return Object.keys(htmlNodeNames).filter(function (tagName) {
            return !nonHtmlNodeNames[tagName];
        });
    };

    return module;
}(documentUtil));
