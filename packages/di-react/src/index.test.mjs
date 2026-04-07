import { render, renderHook } from "@testing-library/react";
import { vi, describe, test, expect } from "vitest";
import { createElement, StrictMode, createRef, forwardRef } from "react";
import { diBuilder } from "@spirex/di";
import {
    createDIContext,
    getDIReact,
    DIRootScope,
    DIScope,
    useInject,
    withInject,
} from "./index";

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
            expect(result.current).toBe(expectedValue);
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
            expect(result.current.a).toBe(expectedValueA);
            expect(result.current.b).toBe(expectedValueB);
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

        test("WHEN: Inject to props via component scope", () => {
            // Arrange ------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var extraPropValue = "foo";

            var scopeId = 'newScope';

            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var { DIRootScope, withInject } = createDIContext();

            var OriginComponent = vi.fn();

            var WrappedComponent = withInject(
                (r, ctx) => ({ injectedValue: r.get(typeKey), scopeId: ctx.current }),
                { id: scopeId, sealed: true },
            )(OriginComponent);

            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            // Act ----------
            render(createElement(WrappedComponent, { extra: extraPropValue }), {
                wrapper,
            });

            // Assert -------
            expect(OriginComponent).toHaveBeenCalledWith(
                expect.objectContaining({
                    scopeId,
                    injectedValue: expectedValue,
                    extra: extraPropValue,
                }),
                undefined,
            );
        })
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

    describe("Direct imports (dynamic API)", () => {
        test("WHEN: useInject via direct import resolves value", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 99;
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            // Act -----------
            var { result } = renderHook(() => useInject(typeKey), { wrapper });

            // Assert --------
            expect(result.current).toBe(expectedValue);
        });

        test("WHEN: useInject via direct import resolves via selector", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = "hello";
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            // Act -----------
            var { result } = renderHook(
                () => useInject((r) => r.get(typeKey)),
                { wrapper },
            );

            // Assert --------
            expect(result.current).toBe(expectedValue);
        });

        test("WHEN: withInject via direct import injects props", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var OriginComponent = vi.fn();
            var WrappedComponent = withInject((r) => ({
                injected: r.get(typeKey),
            }))(OriginComponent);

            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            // Act -----------
            render(createElement(WrappedComponent), { wrapper });

            // Assert --------
            expect(OriginComponent).toHaveBeenCalledWith(
                expect.objectContaining({ injected: expectedValue }),
                undefined,
            );
        });

        test("WHEN: withInject via direct import with scope", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var scopeId = "directScope";

            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var OriginComponent = vi.fn();
            var WrappedComponent = withInject(
                (r, ctx) => ({ injected: r.get(typeKey), scopeId: ctx.current }),
                { id: scopeId },
            )(OriginComponent);

            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            // Act -----------
            render(createElement(WrappedComponent), { wrapper });

            // Assert --------
            expect(OriginComponent).toHaveBeenCalledWith(
                expect.objectContaining({
                    injected: expectedValue,
                    scopeId,
                }),
                undefined,
            );
        });

        test("WHEN: DIScope via direct import creates nested scope", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var scopeId = "DirectScope";
            var factory = vi.fn((_, ctx) => ctx.current);

            var container = diBuilder()
                .bindFactory(typeKey, factory, { lifecycle: "scope" })
                .build();

            var wrapper = ({ children }) =>
                createElement(
                    DIRootScope,
                    { root: container },
                    createElement(DIScope, { id: scopeId }, children),
                );

            // Act -----------
            var { result } = renderHook(() => useInject(typeKey), { wrapper });

            // Assert --------
            expect(result.current).toBe(scopeId);
        });
    });

    describe("getDIReact()", () => {
        test("WHEN: getDIReact returns working hooks and components", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 77;
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var di = getDIReact();

            var wrapper = ({ children }) =>
                createElement(di.DIRootScope, { root: container }, children);

            // Act -----------
            var { result } = renderHook(() => di.useInject(typeKey), { wrapper });

            // Assert --------
            expect(result.current).toBe(expectedValue);
        });
    });

    describe("Referential equality", () => {
        test("WHEN: getDIReact() returns same references as direct imports", () => {
            // Arrange -------
            var di = getDIReact();

            // Assert --------
            expect(di.useInject).toBe(useInject);
            expect(di.withInject).toBe(withInject);
            expect(di.DIRootScope).toBe(DIRootScope);
            expect(di.DIScope).toBe(DIScope);
        });

        test("WHEN: createDIContext() returns same references as direct imports", () => {
            // Arrange -------
            var di = createDIContext();

            // Assert --------
            expect(di.useInject).toBe(useInject);
            expect(di.withInject).toBe(withInject);
            expect(di.DIRootScope).toBe(DIRootScope);
            expect(di.DIScope).toBe(DIScope);
        });

        test("WHEN: getDIReact and createDIContext return same references", () => {
            // Arrange -------
            var a = getDIReact();
            var b = createDIContext();

            // Assert --------
            expect(a.useInject).toBe(b.useInject);
            expect(a.withInject).toBe(b.withInject);
            expect(a.DIRootScope).toBe(b.DIRootScope);
            expect(a.DIScope).toBe(b.DIScope);
        });
    });

    describe("StrictMode", () => {
        test("WHEN: DIScope in StrictMode resolves value correctly", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var scopeId = "StrictScope";
            var factory = vi.fn((_, ctx) => ctx.current);

            var container = diBuilder()
                .bindFactory(typeKey, factory, { lifecycle: "scope" })
                .build();

            var wrapper = ({ children }) =>
                createElement(
                    StrictMode,
                    null,
                    createElement(
                        DIRootScope,
                        { root: container },
                        createElement(DIScope, { id: scopeId }, children),
                    ),
                );

            // Act -----------
            var { result } = renderHook(() => useInject(typeKey), { wrapper });

            // Assert --------
            expect(result.current).toBe(scopeId);
        });

        test("WHEN: DIScope in StrictMode disposes correctly on unmount", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var scopeId = "StrictDisposeScope";

            var onScopeOpen = vi.fn();
            var onScopeDispose = vi.fn();
            var container = diBuilder()
                .bindFactory(typeKey, () => {}, { lifecycle: "scope" })
                .use({ onScopeOpen, onScopeDispose })
                .build();

            var wrapper = ({ children }) =>
                createElement(
                    StrictMode,
                    null,
                    createElement(DIRootScope, { root: container }, children),
                );

            // Act -----------
            var { unmount } = render(
                createElement(DIScope, { id: scopeId }),
                { wrapper },
            );

            var openCallsBeforeUnmount = onScopeOpen.mock.calls.length;
            var disposeCallsBeforeUnmount = onScopeDispose.mock.calls.length;

            unmount();

            // Assert --------
            expect(onScopeDispose.mock.calls.length).toBe(disposeCallsBeforeUnmount + 1);
            expect(openCallsBeforeUnmount).toBeGreaterThanOrEqual(1);
        });

        test("WHEN: withInject with scope in StrictMode resolves correctly", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var scopeId = "StrictWithInjectScope";

            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var OriginComponent = vi.fn();
            var WrappedComponent = withInject(
                (r, ctx) => ({ injected: r.get(typeKey), scopeId: ctx.current }),
                { id: scopeId },
            )(OriginComponent);

            var wrapper = ({ children }) =>
                createElement(
                    StrictMode,
                    null,
                    createElement(DIRootScope, { root: container }, children),
                );

            // Act -----------
            render(createElement(WrappedComponent), { wrapper });

            // Assert --------
            var lastCall = OriginComponent.mock.calls[OriginComponent.mock.calls.length - 1];
            expect(lastCall[0]).toEqual(
                expect.objectContaining({
                    injected: expectedValue,
                    scopeId,
                }),
            );
        });
    });

    describe("No DI scope guard", () => {
        var suppressErrors;

        var setup = () => {
            suppressErrors = vi.spyOn(console, "error").mockImplementation(() => {});
        };

        var cleanup = () => {
            suppressErrors.mockRestore();
        };

        test("WHEN: useInject is called outside DIRootScope", () => {
            setup();
            expect(() =>
                renderHook(() => useInject("typeKey")),
            ).toThrow("No DI scope found. Wrap your component tree with <DIRootScope>.");
            cleanup();
        });

        test("WHEN: DIScope is rendered outside DIRootScope", () => {
            setup();
            expect(() =>
                render(createElement(DIScope, { id: "orphan" })),
            ).toThrow("No DI scope found. Wrap your component tree with <DIRootScope>.");
            cleanup();
        });

        test("WHEN: withInject (without scope) is used outside DIRootScope", () => {
            setup();
            var OriginComponent = vi.fn();
            var WrappedComponent = withInject((r) => ({
                value: r.get("typeKey"),
            }))(OriginComponent);

            expect(() =>
                render(createElement(WrappedComponent)),
            ).toThrow("No DI scope found. Wrap your component tree with <DIRootScope>.");
            cleanup();
        });

        test("WHEN: withInject (with scope) is used outside DIRootScope", () => {
            setup();
            var OriginComponent = vi.fn();
            var WrappedComponent = withInject(
                (r) => ({ value: r.get("typeKey") }),
                { id: "orphanScope" },
            )(OriginComponent);

            expect(() =>
                render(createElement(WrappedComponent)),
            ).toThrow("No DI scope found. Wrap your component tree with <DIRootScope>.");
            cleanup();
        });
    });

    describe("Ref forwarding", () => {
        test("WHEN: withInject forwards ref to the wrapped component", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var receivedRef = { value: undefined };
            var OriginComponent = forwardRef((props, ref) => {
                receivedRef.value = ref;
                return null;
            });

            var WrappedComponent = withInject((r) => ({
                injected: r.get(typeKey),
            }))(OriginComponent);

            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            var myRef = createRef();

            // Act -----------
            render(createElement(WrappedComponent, { ref: myRef }), { wrapper });

            // Assert --------
            expect(receivedRef.value).toBe(myRef);
        });

        test("WHEN: withInject with scope forwards ref to the wrapped component", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var scopeId = "refScope";
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var receivedRef = { value: undefined };
            var OriginComponent = forwardRef((props, ref) => {
                receivedRef.value = ref;
                return null;
            });

            var WrappedComponent = withInject(
                (r, ctx) => ({ injected: r.get(typeKey), scopeId: ctx.current }),
                { id: scopeId },
            )(OriginComponent);

            var wrapper = ({ children }) =>
                createElement(DIRootScope, { root: container }, children);

            var myRef = createRef();

            // Act -----------
            render(createElement(WrappedComponent, { ref: myRef }), { wrapper });

            // Assert --------
            expect(receivedRef.value).toBe(myRef);
        });
    });
});
