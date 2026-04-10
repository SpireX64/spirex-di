import { it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../src/rules/no-circular-dependency.js";

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

it("no-circular-dependency", () => {
    tester.run("no-circular-dependency", rule, {
        valid: [
            {
                code: `
                    diBuilder()
                        .bindFactory("a", factoryOf(A, ["b"]))
                        .bindFactory("b", factoryOf(B, ["c"]))
                        .bindFactory("c", factoryOf(C))
                        .build();
                `,
            },
        ],
        invalid: [
            {
                code: `
                    diBuilder()
                        .bindFactory("a", factoryOf(A, ["b"]))
                        .bindFactory("b", factoryOf(B, ["a"]))
                        .build();
                `,
                errors: [{ messageId: "circular" }],
            },
        ],
    });
});
