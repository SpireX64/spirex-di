import { it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../src/rules/no-duplicate-binding.js";

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

it("no-duplicate-binding", () => {
    tester.run("no-duplicate-binding", rule, {
        valid: [
            {
                code: `
                    diBuilder().bindFactory("a", f1).bindFactory("b", f2).build();
                `,
            },
            {
                code: `
                    diBuilder()
                        .bindFactory("a", f1)
                        .bindFactory("a", f2, { ifConflict: "replace" })
                        .build();
                `,
            },
            {
                code: `
                    diBuilder()
                        .bindFactory("a", f1, { ifConflict: "append", lifecycle: "singleton" })
                        .bindFactory("a", f2, { ifConflict: "append", lifecycle: "singleton" })
                        .build();
                `,
            },
        ],
        invalid: [
            {
                code: `
                    diBuilder()
                        .bindFactory("logger", f1)
                        .bindFactory("logger", f2)
                        .build();
                `,
                errors: [{ messageId: "duplicate" }],
            },
        ],
    });
});
