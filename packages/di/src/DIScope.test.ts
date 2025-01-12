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
import type { IDisposable, TTypeMapBase } from "./types";
import { catchError } from "./__test__/errors";
import { Errors } from "./errors";
import { checkIsPhantomInstance, unwrapPhantom } from "./utils";

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

            test("Get instance of type after scope close", () => {
                // Arrange ----
                const scopeId = "TestScope";
                const scope = makeScopeInstance({ id: scopeId });

                scope.close();

                // Act --------
                const error = catchError(() => scope.get("value"));

                // Assert -----
                expect(error).not.toBeUndefined();
                expect(error?.message).toEqual(
                    Errors.ScopeClosed(scopeId, "value"),
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

            test("Get all instances of type", () => {
                type TypeMap = { value: number };

                // Arrange -------
                const scope = makeScopeInstance<TypeMap>({
                    registrar: makeRegistrar(
                        makeFactoryEntryMock<TypeMap>("value", () => 11),
                        makeFactoryEntryMock<TypeMap>("value", () => 22),
                        makeInstanceEntryMock<TypeMap>("value", 33),
                    ),
                });

                // Act ------------
                const values = scope.getAll("value");

                // Assert ---------
                expect(values).toEqual(expect.arrayContaining([11, 22, 33]));
            });

            test("Get all instances of type after scope close", () => {
                type TypeMap = { value: number };

                // Arrange -----
                const scopeId = "TestScope";
                const scope = makeScopeInstance<TypeMap>({
                    id: scopeId,
                    registrar: makeRegistrar(
                        makeFactoryEntryMock<TypeMap>("value", () => 11),
                        makeFactoryEntryMock<TypeMap>("value", () => 22),
                        makeInstanceEntryMock<TypeMap>("value", 33),
                    ),
                });
                scope.close();

                // Act --------
                const error = catchError(() => scope.getAll("value"));

                // Assert -----
                expect(error).not.toBeUndefined();
                expect(error?.message).toEqual(
                    Errors.ScopeClosed(scopeId, "value"),
                );
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

            test("Get instance provider of type after scope close", () => {
                const scopeId = "TestScope";
                const scope = makeScopeInstance({ id: scopeId });

                scope.close();

                // Act --------
                const error = catchError(() => scope.getProvider("value"));

                // Assert -----
                expect(error).not.toBeUndefined();
                expect(error?.message).toEqual(
                    Errors.ScopeClosed(scopeId, "value"),
                );
            });

            test("Call instance provider after scope close", () => {
                const scopeId = "TestScope";
                const scope = makeScopeInstance({
                    id: scopeId,
                    registrar: makeRegistrar(
                        makeFactoryEntryMock("value", () => 42),
                    ),
                });
                const provider = scope.getProvider("value");
                scope.close();

                // Act --------
                const error = catchError(provider);

                // Assert -----
                expect(error).not.toBeUndefined();
                expect(error?.message).toEqual(
                    Errors.ScopeClosed(scopeId, "value"),
                );
            });

            describe("Phantom instance", () => {
                test("Get phantom instance", () => {
                    type TypeMap = { value: { foo: string } };

                    const factory = jest.fn(() => ({ foo: "bar" }));
                    const scope = makeScopeInstance({
                        registrar: makeRegistrar(
                            makeFactoryEntryMock<TypeMap>(
                                "value",
                                factory,
                                "lazy",
                            ),
                        ),
                    });

                    // Act ---------
                    const valuePhantom = scope.getPhantom("value");

                    // Expect ------
                    expect(valuePhantom).not.toBeNull();
                    expect(factory).not.toHaveBeenCalled();
                });

                test("Interaction with phantom instance", () => {
                    type TypeMap = { value: { foo: string } };

                    const factory = jest.fn(() => ({ foo: "bar" }));
                    const scope = makeScopeInstance({
                        registrar: makeRegistrar(
                            makeFactoryEntryMock<TypeMap>(
                                "value",
                                factory,
                                "lazy",
                            ),
                        ),
                    });
                    const valuePhantom = scope.getPhantom("value");

                    // Act ---------
                    const foo = valuePhantom.foo;

                    // Expect ------
                    expect(valuePhantom).not.toBeNull();
                    expect(factory).toHaveBeenCalledTimes(1);
                    expect(foo).toBe("bar");
                });

                test("Check is phantom instance", () => {
                    type TypeMap = { value: { foo: string } };

                    const factory = jest.fn(() => ({ foo: "bar" }));
                    const scope = makeScopeInstance({
                        registrar: makeRegistrar(
                            makeFactoryEntryMock<TypeMap>(
                                "value",
                                factory,
                                "lazy",
                            ),
                        ),
                    });
                    const valuePhantom = scope.getPhantom("value");

                    // Act ---------
                    const isPhantom = checkIsPhantomInstance(valuePhantom);

                    // Expect ------
                    expect(valuePhantom).not.toBeNull();
                    expect(isPhantom).toBeTruthy();
                });

                test("Get phantom instance after interaction", () => {
                    type TypeMap = { value: { foo: symbol } };
                    const expectedValue = Symbol("value");

                    const factory = jest.fn(() => ({ foo: expectedValue }));
                    const scope = makeScopeInstance({
                        registrar: makeRegistrar(
                            makeFactoryEntryMock<TypeMap>(
                                "value",
                                factory,
                                "lazy",
                            ),
                        ),
                    });
                    const valuePhantom = scope.getPhantom("value");
                    const valuePhantomFoo = valuePhantom.foo; // Interaction

                    // Act ---------
                    const anotherValue = scope.getPhantom("value");
                    const isPhantom = checkIsPhantomInstance(anotherValue);

                    // Expect ------
                    expect(anotherValue).not.toBeNull();
                    expect(isPhantom).toBeFalsy();
                    expect(factory).toHaveBeenCalledTimes(1);
                    expect(valuePhantomFoo).toBe(expectedValue);
                    expect(anotherValue.foo).toBe(expectedValue);
                    expect(anotherValue.foo).toBe(valuePhantom.foo);
                });

                test("Unwrap phantom instance", () => {
                    type TypeMap = { value: { foo: string } };

                    const factory = jest.fn(() => ({ foo: "bar" }));
                    const scope = makeScopeInstance({
                        registrar: makeRegistrar(
                            makeFactoryEntryMock<TypeMap>(
                                "value",
                                factory,
                                "lazy",
                            ),
                        ),
                    });

                    // Act ---------
                    const valuePhantom = scope.getPhantom("value");

                    const realValue = unwrapPhantom(valuePhantom);
                    const realValue2 = unwrapPhantom(realValue);

                    // Expect ------
                    expect(realValue).not.toBeNull();
                    expect(checkIsPhantomInstance(valuePhantom)).toBeTruthy();
                    expect(checkIsPhantomInstance(realValue)).toBeFalsy();
                    expect(realValue.foo).toBe(valuePhantom.foo);
                    expect(factory).toHaveBeenCalledTimes(1);
                    expect(realValue2).toBe(realValue);
                });

                test("Get phantom instance from closed scope", () => {
                    type TypeMap = { value: { foo: string } };

                    const scopeId = "scope-id";
                    const factory = jest.fn(() => ({ foo: "bar" }));
                    const scope = makeScopeInstance({
                        id: scopeId,
                        registrar: makeRegistrar(
                            makeFactoryEntryMock<TypeMap>(
                                "value",
                                factory,
                                "lazy",
                            ),
                        ),
                    });
                    scope.close();

                    // Act ---------
                    const error = catchError(() => scope.getPhantom("value"));

                    // Expect ------
                    expect(error).not.toBeUndefined();
                    expect(error?.message).toEqual(
                        Errors.ScopeClosed(scopeId, "value"),
                    );
                    expect(factory).not.toHaveBeenCalled();
                });

                test("Get phantom instance of not bound entry", () => {
                    type TypeMap = { value: { foo: string } };

                    const scope = makeScopeInstance<TypeMap>();

                    // Act ---------
                    const error = catchError(() => scope.getPhantom("value"));

                    // Expect ------
                    expect(error).not.toBeUndefined();
                    expect(error?.message).toEqual(
                        Errors.TypeBindingNotFound("value"),
                    );
                });
            });
        });
    });

    describe("Child scope", () => {
        test("Get child scope", () => {
            // Arrange ----------
            const childId = "child";
            const scope = makeScopeInstance();

            // Act --------------
            const childScope = scope.scope(childId);

            // Assert -----------
            expect(childScope).toBeInstanceOf(DIScope);
            expect(childScope.id).toEqual(childId);
        });

        test("Get child scope multiple times", () => {
            // Arrange ----------
            const childId = "child";
            const scope = makeScopeInstance();

            // Act --------------
            const childScopeA = scope.scope(childId);
            const childScopeB = scope.scope(childId);

            // Assert -----------
            expect(childScopeA).toBe(childScopeB);
        });

        test("Close scope", () => {
            // Arrange -----
            const scope = makeScopeInstance();

            // Act ---------
            scope.close();

            // Assert ------
            expect(scope.isClosed).toBeTruthy();
        });

        test("Close scope many times", () => {
            // Arrange --------
            const scope = makeScopeInstance();
            scope.close();

            // Act --------
            const error = catchError(() => {
                scope.close();
            });

            // Assert ---------
            expect(error).toBeUndefined();
            expect(scope.isClosed).toBeTruthy();
        });

        test("Auto-close child scope", () => {
            // Arrange ------
            const scope = makeScopeInstance();
            const childScope = scope.scope("child");

            // Act ----------
            scope.close();

            // Assert -------
            expect(scope.isClosed).toBeTruthy();
            expect(childScope.isClosed).toBeTruthy();
        });

        test("Dispose scoped instances", () => {
            type TypeMap = { value: IDisposable };

            // Arrange -------
            const disposeFuncA = jest.fn();
            const disposeFuncB = jest.fn();

            const scope = makeScopeInstance({
                registrar: makeRegistrar(
                    makeFactoryEntryMock<TypeMap>(
                        "value",
                        () => ({
                            dispose: disposeFuncA,
                        }),
                        "scope",
                    ),
                    makeFactoryEntryMock<TypeMap>(
                        "value",
                        () => ({
                            dispose: disposeFuncB,
                        }),
                        "scope",
                    ),
                ),
            });

            scope.getAll("value");

            // Act ---------
            scope.close();

            // Assert --------
            expect(scope.isClosed).toBeTruthy();
            expect(disposeFuncA).toHaveBeenCalledTimes(1);
            expect(disposeFuncB).toHaveBeenCalledTimes(1);
        });

        test("Get child scope after close", () => {
            // Arrange ----------
            const parentId = "parent";
            const childId = "child";
            const scope = makeScopeInstance({ id: parentId });
            scope.close();

            // Act --------------
            const error = catchError(() => scope.scope(childId));

            // Assert -----------
            expect(error).not.toBeUndefined();
            expect(error?.message).toEqual(
                Errors.ParentScopeClosed(parentId, childId),
            );
        });
    });
});
