import { describe, it, expect } from "vitest";
import type { DIBinding, DIResolution, DIBindingRef } from "../src/types.js";
import { makeBindingRef } from "../src/types.js";
import {
    findDependencyCycles,
    findAliasCycles,
    findConflicts,
    findLifecycleMismatches,
    findDanglingAliases,
    findUnresolved,
    findUnused,
    findMissingRequired,
} from "../src/graph.js";

function mockBinding(
    type: string,
    overrides: Partial<DIBinding> = {},
): DIBinding {
    return {
        ref: makeBindingRef(type),
        kind: "factory",
        lifecycle: "singleton",
        ifConflict: "throw",
        dependencies: [],
        loc: { line: 1, column: 0 },
        node: {} as any,
        ...overrides,
    };
}

function mockResolution(
    type: string,
    overrides: Partial<DIResolution> = {},
): DIResolution {
    return {
        ref: makeBindingRef(type),
        method: "get",
        source: "di",
        loc: { line: 1, column: 0 },
        node: {} as any,
        ...overrides,
    };
}

describe("findDependencyCycles", () => {
    it("detects no cycles when there are none", () => {
        const bindings = [
            mockBinding("a", { dependencies: [makeBindingRef("b")] }),
            mockBinding("b", { dependencies: [makeBindingRef("c")] }),
            mockBinding("c"),
        ];
        expect(findDependencyCycles(bindings)).toEqual([]);
    });

    it("detects a simple cycle", () => {
        const bindings = [
            mockBinding("a", { dependencies: [makeBindingRef("b")] }),
            mockBinding("b", { dependencies: [makeBindingRef("a")] }),
        ];
        const cycles = findDependencyCycles(bindings);
        expect(cycles.length).toBe(1);
        expect(cycles[0].cycle.length).toBe(2);
    });

    it("detects a three-node cycle", () => {
        const bindings = [
            mockBinding("a", { dependencies: [makeBindingRef("b")] }),
            mockBinding("b", { dependencies: [makeBindingRef("c")] }),
            mockBinding("c", { dependencies: [makeBindingRef("a")] }),
        ];
        const cycles = findDependencyCycles(bindings);
        expect(cycles.length).toBe(1);
        expect(cycles[0].cycle.length).toBe(3);
    });
});

describe("findAliasCycles", () => {
    it("detects no cycles when there are none", () => {
        const bindings = [
            mockBinding("a", {
                kind: "alias",
                aliasOrigin: makeBindingRef("b"),
            }),
            mockBinding("b"),
        ];
        expect(findAliasCycles(bindings)).toEqual([]);
    });

    it("detects a simple alias cycle", () => {
        const bindings = [
            mockBinding("a", {
                kind: "alias",
                aliasOrigin: makeBindingRef("b"),
            }),
            mockBinding("b", {
                kind: "alias",
                aliasOrigin: makeBindingRef("a"),
            }),
        ];
        const cycles = findAliasCycles(bindings);
        expect(cycles.length).toBe(1);
    });
});

describe("findConflicts", () => {
    it("detects duplicate bindings without conflict strategy", () => {
        const bindings = [
            mockBinding("logger"),
            mockBinding("logger"),
        ];
        const conflicts = findConflicts(bindings);
        expect(conflicts.length).toBe(1);
        expect(conflicts[0].bindings.length).toBe(2);
    });

    it("ignores bindings with replace strategy", () => {
        const bindings = [
            mockBinding("logger", { ifConflict: "replace" }),
            mockBinding("logger", { ifConflict: "replace" }),
        ];
        expect(findConflicts(bindings)).toEqual([]);
    });

    it("ignores alias bindings", () => {
        const bindings = [
            mockBinding("a", { kind: "alias", aliasOrigin: makeBindingRef("b") }),
            mockBinding("a", { kind: "alias", aliasOrigin: makeBindingRef("c") }),
        ];
        expect(findConflicts(bindings)).toEqual([]);
    });

    it("does not report when only one binding exists", () => {
        const bindings = [mockBinding("logger")];
        expect(findConflicts(bindings)).toEqual([]);
    });
});

describe("findLifecycleMismatches", () => {
    it("detects mismatched lifecycles in append bindings", () => {
        const bindings = [
            mockBinding("handler", {
                ifConflict: "append",
                lifecycle: "singleton",
            }),
            mockBinding("handler", {
                ifConflict: "append",
                lifecycle: "transient",
            }),
        ];
        const mismatches = findLifecycleMismatches(bindings);
        expect(mismatches.length).toBe(1);
        expect(mismatches[0].lifecycles).toContain("singleton");
        expect(mismatches[0].lifecycles).toContain("transient");
    });

    it("allows matching lifecycles in append bindings", () => {
        const bindings = [
            mockBinding("handler", {
                ifConflict: "append",
                lifecycle: "singleton",
            }),
            mockBinding("handler", {
                ifConflict: "append",
                lifecycle: "singleton",
            }),
        ];
        expect(findLifecycleMismatches(bindings)).toEqual([]);
    });
});

describe("findDanglingAliases", () => {
    it("detects alias pointing to non-existent binding", () => {
        const bindings = [
            mockBinding("alias", {
                kind: "alias",
                aliasOrigin: makeBindingRef("missing"),
            }),
        ];
        const dangling = findDanglingAliases(bindings);
        expect(dangling.length).toBe(1);
        expect(dangling[0].missingOrigin.type).toBe("missing");
    });

    it("does not report when origin exists", () => {
        const bindings = [
            mockBinding("alias", {
                kind: "alias",
                aliasOrigin: makeBindingRef("target"),
            }),
            mockBinding("target"),
        ];
        expect(findDanglingAliases(bindings)).toEqual([]);
    });
});

describe("findUnresolved", () => {
    it("detects unresolved tokens", () => {
        const resolutions = [mockResolution("missing")];
        const bindings = [mockBinding("other")];
        const unresolved = findUnresolved(resolutions, bindings);
        expect(unresolved.length).toBe(1);
    });

    it("does not flag maybe() calls", () => {
        const resolutions = [mockResolution("missing", { method: "maybe" })];
        const bindings: DIBinding[] = [];
        expect(findUnresolved(resolutions, bindings)).toEqual([]);
    });

    it("does not flag resolved tokens", () => {
        const resolutions = [mockResolution("logger")];
        const bindings = [mockBinding("logger")];
        expect(findUnresolved(resolutions, bindings)).toEqual([]);
    });
});

describe("findUnused", () => {
    it("detects unused bindings", () => {
        const bindings = [mockBinding("unused")];
        const resolutions: DIResolution[] = [];
        const unused = findUnused(bindings, resolutions);
        expect(unused.length).toBe(1);
    });

    it("does not flag used bindings", () => {
        const bindings = [mockBinding("logger")];
        const resolutions = [mockResolution("logger")];
        expect(findUnused(bindings, resolutions)).toEqual([]);
    });

    it("does not flag internal bindings", () => {
        const bindings = [mockBinding("internal", { internal: true })];
        const resolutions: DIResolution[] = [];
        expect(findUnused(bindings, resolutions)).toEqual([]);
    });

    it("does not flag bindings used as dependencies", () => {
        const bindings = [
            mockBinding("dep"),
            mockBinding("service", { dependencies: [makeBindingRef("dep")] }),
        ];
        const resolutions = [mockResolution("service")];
        expect(findUnused(bindings, resolutions)).toEqual([]);
    });
});

describe("findMissingRequired", () => {
    it("detects missing required types", () => {
        const required = [makeBindingRef("needed")];
        const bindings = [mockBinding("other")];
        const missing = findMissingRequired(required, bindings);
        expect(missing.length).toBe(1);
        expect(missing[0].ref.type).toBe("needed");
    });

    it("does not report when required type is bound", () => {
        const required = [makeBindingRef("logger")];
        const bindings = [mockBinding("logger")];
        expect(findMissingRequired(required, bindings)).toEqual([]);
    });
});
