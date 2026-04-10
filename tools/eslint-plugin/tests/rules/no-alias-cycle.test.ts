import { it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../src/rules/no-alias-cycle.js";

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

it("no-alias-cycle", () => {
    tester.run("no-alias-cycle", rule, {
        valid: [
            {
                code: `
                    diBuilder()
                        .bindFactory("a", f)
                        .bindAlias("b", "a")
                        .build();
                `,
            },
        ],
        invalid: [
            {
                code: `
                    diBuilder()
                        .bindAlias("a", "b")
                        .bindAlias("b", "a")
                        .build();
                `,
                errors: [{ messageId: "aliasCycle" }],
            },
        ],
    });
});
