var documentHelper = (function (documentUtil) {
    "use strict";

    var module = {};

    var asArray = function (arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    };

    module.fakeUserAction = function (doc, selector, action) {
        var elem = doc.querySelector(selector),
            pseudoClass = ':' + action,
            fakeActionClass = 'rasterizehtml' + action;
        if (! elem) {
            return;
        }

        documentUtil.addClassNameRecursively(elem, fakeActionClass);
        documentUtil.rewriteCssSelectorWith(doc, pseudoClass, '.' + fakeActionClass);
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

    module.rewriteTagNameSelectorsToLowerCase = function (doc) {
        documentUtil.lowercaseCssTypeSelectors(doc, documentUtil.findHtmlOnlyNodeNames(doc));
    };

    return module;
}(documentUtil));
