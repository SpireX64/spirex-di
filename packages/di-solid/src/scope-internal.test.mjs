import { describe, expect, test, vi } from "vitest";
import { ensureChildScopeRef, scopeOptionsFromProps } from "./scope-internal.js";

describe("scopeOptionsFromProps", () => {
    test("WHEN: props include id and scope options THEN: copies all but id", () => {
        // Arrange -------
        var props = { id: "s1", sealed: true, isolated: false, data: { x: 1 } };

        // Act -----------
        var opt = scopeOptionsFromProps(props);

        // Assert --------
        expect(opt).toEqual({
            sealed: true,
            isolated: false,
            data: { x: 1 },
        });
        expect(opt.id).toBeUndefined();
    });

    test("WHEN: props only have id THEN: empty options", () => {
        // Arrange & Act -
        var opt = scopeOptionsFromProps({ id: "only" });

        // Assert --------
        expect(opt).toEqual({});
    });
});

describe("ensureChildScopeRef", () => {
    test("WHEN: ref is empty THEN: creates scope via parent", () => {
        // Arrange -------
        var created = { id: "child", isDisposed: false };
        var parent = {
            scope: vi.fn(() => created),
        };
        var ref = { current: null };

        // Act -----------
        var out = ensureChildScopeRef(parent, "child", { sealed: true }, ref);

        // Assert --------
        expect(out).toBe(created);
        expect(ref.current).toBe(created);
        expect(parent.scope).toHaveBeenCalledTimes(1);
        expect(parent.scope).toHaveBeenCalledWith("child", { sealed: true });
    });

    test("WHEN: ref holds a live scope THEN: does not call parent.scope again", () => {
        // Arrange -------
        var live = { id: "c1", isDisposed: false };
        var parent = { scope: vi.fn() };
        var ref = { current: live };

        // Act -----------
        var out = ensureChildScopeRef(parent, "c1", {}, ref);

        // Assert --------
        expect(out).toBe(live);
        expect(parent.scope).not.toHaveBeenCalled();
    });

    test("WHEN: ref holds a disposed scope THEN: recreates via parent.scope", () => {
        // Arrange -------
        var next = { id: "c2", isDisposed: false };
        var parent = {
            scope: vi.fn(() => next),
        };
        var ref = { current: { id: "old", isDisposed: true } };

        // Act -----------
        var out = ensureChildScopeRef(parent, "c2", { isolated: true }, ref);

        // Assert --------
        expect(out).toBe(next);
        expect(ref.current).toBe(next);
        expect(parent.scope).toHaveBeenCalledTimes(1);
        expect(parent.scope).toHaveBeenCalledWith("c2", { isolated: true });
    });
});
