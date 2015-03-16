var mediaQueryHelper = (function (cssMediaQuery) {
    "use strict";

    var module = {};

    var createHiddenElement = function (doc, tagName, size) {
        var element = doc.createElement(tagName);
        // 'display: none' doesn't cut it, as browsers seem to be lazy loading CSS
        element.style.visibility = "hidden";
        element.style.width = size + "px";
        element.style.height = size + "px";
        // We need to add the element to the document so that its content gets loaded
        doc.querySelector("body").appendChild(element);
        return element;
    };

    var hasEmMediaQueryIssue = function () {
        var iframe = createHiddenElement(document, 'iframe', 100);

        iframe.contentDocument.open();
        iframe.contentDocument.write('<!doctype html><html>');
        iframe.contentDocument.write('<script>window.matches = window.matchMedia("(max-width: 1em)").matches</script>');
        iframe.contentDocument.write('</html>');
        iframe.contentDocument.close();

        var mediaQueryMatches = iframe.contentWindow.matches;

        document.querySelector('body').removeChild(iframe);

        return mediaQueryMatches;
    };

    var hasEmIssue;

    module.needsEmWorkaround = function () {
        if (hasEmIssue === undefined) {
            hasEmIssue = hasEmMediaQueryIssue();
        }
        return hasEmIssue;
    };

    var asArray = function (arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    };

    var cssRulesToText = function (cssRules) {
        return asArray(cssRules).map(function (rule) {
            return rule.cssText;
        }).join('\n');
    };

    var mediaQueryRule = function (mediaQueries, cssRules) {
        return '@media ' + mediaQueries.join(', ') + '{' +
            cssRulesToText(cssRules) +
            '}';
    };

    var changeCssRule = function (rule, newRuleText) {
        var styleSheet = rule.parentStyleSheet,
            ruleIdx = asArray(styleSheet.cssRules).indexOf(rule);

        // Exchange rule with the new text
        styleSheet.insertRule(newRuleText, ruleIdx+1);
        styleSheet.deleteRule(ruleIdx);
    };

    var rewriteStyleContent = function (styleElement) {
        styleElement.textContent = cssRulesToText(styleElement.sheet.cssRules);
    };

    var serializeQueryPart = function (q) {
        var query = q.type + ' and ' + q.expressions.map(function (exp) {
            var feature = exp.modifier ? exp.modifier + '-' + exp.feature : exp.feature;
            return '(' + feature + ': ' + exp.value + ')';
        });
        return q.inverse ? "not " + query : query;
    };

    var transformEmIntoPx = function (em) {
        return em * 16;
    };

    var serializeQuery = function (q) {
        return q.map(serializeQueryPart);
    };

    var replaceEmValueWithPx = function (value) {
        var match = /^(\d+)em/.exec(value);
        if (match) {
            return transformEmIntoPx(match[1]) + 'px';
        }
        return value;
    };

    var substituteEmWithPx = function (mediaQuery) {
        var parsedQuery = cssMediaQuery.parse(mediaQuery);

        parsedQuery.forEach(function (q) {
            q.expressions.forEach(function (exp) {
                exp.value = replaceEmValueWithPx(exp.value);
            });
        });

        return serializeQuery(parsedQuery);
    };

    var replaceEmsWithPx = function (mediaQueryRules) {
        mediaQueryRules.forEach(function (rule) {
            var reworkedMediaQueries = asArray(rule.media).map(function (mediaQuery) {
                return substituteEmWithPx(mediaQuery);
            });

            changeCssRule(rule, mediaQueryRule(reworkedMediaQueries, rule.cssRules));
        });
    };

    module.workAroundWebKitEmSizeIssue = function (document) {
        var styles = document.querySelectorAll('style');

        asArray(styles).forEach(function (style) {
            var mediaQueryRules = asArray(style.sheet.cssRules).filter(function (rule) {
                return rule.type === window.CSSRule.MEDIA_RULE;
            });

            replaceEmsWithPx(mediaQueryRules);
            rewriteStyleContent(style);
        });
    };

    return module;
}(cssMediaQuery));
