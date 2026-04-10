import { it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../src/rules/no-lifecycle-mismatch.js";

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

it("no-lifecycle-mismatch", () => {
    tester.run("no-lifecycle-mismatch", rule, {
        valid: [
            {
                code: `
                    diBuilder()
                        .bindFactory("handler", f1, { ifConflict: "append", lifecycle: "singleton" })
                        .bindFactory("handler", f2, { ifConflict: "append", lifecycle: "singleton" })
                        .build();
                `,
            },
            {
                code: `
                    diBuilder()
                        .bindFactory("a", f1)
                        .bindFactory("b", f2)
                        .build();
                `,
            },
        ],
        invalid: [
            {
                code: `
                    diBuilder()
                        .bindFactory("handler", f1, { ifConflict: "append", lifecycle: "singleton" })
                        .bindFactory("handler", f2, { ifConflict: "append", lifecycle: "transient" })
                        .build();
                `,
                errors: [{ messageId: "mismatch" }],
            },
        ],
    });
});
