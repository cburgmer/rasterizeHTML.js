var mediaQueryHelper = (function (cssMediaQuery) {
    "use strict";

    var module = {};

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

    var substituteEmWithPx = function (mediaQuery) {
        cssMediaQuery.parse(mediaQuery);
        return mediaQuery;
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
