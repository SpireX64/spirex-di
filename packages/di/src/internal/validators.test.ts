import { validateLifecycle, validateName } from "./validators";

describe("validators", () => {
    test.each([
        [undefined, false],
        [null, false],
        ["", false],
        ["teasd", false],
        ["Singleton", false],
        ["singleton", true],
        ["Transient", false],
        ["transient", true],
        ["lazy", true],
    ])("validateLifecycle(%s)=%s", (value, expected) => {
        expect(validateLifecycle(value)).toBe(expected);
    });

    test.each([
        ["validName", true],
        ["  invalidName", false],
        ["invalidName   ", false],
        ["   invalidName   ", false],
        ["    ", false],
        ["", false],
    ])('validateName("%s") == %s', (name, expected) => {
        expect(validateName(name)).toBe(expected);
    });
});
