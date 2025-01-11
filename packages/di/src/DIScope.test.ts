// noinspection DuplicatedCode

import { DIScope } from "./DIScope";
import { Registrar } from "./internal/Registrar";
import {
    makeEntriesMap,
    makeFactoryEntryMock,
    makeInstanceEntryMock,
    makeRegistrar,
} from "./__test__/mocks";
import { InstanceActivator } from "./internal/InstanceActivator";
import { TTypeMapBase } from "./types";
import { catchError } from "./__test__/errors";
import { Errors } from "./errors";

function makeScopeInstance<T extends TTypeMapBase>(
    options?: Partial<{
        id: string | symbol;
        activator: InstanceActivator<T>;
        registrar: Registrar<T>;
        parent: DIScope<T>;
    }>,
): DIScope<T> {
    return new DIScope(
        options?.id ?? Symbol("test"),
        options?.registrar ?? new Registrar(makeEntriesMap()),
        options?.activator ?? new InstanceActivator(),
        options?.parent,
    );
}

const randInt = () => Math.round(Math.random() * 1000);

describe("DIScope", () => {
    describe("Create scope instance", () => {
        test("Create instance with string id", () => {
            // Arrange ----
            const id = "scope-id";
            const registrar = new Registrar(makeEntriesMap());
            const activator = new InstanceActivator();

            // Act --------
            const scope = new DIScope(id, registrar, activator);

            // Assert -----
            expect(scope.id).toBe(id);
        });

        test("Create instance with symbol id", () => {
            // Arrange ----
            const id = Symbol("scope-id");
            const registrar = new Registrar(makeEntriesMap());
            const activator = new InstanceActivator();

            // Act --------
            const scope = new DIScope(id, registrar, activator);

            // Assert -----
            expect(scope.id).toBe(id);
        });
    });

    describe("Resolve instances", () => {
        describe("Get instance of type", () => {
            test("Get instance", () => {
                type TypeMap = { value: number };

                // Arrange ---------
                const expectedValue = 42;
                const scope = makeScopeInstance({
                    registrar: makeRegistrar(
                        makeInstanceEntryMock<TypeMap>("value", expectedValue),
                    ),
                });

                // Act -------------
                const value = scope.get("value");

                // Assert ----------
                expect(value).toBe(expectedValue);
            });

            test("Get instance of not bound type", () => {
                type TypeMap = { value: number };

                // Arrange ---------
                const scope = makeScopeInstance<TypeMap>();

                // Act -------------
                const error = catchError(() => scope.get("value"));

                // Assert ----------
                expect(error).not.toBeUndefined();
                expect(error?.message).toEqual(
                    Errors.TypeBindingNotFound("value"),
                );
            });

            test("Get instance from transient factory", () => {
                type TypeMap = { value: number };

                // Arrange ---------------------
                const factory = jest.fn(randInt);
                const scope = makeScopeInstance<TypeMap>({
                    registrar: makeRegistrar(
                        makeFactoryEntryMock("value", factory, "transient"),
                    ),
                });

                // Act -------------------------
                const valueA = scope.get("value");
                const valueB = scope.get("value");
                const valueC = scope.get("value");

                // Assert ---------
                expect(valueA).not.toEqual(valueB);
                expect(valueA).not.toEqual(valueC);
                expect(valueB).not.toEqual(valueC);

                // Transient - calls factory every
                expect(factory).toHaveBeenCalledTimes(3);
            });

            test("Get instance from scoped factory", () => {
                type TypeMap = { value: number };

                // Arrange ---------
                const factory = jest.fn(randInt);
                const activator = new InstanceActivator<TypeMap>();
                const registrar = makeRegistrar(
                    makeFactoryEntryMock<TypeMap>("value", factory, "scope"),
                );

                const parent = makeScopeInstance<TypeMap>({
                    registrar,
                    activator,
                });

                const scope = makeScopeInstance<TypeMap>({
                    registrar,
                    activator,
                    parent,
                });

                // Act ------------
                const valuePA = parent.get("value");
                const valuePB = parent.get("value");
                const valueSA = scope.get("value");
                const valueSB = scope.get("value");

                // Assert ----------
                expect(valuePA).toBe(valuePB);
                expect(valueSA).toBe(valueSB);
                expect(valuePA).not.toBe(valueSA);

                // Scoped singleton - calls factory once per scope
                expect(factory).toHaveBeenCalledTimes(2);
            });

            test("Get instance from singleton factory", () => {
                type TypeMap = { value: number };

                // Arrange ---------
                const factory = jest.fn(randInt);
                const activator = new InstanceActivator<TypeMap>();
                const registrar = makeRegistrar(
                    makeFactoryEntryMock<TypeMap>(
                        "value",
                        factory,
                        "singleton",
                    ),
                );

                const parent = makeScopeInstance<TypeMap>({
                    registrar,
                    activator,
                });

                const scope = makeScopeInstance<TypeMap>({
                    registrar,
                    activator,
                    parent,
                });

                // Act ------------
                const valuePA = parent.get("value");
                const valuePB = parent.get("value");
                const valueSA = scope.get("value");
                const valueSB = scope.get("value");

                // Assert ----------
                expect(valuePA).toBe(valuePB);
                expect(valueSA).toBe(valueSB);
                expect(valuePA).toBe(valueSA);

                // Singleton - calls factory only once
                expect(factory).toHaveBeenCalledTimes(1);
            });

            test("Get provider of type", () => {
                type TypeMap = { value: number };

                // Arrange ----------
                const expectedValue = 42;
                const scope = makeScopeInstance({
                    registrar: makeRegistrar(
                        makeInstanceEntryMock<TypeMap>("value", expectedValue),
                    ),
                });

                // Act -------------
                const provider = scope.getProvider("value");
                const value = provider();

                // Assert ---------
                expect(value).toBe(expectedValue);
            });

            test("Get provider of not bound type", () => {
                type TypeMap = { value: number };

                // Arrange ---------
                const scope = makeScopeInstance<TypeMap>();

                // Act -------------
                const error = catchError(() => scope.getProvider("value"));

                // Assert ----------
                expect(error).not.toBeUndefined();
                expect(error?.message).toEqual(
                    Errors.TypeBindingNotFound("value"),
                );
            });
        });
    });
});
