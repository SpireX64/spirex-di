import {
    createMockResolver,
    makeFactoryEntryMock,
    makeInstanceEntryMock,
    makeRegistrar,
} from "../__test__/mocks";
import { InstanceActivator } from "./InstanceActivator";
import { catchError } from "../__test__/errors";
import { ModulesManager } from "../modules/ModulesManager";
import { DIScope } from "../DIScope";

describe("InstanceActivator", () => {
    test("Activate instance entry", () => {
        // Arrange -------
        const instanceEntry = makeInstanceEntryMock("value", 42);
        const resolver = createMockResolver();
        const activator = new InstanceActivator();

        // Act -----------
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const instance = activator.createInstance(instanceEntry, resolver);

        expect(instance).toBe(instanceEntry.instance);
    });

    test("Activate factory entry", () => {
        // Arrange --------
        const expectedValue = 42;
        const factoryEntry = makeFactoryEntryMock(
            "value",
            jest.fn(() => expectedValue),
        );
        const resolver = createMockResolver();
        const activator = new InstanceActivator();

        // Act ------------
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const instance = activator.createInstance(factoryEntry, resolver);

        // Assert ---------
        expect(instance).toBe(expectedValue);
        expect(factoryEntry.factory).toHaveBeenCalledTimes(1);
    });

    test("Activate 2-level factory chain", () => {
        type TypeMap = { v1: number; v2: string };

        // Arrange ----------
        const factoryEntry = makeFactoryEntryMock<TypeMap>(
            "v2",
            jest.fn((r) => r.get("v1").toString() + "px"),
        );
        const resolver = createMockResolver<TypeMap>({ v1: 42 });
        const activator = new InstanceActivator<TypeMap>();

        // Act -------------
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const instance = activator.createInstance(factoryEntry, resolver);

        // Assert ----------
        expect(instance).toBe("42px");

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(resolver.get).toHaveBeenCalled();
        expect(factoryEntry.factory).toHaveBeenCalledTimes(1);
    });

    describe("Detect dependencies cycle", () => {
        test("Activation short cycle", () => {
            type TypeMap = { value: string };

            // Arrange --------
            const registrar = makeRegistrar(
                makeFactoryEntryMock<TypeMap>(
                    "value",
                    (r) => r.get("value"),
                    "lazy",
                ),
            );
            const activator = new InstanceActivator<TypeMap>();
            const modules = new ModulesManager();
            const container = new DIScope("container", {
                registrar,
                activator,
                modules,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                middlewares: new Set(),
            });

            // Act ---------
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const entry = registrar.findTypeEntry("value")!;
            const error = catchError(() => {
                activator.createInstance(entry, container);
            });

            // Assert ------
            expect(error).not.toBeUndefined();
            expect(error?.message).toContain("value -> value");
        });

        test("Activation long cycle", () => {
            type TypeMap = { valueA: string; valueB: string; valueC: string };

            // Arrange --------
            const registrar = makeRegistrar(
                makeFactoryEntryMock<TypeMap>(
                    "valueA",
                    (r) => r.get("valueB"),
                    "lazy",
                ),
                makeFactoryEntryMock<TypeMap>(
                    "valueB",
                    (r) => r.get("valueC"),
                    "lazy",
                ),
                makeFactoryEntryMock<TypeMap>(
                    "valueC",
                    (r) => r.get("valueA"),
                    "lazy",
                ),
            );
            const activator = new InstanceActivator<TypeMap>();
            const modules = new ModulesManager();
            const container = new DIScope("container", {
                registrar,
                activator,
                modules,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                middlewares: new Set(),
            });

            // Act ---------
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const entry = registrar.findTypeEntry("valueA")!;
            const error = catchError(() => {
                activator.createInstance(entry, container);
            });

            // Assert ------
            expect(error).not.toBeUndefined();
            expect(error?.message).toContain(
                "[valueA] -> valueB -> valueC -> [valueA]",
            );
        });

        test("Deep activation cycle", () => {
            type TypeMap = { valueA: string; valueB: string; valueC: string };

            // Arrange --------
            const registrar = makeRegistrar(
                makeFactoryEntryMock<TypeMap>(
                    "valueA",
                    (r) => r.get("valueB"),
                    "lazy",
                ),
                makeFactoryEntryMock<TypeMap>(
                    "valueB",
                    (r) => r.get("valueC"),
                    "lazy",
                ),
                makeFactoryEntryMock<TypeMap>(
                    "valueC",
                    (r) => r.get("valueB"),
                    "lazy",
                ),
            );
            const activator = new InstanceActivator<TypeMap>();
            const modules = new ModulesManager();
            const container = new DIScope("container", {
                registrar,
                activator,
                modules,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                middlewares: new Set(),
            });

            // Act ---------
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const entry = registrar.findTypeEntry("valueA")!;
            const error = catchError(() => {
                activator.createInstance(entry, container);
            });

            // Assert ------
            expect(error).not.toBeUndefined();
            expect(error?.message).toContain(
                "valueA -> [valueB] -> valueC -> [valueB]",
            );
        });
    });

    test("Dependency lifecycle mismatch", () => {
        type TypeMap = { valueA: string; valueB: string };

        // Arrange --------
        const registrar = makeRegistrar<TypeMap>(
            makeFactoryEntryMock("valueA", () => "Hello", "transient"),
            makeFactoryEntryMock("valueB", (r) => r.get("valueA"), "lazy"),
        );
        const activator = new InstanceActivator<TypeMap>();
        const modules = new ModulesManager();
        const container = new DIScope("container", {
            registrar,
            activator,
            modules,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            middlewares: new Set(),
        });

        // Act ------------
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const entry = registrar.findTypeEntry("valueB")!;
        const error = catchError(() => {
            activator.createInstance(entry, container);
        });

        // Assert --------
        expect(error).not.toBeUndefined();
        expect(error?.message).toContain(
            "'lazy' cannot depend on a 'transient'",
        );
    });
});
