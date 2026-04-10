import { it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../src/rules/no-unresolved-token.js";

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

it("no-unresolved-token", () => {
    tester.run("no-unresolved-token", rule, {
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
                    scope.maybe("optional");
                `,
            },
        ],
        invalid: [
            {
                code: `
                    scope.get("missing");
                `,
                errors: [{ messageId: "unresolved" }],
            },
        ],
    });
});
