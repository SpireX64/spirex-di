import { it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../src/rules/no-dangling-alias.js";

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

it("no-dangling-alias", () => {
    tester.run("no-dangling-alias", rule, {
        valid: [
            {
                code: `
                    diBuilder()
                        .bindFactory("logger", f)
                        .bindAlias("log", "logger")
                        .build();
                `,
            },
        ],
        invalid: [
            {
                code: `
                    diBuilder()
                        .bindAlias("log", "missing")
                        .build();
                `,
                errors: [{ messageId: "dangling" }],
            },
        ],
    });
});
