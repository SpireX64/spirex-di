import { it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../src/rules/no-missing-required-type.js";

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

it("no-missing-required-type", () => {
    tester.run("no-missing-required-type", rule, {
        valid: [
            {
                code: `
                    diBuilder()
                        .bindFactory("db", dbFactory)
                        .requireType("db")
                        .build();
                `,
            },
        ],
        invalid: [
            {
                code: `
                    diBuilder()
                        .requireType("missing")
                        .build();
                `,
                errors: [{ messageId: "missing" }],
            },
        ],
    });
});
