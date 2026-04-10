import type { ESLint } from "eslint";
import noDuplicateBinding from "./rules/no-duplicate-binding.js";
import noUndefinedInstance from "./rules/no-undefined-instance.js";
import noMissingBuild from "./rules/no-missing-build.js";
import noLifecycleMismatch from "./rules/no-lifecycle-mismatch.js";
import noCircularDependency from "./rules/no-circular-dependency.js";
import noAliasCycle from "./rules/no-alias-cycle.js";
import noDanglingAlias from "./rules/no-dangling-alias.js";
import noMissingRequiredType from "./rules/no-missing-required-type.js";
import noUnresolvedToken from "./rules/no-unresolved-token.js";
import noUnusedBinding from "./rules/no-unused-binding.js";

const rules = {
    "no-duplicate-binding": noDuplicateBinding,
    "no-undefined-instance": noUndefinedInstance,
    "no-missing-build": noMissingBuild,
    "no-lifecycle-mismatch": noLifecycleMismatch,
    "no-circular-dependency": noCircularDependency,
    "no-alias-cycle": noAliasCycle,
    "no-dangling-alias": noDanglingAlias,
    "no-missing-required-type": noMissingRequiredType,
    "no-unresolved-token": noUnresolvedToken,
    "no-unused-binding": noUnusedBinding,
};

const recommendedRules = {
    "@spirex/di/no-duplicate-binding": "error",
    "@spirex/di/no-undefined-instance": "error",
    "@spirex/di/no-missing-build": "warn",
    "@spirex/di/no-lifecycle-mismatch": "error",
    "@spirex/di/no-circular-dependency": "error",
    "@spirex/di/no-alias-cycle": "error",
    "@spirex/di/no-dangling-alias": "error",
    "@spirex/di/no-missing-required-type": "warn",
} as const;

const strictRules = {
    ...recommendedRules,
    "@spirex/di/no-unresolved-token": "error",
    "@spirex/di/no-unused-binding": "warn",
} as const;

const plugin = {
    meta: {
        name: "@spirex/eslint-plugin-di",
        version: "0.1.0",
    },
    rules,
    configs: {} as Record<string, ESLint.ConfigData>,
};

plugin.configs.recommended = {
    plugins: { "@spirex/di": plugin } as unknown as Record<string, ESLint.Plugin>,
    rules: { ...recommendedRules },
};

plugin.configs.strict = {
    plugins: { "@spirex/di": plugin } as unknown as Record<string, ESLint.Plugin>,
    rules: { ...strictRules },
};

export default plugin;
