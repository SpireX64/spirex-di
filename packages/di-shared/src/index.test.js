import { describe, test, expect, vi } from "vitest";
import { diBuilder } from "@spirex/di";
import { diShared } from "./index.js";

function buildContainer() {
    return diBuilder()
        .bindInstance("a", 1)
        .bindFactory("b", () => 2)
        .build();
}

describe("diShared", () => {
    test("reports isAttached false before attach and true after attach", () => {
        // Arrange
        const Shared = diShared();

        // Assert
        expect(Shared.isAttached).toBe(false);

        // Act
        Shared.attach(buildContainer());

        // Assert
        expect(Shared.isAttached).toBe(true);
    });

    test("throws Error when get, maybe, getAll, phantomOf, or types is used before attach", () => {
        // Arrange
        const Shared = diShared();

        // Act, Assert
        expect(() => Shared.get("a")).toThrow(Error);
        expect(() => Shared.maybe("a")).toThrow(Error);
        expect(() => Shared.getAll("a")).toThrow(Error);
        expect(() => Shared.phantomOf("a")).toThrow(Error);
        expect(() => Shared.types).toThrow(Error);
    });

    test("providerOf returns a function before attach; calling it throws Error", () => {
        // Arrange
        const Shared = diShared();
        const provider = Shared.providerOf("a");

        // Assert
        expect(typeof provider).toBe("function");

        // Act, Assert
        expect(() => provider()).toThrow(Error);
    });

    test("delegates resolution to the attached scope (get, maybe, getAll, types)", () => {
        // Arrange
        const Shared = diShared();
        Shared.attach(buildContainer());

        // Act, Assert
        expect(Shared.get("a")).toBe(1);
        expect(Shared.get("b")).toBe(2);
        expect(Shared.maybe("a")).toBe(1);
        expect(Shared.maybe("notRegistered")).toBeUndefined();
        expect(Shared.getAll("a")).toEqual([1]);
        expect(typeof Shared.types).toBe("object");
    });

    test("replaces the attached scope when attach is called again", () => {
        // Arrange
        const Shared = diShared();
        const firstScope = buildContainer();
        const secondScope = diBuilder().bindInstance("a", 99).build();
        Shared.attach(firstScope);

        // Assert
        expect(Shared.get("a")).toBe(1);

        // Act
        Shared.attach(secondScope);

        // Assert
        expect(Shared.get("a")).toBe(99);
    });

    test("does not call console.warn when warn is false (default)", () => {
        // Arrange
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const Shared = diShared();
        Shared.attach(buildContainer());

        // Act
        Shared.get("a");

        // Assert
        expect(warn).not.toHaveBeenCalled();

        warn.mockRestore();
    });

    test("calls console.warn once when warn is true and get resolves", () => {
        // Arrange
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const Shared = diShared({ warn: true });
        Shared.attach(buildContainer());

        // Act
        Shared.get("a");

        // Assert
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain("[spirex/di-shared]");
        expect(warn.mock.calls[0][0]).toContain("get");

        warn.mockRestore();
    });

    test("calls warnLog with resolution context when warn and warnLog are set", () => {
        // Arrange
        const log = vi.fn();
        const Shared = diShared({
            warn: true,
            warnLog: log,
        });
        Shared.attach(buildContainer());

        // Act
        Shared.get("a");

        // Assert
        expect(log).toHaveBeenCalledTimes(1);
        expect(log.mock.calls[0][0].method).toBe("get");
        expect(log.mock.calls[0][0].type).toBe("a");
        expect(log.mock.calls[0][0].message).toContain("[spirex/di-shared]");
    });

    test("does not throw when warn is true but console.warn is not a function", () => {
        // Arrange
        const Shared = diShared({ warn: true });
        Shared.attach(buildContainer());
        const previousWarn = console.warn;
        console.warn = 1;

        // Act, Assert
        expect(() => Shared.get("a")).not.toThrow();

        console.warn = previousWarn;
    });

    test("skips console.warn for type keys in warnIgnore", () => {
        // Arrange
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const Shared = diShared({ warn: true, warnIgnore: ["a"] });
        Shared.attach(buildContainer());

        // Act
        Shared.get("a");
        Shared.get("b");

        // Assert
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain("b");

        warn.mockRestore();
    });

    test("does not warn on maybe when the binding is missing", () => {
        // Arrange
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const Shared = diShared({ warn: true });
        Shared.attach(buildContainer());

        // Act
        const value = Shared.maybe("notRegistered");

        // Assert
        expect(value).toBeUndefined();
        expect(warn).not.toHaveBeenCalled();

        warn.mockRestore();
    });

    test("emits one warnLog entry per getAll call when warn is true", () => {
        // Arrange
        const log = vi.fn();
        const Shared = diShared({ warn: true, warnLog: log });
        Shared.attach(
            diBuilder()
                .bindInstance("x", 1)
                .bindInstance("x", 2, { ifConflict: "append" })
                .build(),
        );

        // Act
        const all = Shared.getAll("x");

        // Assert
        expect(all.length).toBe(2);
        expect(log).toHaveBeenCalledTimes(1);
        expect(log.mock.calls[0][0].method).toBe("getAll");
    });

    test("emits warnLog with method providerOf when the returned provider runs", () => {
        // Arrange
        const log = vi.fn();
        const Shared = diShared({ warn: true, warnLog: log });
        Shared.attach(buildContainer());
        const provider = Shared.providerOf("a");

        // Act
        provider();

        // Assert
        expect(log).toHaveBeenCalledTimes(1);
        expect(log.mock.calls[0][0].method).toBe("providerOf");
    });

    test("emits warnLog with method phantomOf when phantomOf is called", () => {
        // Arrange
        class Box {}
        const log = vi.fn();
        const Shared = diShared({ warn: true, warnLog: log });
        Shared.attach(
            diBuilder()
                .bindFactory("box", () => new Box())
                .build(),
        );

        // Act
        Shared.phantomOf("box");

        // Assert
        expect(log).toHaveBeenCalledTimes(1);
        expect(log.mock.calls[0][0].method).toBe("phantomOf");
    });

    test("does not emit warnLog when only Shared.types is read", () => {
        // Arrange
        const log = vi.fn();
        const Shared = diShared({ warn: true, warnLog: log });
        Shared.attach(buildContainer());

        // Act
        void Shared.types;

        // Assert
        expect(log).not.toHaveBeenCalled();
    });

    test("includes the binding name in warnLog context for named get", () => {
        // Arrange
        const log = vi.fn();
        const Shared = diShared({ warn: true, warnLog: log });
        Shared.attach(
            diBuilder()
                .bindInstance("a", 1, { name: "n" })
                .build(),
        );

        // Act
        Shared.get("a", "n");

        // Assert
        expect(log.mock.calls[0][0].name).toBe("n");
    });
});
