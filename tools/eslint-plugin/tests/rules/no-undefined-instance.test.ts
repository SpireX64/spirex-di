import { it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../src/rules/no-undefined-instance.js";

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

it("no-undefined-instance", () => {
    tester.run("no-undefined-instance", rule, {
        valid: [
            {
                code: `
                    const b = diBuilder();
                    b.bindInstance("config", { key: "value" });
                `,
            },
            {
                code: `
                    diBuilder().bindInstance("value", 42).build();
                `,
            },
        ],
        invalid: [
            {
                code: `
                    diBuilder().bindInstance("config", undefined).build();
                `,
                errors: [{ messageId: "undefinedInstance" }],
            },
            {
                code: `
                    diBuilder().bindInstance("config", void 0).build();
                `,
                errors: [{ messageId: "undefinedInstance" }],
            },
        ],
    });
});
