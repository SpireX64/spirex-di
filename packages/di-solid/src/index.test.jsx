import { diBuilder } from "@spirex/di";
import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DIRootScope, DIScope, getDISolid, useInject } from "./index.js";

afterEach(() => {
    cleanup();
});

describe("Solid integration", () => {
    describe("useInject", () => {
        test("WHEN: Inject single value via selector", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var selector = vi.fn((r) => r.get(typeKey));

            var captured = { current: undefined };
            function Consumer() {
                captured.current = useInject(selector);
                return null;
            }

            // Act -----------
            render(() => (
                <DIRootScope root={container}>
                    <Consumer />
                </DIRootScope>
            ));

            // Assert --------
            expect(captured.current).toBe(expectedValue);
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

            var captured = { current: undefined };
            function Consumer() {
                captured.current = useInject(typeKey);
                return null;
            }

            // Act -----------
            render(() => (
                <DIRootScope root={container}>
                    <Consumer />
                </DIRootScope>
            ));

            // Assert --------
            expect(captured.current).toBe(expectedValue);
        });

        test("WHEN: Inject named binding via type key and name", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var bindingName = "primary";
            var expectedValue = 100;
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue, { name: bindingName })
                .build();

            var captured = { current: undefined };
            function Consumer() {
                captured.current = useInject(typeKey, bindingName);
                return null;
            }

            // Act -----------
            render(() => (
                <DIRootScope root={container}>
                    <Consumer />
                </DIRootScope>
            ));

            // Assert --------
            expect(captured.current).toBe(expectedValue);
        });

        test("WHEN: Selector receives scopeContext with dispose", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 5;
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var capturedCtx = { current: undefined };
            var selector = vi.fn((r, ctx) => {
                capturedCtx.current = ctx;
                return r.get(typeKey);
            });

            function Consumer() {
                useInject(selector);
                return null;
            }

            // Act -----------
            render(() => (
                <DIRootScope root={container}>
                    <Consumer />
                </DIRootScope>
            ));

            // Assert --------
            expect(capturedCtx.current.current).toBeDefined();
            expect(capturedCtx.current.path).toBeDefined();
            expect(capturedCtx.current.dispose).toEqual(expect.any(Function));
            expect(selector).toHaveReturnedWith(expectedValue);
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

            var captured = { current: undefined };
            function Consumer() {
                captured.current = useInject(selector);
                return null;
            }

            // Act -----------
            render(() => (
                <DIRootScope root={container}>
                    <Consumer />
                </DIRootScope>
            ));

            // Assert --------
            expect(captured.current.a).toBe(expectedValueA);
            expect(captured.current.b).toBe(expectedValueB);
            expect(selector).toHaveBeenCalledOnce();
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

            var captured = { current: undefined };
            function Consumer() {
                captured.current = useInject(typeKey);
                return null;
            }

            // Act -----------
            render(() => (
                <DIRootScope root={container}>
                    <DIScope id={scopeId}>
                        <Consumer />
                    </DIScope>
                </DIRootScope>
            ));

            // Assert --------
            expect(captured.current).toBe(scopeId);
        });

        test("WHEN: Scope mount", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var scopeId = "TestScope";

            var onScopeOpen = vi.fn();
            var onScopeDispose = vi.fn();
            var container = diBuilder()
                .bindFactory(typeKey, () => {}, { lifecycle: "scope" })
                .use({ onScopeOpen, onScopeDispose })
                .build();

            // Act -----------
            render(() => (
                <DIRootScope root={container}>
                    <DIScope id={scopeId} />
                </DIRootScope>
            ));

            // Assert --------
            expect(onScopeOpen).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({ id: scopeId }),
            );
            expect(onScopeDispose).not.toHaveBeenCalled();
        });

        test("WHEN: DIScope passes scope options (e.g. sealed)", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var scopeId = "SealedScope";

            var onScopeOpen = vi.fn();
            var onScopeDispose = vi.fn();
            var container = diBuilder()
                .bindFactory(typeKey, () => {}, { lifecycle: "scope" })
                .use({ onScopeOpen, onScopeDispose })
                .build();

            // Act -----------
            render(() => (
                <DIRootScope root={container}>
                    <DIScope id={scopeId} sealed={true} />
                </DIRootScope>
            ));

            // Assert --------
            expect(onScopeOpen).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({ id: scopeId, sealed: true }),
            );
        });

        test("WHEN: Scope unmount", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var scopeId = "TestScope";

            var onScopeOpen = vi.fn();
            var onScopeDispose = vi.fn();
            var container = diBuilder()
                .bindFactory(typeKey, () => {}, { lifecycle: "scope" })
                .use({ onScopeOpen, onScopeDispose })
                .build();

            var view = render(() => (
                <DIRootScope root={container}>
                    <DIScope id={scopeId} />
                </DIRootScope>
            ));

            // Act -----------
            view.unmount();

            // Assert --------
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

            var captured = { current: undefined };
            function Consumer() {
                captured.current = useInject(typeKey);
                return null;
            }

            // Act -----------
            render(() => (
                <DIRootScope root={container}>
                    <Consumer />
                </DIRootScope>
            ));

            // Assert --------
            expect(captured.current).toBe(expectedValue);
        });

        test("WHEN: useInject via direct import resolves via selector", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = "hello";
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var captured = { current: undefined };
            function Consumer() {
                captured.current = useInject((r) => r.get(typeKey));
                return null;
            }

            // Act -----------
            render(() => (
                <DIRootScope root={container}>
                    <Consumer />
                </DIRootScope>
            ));

            // Assert --------
            expect(captured.current).toBe(expectedValue);
        });

        test("WHEN: DIScope via direct import creates nested scope", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var scopeId = "DirectScope";
            var factory = vi.fn((_, ctx) => ctx.current);

            var container = diBuilder()
                .bindFactory(typeKey, factory, { lifecycle: "scope" })
                .build();

            var captured = { current: undefined };
            function Consumer() {
                captured.current = useInject(typeKey);
                return null;
            }

            // Act -----------
            render(() => (
                <DIRootScope root={container}>
                    <DIScope id={scopeId}>
                        <Consumer />
                    </DIScope>
                </DIRootScope>
            ));

            // Assert --------
            expect(captured.current).toBe(scopeId);
        });
    });

    describe("getDISolid()", () => {
        test("WHEN: getDISolid returns working hooks and components", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 77;
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .build();

            var { DIRootScope: DIAppRoot, useInject: useDiInject } =
                getDISolid();

            var captured = { current: undefined };
            function Consumer() {
                captured.current = useDiInject(typeKey);
                return null;
            }

            // Act -----------
            render(() => (
                <DIAppRoot root={container}>
                    <Consumer />
                </DIAppRoot>
            ));

            // Assert --------
            expect(captured.current).toBe(expectedValue);
        });
    });

    describe("Referential equality", () => {
        test("WHEN: getDISolid() returns same references as direct imports", () => {
            // Arrange -------
            var di = getDISolid();

            // Act -----------
            var useInjectRef = di.useInject;
            var dirRootRef = di.DIRootScope;
            var diScopeRef = di.DIScope;

            // Assert --------
            expect(useInjectRef).toBe(useInject);
            expect(dirRootRef).toBe(DIRootScope);
            expect(diScopeRef).toBe(DIScope);
        });
    });

    describe("No DI scope guard", () => {
        var suppressErrors;

        var setup = () => {
            suppressErrors = vi.spyOn(console, "error").mockImplementation(() => {});
        };

        var cleanupGuard = () => {
            suppressErrors.mockRestore();
        };

        test("WHEN: useInject is called outside DIRootScope", () => {
            // Arrange -------
            setup();
            function Bad() {
                useInject("typeKey");
                return null;
            }

            // Act -----------
            var renderOutsideRoot = () => render(() => <Bad />);

            // Assert --------
            expect(renderOutsideRoot).toThrow("No DIRootScope found");

            cleanupGuard();
        });

        test("WHEN: DIScope is rendered outside DIRootScope", () => {
            // Arrange -------
            setup();

            // Act -----------
            var renderOrphanScope = () =>
                render(() => <DIScope id="orphan" />);

            // Assert --------
            expect(renderOrphanScope).toThrow("No DIRootScope found");

            cleanupGuard();
        });
    });
});
