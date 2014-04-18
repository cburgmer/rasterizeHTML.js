var documentHelper = (function (documentUtil) {
    "use strict";

    var module = {};

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
        var inputs = Array.prototype.slice.call(doc.querySelectorAll('input')),
            textareas = Array.prototype.slice.call(doc.querySelectorAll('textarea')),
            isCheckable = function (input) {
                return input.type === 'checkbox' || input.type === 'radio';
            };

        inputs.filter(isCheckable)
            .forEach(function (input) {
                if (input.checked) {
                    input.setAttribute('checked', '');
                } else {
                    input.removeAttribute('checked');
                }
            });

        inputs.filter(function (input) { return !isCheckable(input); })
            .forEach(function (input) {
                input.setAttribute('value', input.value);
            });

        textareas
            .forEach(function (textarea) {
                textarea.textContent = textarea.value;
            });
    };


    return module;
}(documentUtil));
