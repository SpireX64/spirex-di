import { validateLifecycle } from "./validators";

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
});
