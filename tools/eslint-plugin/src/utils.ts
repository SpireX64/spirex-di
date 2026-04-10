import type { Rule } from "eslint";

export function createRule(
    meta: Rule.RuleMetaData,
    create: Rule.RuleModule["create"],
): Rule.RuleModule {
    return { meta, create };
}
