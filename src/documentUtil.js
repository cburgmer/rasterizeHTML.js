var documentUtil = (function () {
    "use strict";

    var module = {};

    var asArray = function (arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    };

    module.addClassNameRecursively = function (element, className) {
        element.className += ' ' + className;

        if (element.parentNode !== element.ownerDocument) {
            module.addClassNameRecursively(element.parentNode, className);
        }
    };

    var changeCssRule = function (rule, newRuleText) {
        var styleSheet = rule.parentStyleSheet,
            ruleIdx = asArray(styleSheet.cssRules).indexOf(rule);

        // Exchange rule with the new text
        styleSheet.insertRule(newRuleText, ruleIdx+1);
        styleSheet.deleteRule(ruleIdx);
    };

    var updateRuleSelector = function (rule, updatedSelector) {
        var styleDefinitions = rule.cssText.replace(/^[^\{]+/, ''),
            newRule = updatedSelector + ' ' + styleDefinitions;

        changeCssRule(rule, newRule);
    };

    var cssRulesToText = function (cssRules) {
        return asArray(cssRules).reduce(function (cssText, rule) {
            return cssText + rule.cssText;
        }, '');
    };

    var rewriteStyleContent = function (styleElement) {
        styleElement.textContent = cssRulesToText(styleElement.sheet.cssRules);
    };

    module.rewriteStyleRuleSelector = function (doc, oldSelector, newSelector) {
        // Assume that oldSelector is always prepended with a ':' or '.' for now, so no special handling needed
        var oldSelectorRegex = oldSelector + '(?=\\W|$)';

        asArray(doc.querySelectorAll('style')).forEach(function (styleElement) {
            var matchingRules = asArray(styleElement.sheet.cssRules).filter(function (rule) {
                    return rule.selectorText && new RegExp(oldSelectorRegex).test(rule.selectorText);
                });

            if (matchingRules.length) {
                matchingRules.forEach(function (rule) {
                    var selector = rule.selectorText.replace(new RegExp(oldSelectorRegex, 'g'), newSelector);

                    updateRuleSelector(rule, selector);
                });

                rewriteStyleContent(styleElement);
            }
        });
    };

    module.lowercaseTagNameSelectors = function (doc, matchingTagNames) {
        var oldSelectorRegex = '(?:^|\\W)' + '(' + matchingTagNames.join('|') + ')' + '(?=\\W|$)';

        asArray(doc.querySelectorAll('style')).forEach(function (styleElement) {
            var matchingRules = asArray(styleElement.sheet.cssRules).filter(function (rule) {
                return rule.selectorText && new RegExp(oldSelectorRegex, 'i').test(rule.selectorText);
            });

            if (matchingRules.length) {
                matchingRules.forEach(function (rule) {
                    var selector = rule.selectorText.replace(new RegExp(oldSelectorRegex, 'gi'), function (match) {
                        return match.toLowerCase();
                    });

                    updateRuleSelector(rule, selector);
                });

                rewriteStyleContent(styleElement);
            }
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
}());
