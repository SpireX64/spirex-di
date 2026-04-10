import { it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../src/rules/no-unused-binding.js";

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

it("no-unused-binding", () => {
    tester.run("no-unused-binding", rule, {
        valid: [
            {
                code: `
                    diBuilder()
                        .bindFactory("logger", f)
                        .build();
                    scope.get("logger");
                `,
            },
            {
                code: `
                    diBuilder()
                        .bindFactory("internal", f, { internal: true })
                        .build();
                `,
            },
        ],
        invalid: [
            {
                code: `
                    diBuilder()
                        .bindFactory("unused", f)
                        .build();
                `,
                errors: [{ messageId: "unused" }],
            },
        ],
    });
});
