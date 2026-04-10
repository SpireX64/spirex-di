import { it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../src/rules/no-missing-build.js";

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

it("no-missing-build", () => {
    tester.run("no-missing-build", rule, {
        valid: [
            {
                code: `
                    diBuilder().bindFactory("a", f).build();
                `,
            },
            {
                code: `
                    const b = diBuilder();
                    b.bindFactory("a", f);
                    b.build();
                `,
            },
        ],
        invalid: [
            {
                code: `
                    diBuilder().bindFactory("a", f);
                `,
                errors: [{ messageId: "missingBuild" }],
            },
        ],
    });
});
