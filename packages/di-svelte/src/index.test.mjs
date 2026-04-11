import { render } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import { diBuilder } from "@spirex/di";
import {
    getDISvelte,
    setDIRootScope,
    setDIScope,
    useInject,
} from "./index.js";
import DiKeyed from "./test-support/DiKeyed.svelte";
import DiNamedKey from "./test-support/DiNamedKey.svelte";
import DiNested from "./test-support/DiNested.svelte";
import DiNoProvider from "./test-support/DiNoProvider.svelte";
import DiOrphanSetScope from "./test-support/DiOrphanSetScope.svelte";
import DiSelector from "./test-support/DiSelector.svelte";

describe("@spirex/di-svelte", () => {
    describe("useInject", () => {
        test("resolves instance by type key", () => {
            var typeKey = "k";
            var expected = 42;
            var container = diBuilder()
                .bindInstance(typeKey, expected)
                .build();

            var screen = render(DiKeyed, {
                props: { root: container, typeKey },
            });

            expect(screen.getByTestId("out").textContent).toBe(String(expected));
        });

        test("passes IScopeContext to selector", () => {
            var typeKey = "k";
            var expected = 7;
            var container = diBuilder()
                .bindInstance(typeKey, expected)
                .build();

            var screen = render(DiSelector, {
                props: { root: container, typeKey },
            });

            expect(screen.getByTestId("val").textContent).toBe(String(expected));
            expect(screen.getByTestId("ctx").textContent).toBe(
                String(container.id ?? ""),
            );
        });

        test("nested setDIScope still resolves parent bindings", () => {
            var typeKey = "k";
            var expected = "nested-ok";
            var container = diBuilder()
                .bindInstance(typeKey, expected)
                .build();

            var screen = render(DiNested, {
                props: {
                    root: container,
                    childScopeId: "child",
                    typeKey,
                },
            });

            expect(screen.getByTestId("nested-out").textContent).toBe(
                expected,
            );
        });

        test("useInject(type, name) resolves named binding", () => {
            var typeKey = "k";
            var expected = "named-instance";
            var bindingName = "foo";
            var container = diBuilder()
                .bindInstance(typeKey, expected, { name: bindingName })
                .build();

            var screen = render(DiNamedKey, {
                props: { root: container, typeKey, bindingName },
            });

            expect(screen.getByTestId("named-out").textContent).toBe(expected);
        });
    });

    describe("errors", () => {
        test("useInject without provider throws", () => {
            expect(() => render(DiNoProvider)).toThrow(/No DI scope in context/);
        });

        test("setDIScope without provider throws", () => {
            expect(() => render(DiOrphanSetScope)).toThrow(
                /No DI scope in context/,
            );
        });
    });

    describe("setDIScope lifecycle", () => {
        test("disposes child scope when component unmounts", () => {
            var typeKey = "k";
            var container = diBuilder()
                .bindInstance(typeKey, 1)
                .build();

            var screen = render(DiNested, {
                props: {
                    root: container,
                    childScopeId: "child-unmount",
                    typeKey,
                },
            });

            expect(screen.getByTestId("nested-out").textContent).toBe("1");
            screen.unmount();
            expect(container.hasChildScope("child-unmount")).toBe(false);
        });
    });

    describe("getDISvelte", () => {
        test("returns same function references as direct imports", () => {
            var api = getDISvelte();
            expect(api.useInject).toBe(useInject);
            expect(api.setDIRootScope).toBe(setDIRootScope);
            expect(api.setDIScope).toBe(setDIScope);
        });
    });
});
