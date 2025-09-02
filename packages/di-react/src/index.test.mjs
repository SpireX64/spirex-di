import { render, renderHook } from "@testing-library/react";
import { vi, describe, test, expect } from "vitest";
import { createElement } from "react";
import { diBuilder } from "@spirex/di";
import { createDIContext } from "./index";

describe("React Integration", () => {
    describe("useInject", () => {
        test("WHEN: Inject single value via selector", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var selector = vi.fn((r) => r.get(typeKey));

            var { DIRootScope, useInject } = createDIContext();
            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            // Act -----------
            var { result, rerender } = renderHook(() => useInject(selector), {
                wrapper,
            });

            rerender();

            // Assert --------
            // Receive expected value
            expect(result.current).toBe(expectedValue);

            // Dependencies selector was called only once
            expect(selector).toHaveReturnedWith(expectedValue);
            expect(selector).toHaveBeenCalledOnce();
        });

        test("WHEN: Inject single value via type key", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var { DIRootScope, useInject } = createDIContext();
            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            // Act -----------
            var { result, rerender } = renderHook(() => useInject(typeKey), {
                wrapper,
            });

            rerender();

            // Assert --------
            // Receive expected value
            expect(result.current).toBe(expectedValue);
        });

        test("WHEN: Inject many values via selector", () => {
            // Arrange -------
            var typeKeyA = "typeKeyA";
            var typeKeyB = "typeKeyB";
            var expectedValueA = 11;
            var expectedValueB = 22;
            var container = diBuilder()
                .bindInstance(typeKeyA, expectedValueA)
                .bindInstance(typeKeyB, expectedValueB)
                .build();

            var selector = vi.fn((r) => ({
                a: r.get(typeKeyA),
                b: r.get(typeKeyB),
            }));

            var { DIRootScope, useInject } = createDIContext();
            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            // Act -----------
            var { result, rerender } = renderHook(() => useInject(selector), {
                wrapper,
            });

            rerender();

            // Assert --------
            // Receive expected values
            expect(result.current.a).toBe(expectedValueA);
            expect(result.current.b).toBe(expectedValueB);

            // Dependencies selector was called only once
            expect(selector).toHaveBeenCalledOnce();
        });
    });

    describe("withInject", () => {
        test("WHEN: Inject to props", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var extraPropValue = "foo";

            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var { DIRootScope, withInject } = createDIContext();

            var OriginComponent = vi.fn();

            var WrappedComponent = withInject((r) => ({
                injectedValue: r.get(typeKey),
            }))(OriginComponent);

            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            // Act -------
            render(createElement(WrappedComponent, { extra: extraPropValue }), {
                wrapper,
            });

            // Assert ----
            expect(OriginComponent).toHaveBeenCalledWith(
                expect.objectContaining({
                    injectedValue: expectedValue,
                    extra: extraPropValue,
                }),
                undefined,
            );
        });
    });

    describe("Scope", () => {
        test("WHEN: Resolve local instance", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var scopeId = "MyScope";
            var factory = vi.fn((_, ctx) => ctx.current);

            var container = diBuilder()
                .bindFactory(typeKey, factory, { lifecycle: "scope" })
                .build();

            var { DIRootScope, DIScope, useInject } = createDIContext();

            var wrapper = ({ children }) =>
                createElement(
                    DIRootScope,
                    { root: container },
                    createElement(DIScope, { id: scopeId }, children),
                );

            // Act ---------
            var { result } = renderHook(() => useInject(typeKey), { wrapper });

            // Assert ------
            expect(result.current).toBe(scopeId);
        });

        test("WHEN: Scope mount", () => {
            // Arrange ------
            var typeKey = "typeKey";
            var scopeId = "TestScope";

            var onScopeOpen = vi.fn();
            var onScopeDispose = vi.fn();
            var container = diBuilder()
                .bindFactory(typeKey, () => {}, { lifecycle: "scope" })
                .use({ onScopeOpen, onScopeDispose })
                .build();

            var { DIRootScope, DIScope } = createDIContext();

            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            // Act ----------
            render(createElement(DIScope, { id: scopeId }), { wrapper });

            // Assert -------
            expect(onScopeOpen).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({ id: scopeId }),
            );
            expect(onScopeDispose).not.toHaveBeenCalled();
        });

        test("WHEN: Scope unmount", () => {
            // Arrange ------
            var typeKey = "typeKey";
            var scopeId = "TestScope";

            var onScopeOpen = vi.fn();
            var onScopeDispose = vi.fn();
            var container = diBuilder()
                .bindFactory(typeKey, () => {}, { lifecycle: "scope" })
                .use({ onScopeOpen, onScopeDispose })
                .build();

            var { DIRootScope, DIScope } = createDIContext();

            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            // Act ----------
            var { unmount } = render(createElement(DIScope, { id: scopeId }), {
                wrapper,
            });

            unmount();

            // Assert -------
            expect(onScopeOpen).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({ id: scopeId }),
            );
            expect(onScopeDispose).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({ id: scopeId }),
            );
        });
    });
});
