import { vi, describe, test, expect } from "vitest";
import { createContainerBuilder, staticModule } from "./index";
import { DIErrors } from "./index.js";

/**
 * Executes a procedure and captures any thrown Error instance.
 *
 * Useful in tests when you want to inspect the error object,
 * such as checking that the message contains debugging details.
 *
 * @param procedure {Function} A function expected to potentially throw an error.
 * @returns The thrown Error instance if one occurs, or `undefined` otherwise.
 *
 * @example
 * var error = catchError(() => {
 *     service.mayThrow();
 * });
 * expect(error).to.not.be.undefined;
 * expect(error.message).to.contain("expected part of the message");
 */
function catchError(procedure) {
    try {
        procedure();
    } catch (e) {
        if (e instanceof Error) return e;
    }
    return undefined;
}

// @ts-nocheck
describe("Container Builder", () => {
    describe("Create", () => {
        test("WHEN use default factory", () => {
            // Act -------------------
            var builder = createContainerBuilder();

            // Assert ----------------
            expect(builder).instanceOf(Object);
        });
    });

    describe("Checking", () => {
        describe("has", () => {
            test("WHEN type have no bindings", () => {
                // Arrange ------
                var builder = createContainerBuilder();

                // Act ----------
                var result = builder.has("typeKey");

                // Assert -------
                expect(result).is.false;
            });

            test("WHEN type have a binding", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var builder = createContainerBuilder();
                builder.bindInstance(typeKey, 42);

                // Act ----------
                var result = builder.has(typeKey);

                // Assert -------
                expect(result).is.true;
            });

            test("WHEN: type has an alias binding", () => {
                // Arrange ------
                var key = "aliasKey";
                var builder = createContainerBuilder()
                    .bindInstance("typeKey", 42)
                    .bindAlias(key, "typeKey");

                // Act ----------
                var isBindingExist = builder.has(key);

                // Assert -------
                expect(isBindingExist).is.true;
            });
        });

        describe("findEntry", () => {
            test("WHEN type have at least one binding", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var builder = createContainerBuilder();
                builder.bindInstance(typeKey, 42);

                // Act -----------
                var entry = builder.findEntry(typeKey);

                // Assert --------
                expect(entry).not.undefined;
                expect(entry.type).to.equal(typeKey);
            });

            test("WHEN type have no bindings", () => {
                // Arrange -------
                var builder = createContainerBuilder();

                // Act -----------
                var entry = builder.findEntry("typeKey");

                // Assert --------
                expect(entry).to.be.undefined;
            });

            test("WHEN type have bunch of bindings", () => {
                // Arrange ---------
                var typeKey = "typeKey";
                var builder = createContainerBuilder()
                    .bindInstance(typeKey, 11)
                    .bindInstance(typeKey, 22, { ifConflict: "append" });

                // Act -------------
                var entry = builder.findEntry(typeKey);

                // Assert ----------
                // Returns the first bound entry
                expect(entry).toBeDefined();
                expect(entry.instance).toBe(11);
            });
        });

        describe("findAllEntries", () => {
            test("WHEN there are no bindings for given type", () => {
                // Arrange ----------
                var builder = createContainerBuilder();

                // Act --------------
                var entries = builder.findAllEntries("typeKey");

                // Assert -----------
                expect(entries).instanceOf(Array);
                expect(entries).is.empty;
            });

            test("WHEN there are no bindings for given type and name", () => {
                // Arrange ----------
                var builder = createContainerBuilder();

                // Act --------------
                var entries = builder.findAllEntries("typeKey", "typeName");

                // Assert -----------
                expect(entries).instanceOf(Array);
                expect(entries).is.empty;
            });

            test("WHEN there is only one binding for given type", () => {
                // Arrange ---------
                var typeKey = "typeKey";
                var builder = createContainerBuilder().bindInstance(
                    typeKey,
                    42,
                );

                // Act -------------
                var entries = builder.findAllEntries(typeKey);

                // Assert ----------
                expect(entries).instanceOf(Array);
                expect(entries).has.length(1);
            });

            test("WHEN there is only one binding for given type and name", () => {
                // Arrange ---------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var builder = createContainerBuilder().bindInstance(
                    typeKey,
                    42,
                    { name: typeName },
                );

                // Act -------------
                var entries = builder.findAllEntries(typeKey, typeName);

                // Assert ----------
                expect(entries).instanceOf(Array);
                expect(entries).has.length(1);
            });
        });
    });

    describe("Binding", () => {
        describe("Instance", () => {
            test("WHEN binding instance or value to the type", () => {
                // Arrange ----
                var typeKey = "typeKey";
                var expectedValue = 42;
                var builder = createContainerBuilder();

                // Act --------
                var chainingBuilderRef = builder.bindInstance(
                    typeKey,
                    expectedValue,
                );
                var instanceEntry = builder.findEntry(typeKey);

                // Assert -----
                expect(builder.has(typeKey)).is.true;
                expect(chainingBuilderRef).to.equal(builder);

                expect(instanceEntry).instanceOf(Object);
                expect(instanceEntry).to.be.frozen;
                expect(instanceEntry.type).to.equal(typeKey);
                expect(instanceEntry.name).is.undefined;
                expect("instance" in instanceEntry).to.be.true;
                expect(instanceEntry.instance).to.equal(expectedValue);
                expect("factory" in instanceEntry).to.be.false;
                expect(instanceEntry.factory).to.be.undefined;
                expect(instanceEntry.meta).to.be.undefined;
            });

            test("WHEN binding instance to the type with name", () => {
                // Arrange ----
                var typeKey = "typeKey";
                var name = "typeName";
                var expectedValue = 42;
                var builder = createContainerBuilder();

                // Act --------
                builder.bindInstance(typeKey, expectedValue, { name });
                var instanceEntryWithoutName = builder.findEntry(typeKey);
                var instanceEntry = builder.findEntry(typeKey, name);

                // Assert -----
                expect(builder.has(typeKey)).is.false;
                expect(instanceEntryWithoutName).is.undefined;

                expect(builder.has(typeKey, name)).is.true;
                expect(instanceEntry).instanceOf(Object);
                expect(instanceEntry).to.be.frozen;
                expect(instanceEntry.type).to.equal(typeKey);
                expect(instanceEntry.name).to.equal(name);
                expect("instance" in instanceEntry).to.be.true;
                expect(instanceEntry.instance).to.equal(expectedValue);
                expect("factory" in instanceEntry).to.be.false;
                expect(instanceEntry.factory).to.be.undefined;
                expect(instanceEntry.meta).to.be.undefined;
            });

            test("WHEN binding instance to the type with name THAT already bound but without name", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var name = "typeName";
                var builder = createContainerBuilder();
                builder.bindInstance(typeKey, 11);

                // Act -----------
                builder.bindInstance(typeKey, 22, { name });

                var entryWithoutName = builder.findEntry(typeKey);
                var entryWithName = builder.findEntry(typeKey, name);

                // Assert --------
                expect(entryWithName).not.to.be.undefined;
                expect(entryWithName.type).to.equal(typeKey);
                expect(entryWithName.name).to.equal(name);

                expect(entryWithoutName).not.to.be.undefined;
                expect(entryWithoutName.type).to.equal(typeKey);
                expect(entryWithoutName.name).is.undefined;

                expect(entryWithoutName).not.equal(entryWithName);
            });

            test("WHEN: binding instance with meta data", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var typeMeta = { value: 42 };
                var builder = createContainerBuilder();

                // Act -----------
                builder.bindInstance(typeKey, "foo", { meta: typeMeta });

                var entry = builder.findEntry(typeKey);

                // Assert --------
                expect(entry.meta).toBe(typeMeta);
            });

            describe("Conflict", () => {
                test("WHEN strategy 'throw' (default)", () => {
                    // Arrange -------
                    var typeKey = "typeKey";
                    var expectedValue = 11;
                    var builder = createContainerBuilder();
                    builder.bindInstance(typeKey, expectedValue);

                    // Act -----------
                    var err = catchError(() =>
                        builder.bindInstance(typeKey, 22),
                    );

                    var entry = builder.findEntry(typeKey);

                    // Assert --------
                    expect(err).to.not.be.undefined;
                    expect(err.message).to.contains("Binding conflict");
                    expect(err.message).to.contains(typeKey);

                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.instance).to.equal(expectedValue);
                });

                test("WHEN strategy 'keep'", () => {
                    // Arrange -----
                    var typeKey = "typeKey";
                    var expectedValue = 11;
                    var builder = createContainerBuilder();
                    builder.bindInstance(typeKey, expectedValue);

                    // Act ---------
                    builder.bindInstance(typeKey, 22, { ifConflict: "keep" });
                    var entry = builder.findEntry(typeKey);

                    // Assert ------
                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.instance).to.equal(expectedValue);
                });

                test("WHEN strategy 'replace'", () => {
                    // Arrange -----
                    var typeKey = "typeKey";
                    var expectedValue = 11;
                    var builder = createContainerBuilder();
                    builder.bindInstance(typeKey, 22);

                    // Act ---------
                    builder.bindInstance(typeKey, expectedValue, {
                        ifConflict: "replace",
                    });
                    var entry = builder.findEntry(typeKey);

                    // Assert ------
                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.instance).to.equal(expectedValue);
                });

                test("WHEN set default strategy via builder options", () => {
                    // Arrange -----
                    var typeKey = "typeKey";
                    var expectedValue = 11;
                    var builder = createContainerBuilder({
                        ifConflict: "replace",
                    });
                    builder.bindInstance(typeKey, 22);

                    // Act ---------
                    builder.bindInstance(typeKey, expectedValue);
                    var entry = builder.findEntry(typeKey);

                    // Assert ------
                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.instance).to.equal(expectedValue);
                });

                test("WHEN strategy 'append' for first bind", () => {
                    // Arrange --------
                    var typeKey = "typeKey";
                    var builder = createContainerBuilder();

                    // Act ------------
                    builder.bindInstance(typeKey, 42, {
                        ifConflict: "append",
                    });

                    var entry = builder.findEntry(typeKey);
                    var allEntries = builder.findAllEntries(typeKey);

                    // Assert ---------
                    expect(entry).toBeDefined();
                    expect(entry.instance).toBe(42);
                    expect(allEntries).have.length(1);
                    expect(allEntries[0]).toBe(entry);
                });

                test("WHEN strategy 'append' for next bindings", () => {
                    // Arrange --------
                    var typeKey = "typeKey";
                    var values = [11, 22, 33];
                    var builder = createContainerBuilder().bindInstance(
                        typeKey,
                        values[0],
                    );

                    // Act ------------
                    builder.bindInstance(typeKey, values[1], {
                        ifConflict: "append",
                    });
                    builder.bindInstance(typeKey, values[2], {
                        ifConflict: "append",
                    });

                    var allEntries = builder.findAllEntries(typeKey);

                    // Assert ---------
                    expect(allEntries).have.length(values.length);
                    expect(allEntries.map((it) => it.instance)).toEqual(
                        expect.arrayContaining(values),
                    );
                });

                test("WHEN strategy 'replace' after 'append'", () => {
                    // Arrange ----------
                    var typeKey = "typeKey";
                    var builder = createContainerBuilder()
                        .bindInstance(typeKey, 11, { ifConflict: "append" })
                        .bindInstance(typeKey, 22, { ifConflict: "append" });

                    // Act --------------
                    builder.bindInstance(typeKey, 33, {
                        ifConflict: "replace",
                    });

                    var entry = builder.findEntry(typeKey);
                    var allEntries = builder.findAllEntries(typeKey);

                    // Assert -----------
                    expect(entry).toBeDefined();
                    expect(entry.instance).toBe(33);
                    expect(allEntries).have.length(1);
                });

                test("WHEN append to non-singleton factory", () => {
                    // Arrange ------
                    var typeKey = "typeKey";
                    var builder = createContainerBuilder().bindFactory(
                        typeKey,
                        () => 11,
                        { ifConflict: "append", lifecycle: "transient" },
                    );

                    // Act ----------
                    builder.bindInstance(typeKey, 42, { ifConflict: "append" });

                    var entries = builder.findAllEntries(typeKey);

                    // Assert -------
                    // Both entries was bound
                    expect(entries).have.length(2);
                });
            });
        });

        describe("Factory", () => {
            test("WHEN binding simple factory function to the type", () => {
                // Arrange -----
                var typeKey = "typeKey";
                var factoryMockFn = vi.fn();
                var builder = createContainerBuilder();

                // Act ---------
                var chainingBuilderRef = builder.bindFactory(
                    typeKey,
                    factoryMockFn,
                );
                var factoryEntry = builder.findEntry(typeKey);

                // Assert ------
                expect(builder.has(typeKey)).is.true;
                expect(factoryMockFn).not.toHaveBeenCalled();
                expect(chainingBuilderRef).to.equal(builder);

                expect(factoryEntry).instanceOf(Object);
                expect(factoryEntry).to.be.frozen;
                expect(factoryEntry.type).to.equal(typeKey);
                expect(factoryEntry.name).is.undefined;
                expect("factory" in factoryEntry).to.be.true;
                expect(factoryEntry.factory).to.equal(factoryMockFn);
                expect("instance" in factoryEntry).to.be.false;
                expect(factoryEntry.instance).to.be.undefined;
                expect(factoryEntry.meta).to.be.undefined;
            });

            test("WHEN binding simple factory function to the type with name", () => {
                // Arrange -----
                var typeKey = "typeKey";
                var name = "typeName";
                var factoryMockFn = vi.fn();
                var builder = createContainerBuilder();

                // Act ---------
                var chainingBuilderRef = builder.bindFactory(
                    typeKey,
                    factoryMockFn,
                    { name },
                );
                var factoryEntryWithoutName = builder.findEntry(typeKey);
                var factoryEntry = builder.findEntry(typeKey, name);

                // Assert ------
                expect(builder.has(typeKey)).is.false;
                expect(factoryEntryWithoutName).is.undefined;

                expect(builder.has(typeKey, name)).to.be.true;
                expect(factoryMockFn).not.toHaveBeenCalled();
                expect(chainingBuilderRef).to.equal(builder);

                expect(factoryEntry).instanceOf(Object);
                expect(factoryEntry).to.be.frozen;
                expect(factoryEntry.type).to.equal(typeKey);
                expect(factoryEntry.name).to.equal(name);
                expect("factory" in factoryEntry).to.be.true;
                expect(factoryEntry.factory).to.equal(factoryMockFn);
                expect("instance" in factoryEntry).to.be.false;
                expect(factoryEntry.instance).to.be.undefined;
                expect(factoryEntry.meta).to.be.undefined;
            });

            test("WHEN: binding type factory with meta data", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var typeMeta = { value: "foo" };
                var builder = createContainerBuilder();

                // Act ------------
                builder.bindFactory(typeKey, () => 42, { meta: typeMeta });
                var entry = builder.findEntry(typeKey);

                // Assert ---------
                expect(entry.meta).toBe(typeMeta);
            });

            test("WHEN binding type factory to the type with name THAT already bound but without name", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var name = "typeName";
                var builder = createContainerBuilder();
                builder.bindFactory(typeKey, () => {});

                // Act -----------
                builder.bindFactory(typeKey, () => {}, { name });
                var entryWithoutName = builder.findEntry(typeKey);
                var entryWithName = builder.findEntry(typeKey, name);

                // Assert --------
                expect(entryWithoutName).not.to.be.undefined;
                expect(entryWithoutName.type).to.equal(typeKey);
                expect(entryWithoutName.name).is.undefined;

                expect(entryWithName).not.to.be.undefined;
                expect(entryWithName.type).to.equal(typeKey);
                expect(entryWithName.name).to.equal(name);
            });

            describe("Conflict", () => {
                test("WHEN strategy 'throw' (default)", () => {
                    // Arrange -------
                    var typeKey = "typeKey";
                    var expectedFactory = vi.fn();
                    var builder = createContainerBuilder();
                    builder.bindFactory(typeKey, expectedFactory);

                    // Act -----------
                    var err = catchError(() =>
                        builder.bindFactory(typeKey, () => {}),
                    );
                    var entry = builder.findEntry(typeKey);

                    // Assert --------
                    expect(err).to.not.be.undefined;
                    expect(err.message).to.contains("Binding conflict");
                    expect(err.message).to.contains(typeKey);

                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.factory).to.equal(expectedFactory);
                    expect(expectedFactory).not.toHaveBeenCalled();
                });

                test("WHEN strategy 'keep'", () => {
                    // Arrange -----
                    var typeKey = "typeKey";
                    var expectedFactory = vi.fn();
                    var builder = createContainerBuilder();
                    builder.bindFactory(typeKey, expectedFactory);

                    // Act ---------
                    builder.bindFactory(typeKey, () => {}, {
                        ifConflict: "keep",
                    });
                    var entry = builder.findEntry(typeKey);

                    // Assert ------
                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.factory).to.equal(expectedFactory);
                    expect(expectedFactory).not.toHaveBeenCalled();
                });

                test("WHEN strategy 'replace'", () => {
                    // Arrange -----
                    var typeKey = "typeKey";
                    var expectedFactory = vi.fn();
                    var builder = createContainerBuilder();
                    builder.bindFactory(typeKey, () => {});

                    // Act ---------
                    builder.bindFactory(typeKey, expectedFactory, {
                        ifConflict: "replace",
                    });
                    var entry = builder.findEntry(typeKey);

                    // Assert ------
                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.factory).to.equal(expectedFactory);
                    expect(expectedFactory).not.toHaveBeenCalled();
                });

                test("WHEN set default strategy via builder options", () => {
                    // Arrange -------
                    var typeKey = "typeKey";
                    var expectedStrategy = "replace";
                    var expectedFactory = vi.fn();
                    var builder = createContainerBuilder({
                        ifConflict: expectedStrategy,
                    });
                    builder.bindFactory(typeKey, () => {});

                    // Act -----------
                    builder.bindFactory(typeKey, expectedFactory);
                    var entry = builder.findEntry(typeKey);

                    // Assert --------
                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.factory).to.equal(expectedFactory);
                    expect(expectedFactory).not.toHaveBeenCalled();
                });

                test("WHEN strategy 'append' for first bind", () => {
                    // Arrange --------
                    var typeKey = "typeKey";
                    var expectedFactory = () => {};
                    var builder = createContainerBuilder();

                    // Act ------------
                    builder.bindFactory(typeKey, expectedFactory, {
                        ifConflict: "append",
                    });

                    var entry = builder.findEntry(typeKey);
                    var allEntries = builder.findAllEntries(typeKey);

                    // Assert ---------
                    expect(entry).toBeDefined();
                    expect(entry.factory).toBe(expectedFactory);
                    expect(allEntries).have.length(1);
                    expect(allEntries[0]).toBe(entry);
                });

                test("WHEN strategy 'append' for next bindings", () => {
                    // Arrange --------
                    var typeKey = "typeKey";
                    var factories = [() => 11, () => 22, () => 33];
                    var builder = createContainerBuilder().bindFactory(
                        typeKey,
                        factories[0],
                    );

                    // Act ------------
                    builder.bindFactory(typeKey, factories[1], {
                        ifConflict: "append",
                    });
                    builder.bindFactory(typeKey, factories[2], {
                        ifConflict: "append",
                    });

                    var allEntries = builder.findAllEntries(typeKey);

                    // Assert ---------
                    expect(allEntries).have.length(factories.length);
                    expect(allEntries.map((it) => it.factory)).toEqual(
                        expect.arrayContaining(factories),
                    );
                });

                test("WHEN strategy 'replace' after 'append'", () => {
                    // Arrange ----------
                    var typeKey = "typeKey";
                    var expectedFactory = () => {};
                    var builder = createContainerBuilder()
                        .bindFactory(typeKey, () => {}, {
                            ifConflict: "append",
                        })
                        .bindFactory(typeKey, () => {}, {
                            ifConflict: "append",
                        });

                    // Act --------------
                    builder.bindFactory(typeKey, expectedFactory, {
                        ifConflict: "replace",
                    });

                    var entry = builder.findEntry(typeKey);
                    var allEntries = builder.findAllEntries(typeKey);

                    // Assert -----------
                    expect(entry).toBeDefined();
                    expect(entry.factory).toBe(expectedFactory);
                    expect(allEntries).have.length(1);
                    expect(allEntries.map((it) => it.factory)).toContain(
                        expectedFactory,
                    );
                });

                test("WHEN append with different lifecycle to instance", () => {
                    // Arrange ------
                    var typeKey = "typeKey";
                    var builder = createContainerBuilder().bindInstance(
                        typeKey,
                        42,
                        { ifConflict: "append" },
                    );

                    // Act ----------
                    builder.bindFactory(typeKey, () => 11, {
                        lifecycle: "transient",
                        ifConflict: "append",
                    });
                    var entries = builder.findAllEntries(typeKey);

                    // Assert -------
                    // Both entries was bound
                    expect(entries).have.length(2);
                });

                test("WHEN append factories with different lifecycles", () => {
                    // Arrange -----
                    var typeKey = "typeKey";
                    var factoryA = () => 11;
                    var factoryB = () => 22;
                    var builder = createContainerBuilder().bindFactory(
                        typeKey,
                        factoryA,
                    );

                    // Act ---------
                    var error = catchError(() => {
                        builder.bindFactory(typeKey, factoryB, {
                            ifConflict: "append",
                            lifecycle: "transient",
                        });
                    });

                    // Assert ------
                    // 1. Throws error on attempt to bind
                    expect(error).toBeDefined();

                    // 2. Error describes lifecycle conflict
                    expect(error.message).to.equal(
                        DIErrors.MixedLifecycleBindings(
                            typeKey,
                            "singleton",
                            "transient",
                        ),
                    );
                });
            });

            describe("Lifecycle", () => {
                test("WHEN keep default lifecycle", () => {
                    // Arrange --------
                    var typeKey = "typeKey";
                    var builder = createContainerBuilder();

                    // Act ------------
                    builder.bindFactory(typeKey, () => {});
                    var entry = builder.findEntry(typeKey);

                    // Assert ---------
                    expect(entry).toBeDefined();
                    expect(entry.lifecycle).toBe("singleton");
                });

                test("WHEN change default lifecycle via builder options", () => {
                    // Arrange --------
                    var typeKey = "typeKey";
                    var expectedLifecycle = "lazy";
                    var builder = createContainerBuilder({
                        lifecycle: expectedLifecycle,
                    });

                    // Act ------------
                    builder.bindFactory(typeKey, () => {});
                    var entry = builder.findEntry(typeKey);

                    // Assert ---------
                    expect(entry).toBeDefined();
                    expect(entry.lifecycle).toBe(expectedLifecycle);
                });

                test("WHEN set lifecycle via binding options", () => {
                    // Arrange -------
                    var typeKey = "typeKey";
                    var expectedLifecycle = "transient";
                    var builder = createContainerBuilder();

                    // Act -----------
                    builder.bindFactory(typeKey, () => {}, {
                        lifecycle: expectedLifecycle,
                    });
                    var entry = builder.findEntry(typeKey);

                    // Assert --------
                    expect(entry).toBeDefined();
                    expect(entry.lifecycle).toBe(expectedLifecycle);
                });
            });
        });

        describe("Safe factory", () => {
            test("WHEN: bind simple safe factory to the type", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var depKey = "depKey";
                var builder = createContainerBuilder().bindInstance(depKey, 42);

                var injectorFn = vi.fn((r) => r.get(depKey));
                var factoryFn = vi.fn((d) => d + 10);

                // Act -----------
                var chainingBuilderRef = builder.bindSafeFactory(
                    typeKey,
                    injectorFn,
                    factoryFn,
                );

                var safeFactoryEntry = builder.findEntry(typeKey);

                // Assert --------
                // 1. The type should be registered
                expect(builder.has(typeKey)).is.true;

                // 2. Neither injector nor factory should be called during binding
                expect(injectorFn).not.toHaveBeenCalled();
                expect(factoryFn).not.toHaveBeenCalled();

                // 3. The chaining reference should return the same builder
                expect(chainingBuilderRef).to.equal(builder);

                // Entry should be a frozen object with correct structure
                expect(safeFactoryEntry).toBeInstanceOf(Object);
                expect(safeFactoryEntry).is.frozen;
                expect(safeFactoryEntry.type).to.equal(typeKey);
                expect(safeFactoryEntry.name).is.undefined;

                expect("factory" in safeFactoryEntry).is.true;
                expect(safeFactoryEntry.factory).to.equal(factoryFn);

                expect("injector" in safeFactoryEntry).is.true;
                expect(safeFactoryEntry.injector).to.equal(injectorFn);

                expect("instance" in safeFactoryEntry).is.false;
                expect(safeFactoryEntry.instance).is.undefined;
                expect(safeFactoryEntry.meta).is.undefined;
            });

            test("WHEN binding simple safe factory to the type with name", () => {
                // Arrange -----
                var typeKey = "typeKey";
                var name = "typeName";
                var injectorMockFn = vi.fn();
                var factoryMockFn = vi.fn();
                var builder = createContainerBuilder();

                // Act ---------
                var chainingBuilderRef = builder.bindSafeFactory(
                    typeKey,
                    injectorMockFn,
                    factoryMockFn,
                    { name },
                );
                var factoryEntryWithoutName = builder.findEntry(typeKey);
                var safeFactoryEntry = builder.findEntry(typeKey, name);

                // Assert ------
                expect(builder.has(typeKey)).is.false;
                expect(factoryEntryWithoutName).is.undefined;

                expect(builder.has(typeKey, name)).to.be.true;
                expect(injectorMockFn).not.toHaveBeenCalled();
                expect(factoryMockFn).not.toHaveBeenCalled();
                expect(chainingBuilderRef).to.equal(builder);

                expect(safeFactoryEntry).instanceOf(Object);
                expect(safeFactoryEntry).to.be.frozen;
                expect(safeFactoryEntry.type).to.equal(typeKey);
                expect(safeFactoryEntry.name).to.equal(name);
                expect("factory" in safeFactoryEntry).to.be.true;
                expect(safeFactoryEntry.factory).to.equal(factoryMockFn);
                expect("instance" in safeFactoryEntry).to.be.false;
                expect(safeFactoryEntry.instance).to.be.undefined;
                expect(safeFactoryEntry.meta).is.undefined;
            });

            test("WHEN: binding safe factory with meta data", () => {
                {
                    // Arrange ---------
                    var typeKey = "typeKey";
                    var typeMeta = { foo: 11 };
                    var builder = createContainerBuilder();

                    // Act -------------
                    builder.bindSafeFactory(
                        typeKey,
                        () => {},
                        () => 42,
                        { meta: typeMeta },
                    );
                    var entry = builder.findEntry(typeKey);

                    // Assert ----------
                    expect(entry.meta).toBe(typeMeta);
                }
            });

            describe("Conflict", () => {
                test("WHEN strategy 'throw' (default)", () => {
                    // Arrange -------
                    var typeKey = "typeKey";
                    var expectedInjector = vi.fn();
                    var expectedFactory = vi.fn();
                    var builder = createContainerBuilder();
                    builder.bindSafeFactory(
                        typeKey,
                        expectedInjector,
                        expectedFactory,
                    );

                    // Act -----------
                    var err = catchError(() =>
                        builder.bindSafeFactory(
                            typeKey,
                            () => {},
                            () => {},
                        ),
                    );
                    var entry = builder.findEntry(typeKey);

                    // Assert --------
                    expect(err).to.not.be.undefined;
                    expect(err.message).to.contains("Binding conflict");
                    expect(err.message).to.contains(typeKey);

                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.factory).to.equal(expectedFactory);
                    expect(entry.injector).to.equal(expectedInjector);
                    expect(expectedInjector).not.toHaveBeenCalled();
                    expect(expectedFactory).not.toHaveBeenCalled();
                });

                test("WHEN strategy 'keep'", () => {
                    // Arrange -----
                    var typeKey = "typeKey";
                    var expectedFactory = vi.fn();
                    var expectedInjector = vi.fn();
                    var builder = createContainerBuilder();
                    builder.bindSafeFactory(
                        typeKey,
                        expectedInjector,
                        expectedFactory,
                    );

                    // Act ---------
                    builder.bindSafeFactory(
                        typeKey,
                        () => {},
                        () => {},
                        {
                            ifConflict: "keep",
                        },
                    );
                    var entry = builder.findEntry(typeKey);

                    // Assert ------
                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.factory).to.equal(expectedFactory);
                    expect(entry.injector).to.equal(expectedInjector);
                    expect(expectedInjector).not.toHaveBeenCalled();
                    expect(expectedFactory).not.toHaveBeenCalled();
                });

                test("WHEN strategy 'replace'", () => {
                    // Arrange -----
                    var typeKey = "typeKey";
                    var expectedFactory = vi.fn();
                    var expectedInjector = vi.fn();
                    var builder = createContainerBuilder();
                    builder.bindSafeFactory(
                        typeKey,
                        () => {},
                        () => {},
                    );

                    // Act ---------
                    builder.bindSafeFactory(
                        typeKey,
                        expectedInjector,
                        expectedFactory,
                        {
                            ifConflict: "replace",
                        },
                    );
                    var entry = builder.findEntry(typeKey);

                    // Assert ------
                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.factory).to.equal(expectedFactory);
                    expect(expectedInjector).not.toHaveBeenCalled();
                    expect(expectedFactory).not.toHaveBeenCalled();
                });

                test("WHEN set default strategy via builder options", () => {
                    // Arrange -------
                    var typeKey = "typeKey";
                    var expectedStrategy = "replace";
                    var expectedInjector = vi.fn();
                    var expectedFactory = vi.fn();
                    var builder = createContainerBuilder({
                        ifConflict: expectedStrategy,
                    });
                    builder.bindSafeFactory(
                        typeKey,
                        () => {},
                        () => {},
                    );

                    // Act -----------
                    builder.bindSafeFactory(
                        typeKey,
                        expectedInjector,
                        expectedFactory,
                    );
                    var entry = builder.findEntry(typeKey);

                    // Assert --------
                    expect(entry).not.to.be.undefined;
                    expect(entry.type).to.equal(typeKey);
                    expect(entry.factory).to.equal(expectedFactory);
                    expect(entry.injector).to.equal(expectedInjector);
                    expect(expectedFactory).not.toHaveBeenCalled();
                    expect(expectedInjector).not.toHaveBeenCalled();
                });
            });
        });

        describe("Alias", () => {
            test("WHEN bind alias for type", () => {
                // Arrange ---------
                var typeKey = "typeKey";
                var aliasKey = "aliasKey";
                var builder = createContainerBuilder();
                builder.bindInstance(typeKey, "value");

                // Act -------------
                builder.bindAlias(aliasKey, typeKey);

                var hasAliasEntry = builder.has(aliasKey);
                var aliasOrigin = builder.getAliasOrigin(aliasKey);

                // Assert ----------
                expect(hasAliasEntry).is.true;
                expect(aliasKey).toBeDefined();
                expect(aliasOrigin).toBe(typeKey);
            });

            test("WHEN bind alias with name for type", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var aliasKey = "aliasKey";
                var aliasName = "aliasName";
                var builder = createContainerBuilder();
                builder.bindInstance(typeKey, "value");

                // Act ------------
                builder.bindAlias(aliasKey, typeKey, { name: aliasName });

                var hasAliasEntryWithoutName = builder.has(aliasKey);
                var hasAliasEntryWithName = builder.has(aliasKey, aliasName);

                var aliasOriginWithoutName = builder.getAliasOrigin(aliasKey);
                var aliasOriginWithName = builder.getAliasOrigin(
                    aliasKey,
                    aliasName,
                );

                var originEntry = builder.findEntry(typeKey);

                // Assert ---------
                expect(hasAliasEntryWithoutName).is.false;
                expect(hasAliasEntryWithName).is.true;

                expect(originEntry).toBeDefined();
                expect(aliasOriginWithoutName).is.undefined;
                expect(aliasOriginWithName).toBe(originEntry.$id);
            });

            test("WHEN bind alias for type with name", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var aliasKey = "aliasKey";
                var builder = createContainerBuilder();
                builder.bindInstance(typeKey, "value", { name: typeName });

                // Act ------------
                builder.bindAlias(aliasKey, typeKey, { originName: typeName });

                var hasAliasEntry = builder.has(aliasKey);
                var originEntry = builder.findEntry(typeKey, typeName);
                var aliasOrigin = builder.getAliasOrigin(aliasKey);

                // Assert ---------
                expect(hasAliasEntry).is.true;
                expect(originEntry).toBeDefined();
                expect(aliasOrigin).toBe(originEntry.$id);
            });

            test("WHEN bind alias with name for type with name", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var aliasKey = "aliasKey";
                var aliasName = "aliasName";
                var builder = createContainerBuilder();
                builder.bindInstance(typeKey, "value", { name: typeName });

                // Act ------------
                builder.bindAlias(aliasKey, typeKey, {
                    name: aliasName,
                    originName: typeName,
                });

                var hasAliasEntryWithoutName = builder.has(aliasKey);
                var hasAliasEntryWithName = builder.has(aliasKey, aliasName);

                var aliasOriginWithoutName = builder.getAliasOrigin(aliasKey);
                var aliasOriginWithName = builder.getAliasOrigin(
                    aliasKey,
                    aliasName,
                );

                var originEntry = builder.findEntry(typeKey, typeName);

                // Assert ---------
                expect(hasAliasEntryWithoutName).is.false;
                expect(hasAliasEntryWithName).is.true;

                expect(originEntry).toBeDefined();
                expect(aliasOriginWithoutName).is.undefined;
                expect(aliasOriginWithName).toBe(originEntry.$id);
            });

            test("WHEN bind alias to another alias", () => {
                // Arrange ---------
                var originType = "typeKey";
                var firstAliasKey = "firstAliasKey";
                var secondAliasKey = "secondAliasKey";

                var builder = createContainerBuilder()
                    .bindInstance(originType, "value")
                    .bindAlias(firstAliasKey, originType);

                // Act -------------
                builder.bindAlias(secondAliasKey, firstAliasKey);

                var hasFirstAliasEntry = builder.has(firstAliasKey);
                var hasSecondAliasEntry = builder.has(secondAliasKey);

                var originEntry = builder.findEntry(originType);
                var firstAliasOrigin = builder.getAliasOrigin(firstAliasKey);
                var secondAliasOrigin = builder.getAliasOrigin(secondAliasKey);

                // Assert ----------
                expect(hasFirstAliasEntry).is.true;
                expect(hasSecondAliasEntry).is.true;
                expect(originEntry).toBeDefined();
                expect(firstAliasOrigin).toBe(originEntry.$id);
                expect(secondAliasOrigin).toBe(firstAliasKey);
            });

            test("WHEN: bind alias to multiple entries", () => {
                // Arrange ------
                var typeA = "typeA";
                var typeB = "typeB";
                var aliasKey = "aliasKey";

                var builder = createContainerBuilder()
                    .bindInstance(typeA, 11)
                    .bindInstance(typeB, 22)
                    .bindAlias(aliasKey, typeA, { ifConflict: "append" })
                    .bindAlias(aliasKey, typeB, { ifConflict: "append" });

                // Act ----------
                var aliasOrigin = builder.getAliasOrigin(aliasKey);

                // Assert ------
                expect(aliasOrigin).toBeInstanceOf(Array);
                expect(aliasOrigin).toEqual(
                    expect.arrayContaining([typeA, typeB]),
                );
            });

            describe("Conflict", () => {
                test("WHEN strategy 'throw' (default)", () => {
                    // Arrange -------
                    var typeKey = "typeKey";
                    var aliasKey = "aliasKey";
                    var expectedValue = 11;
                    var builder = createContainerBuilder()
                        .bindInstance(typeKey, expectedValue)
                        .bindAlias(aliasKey, typeKey);

                    // Act -----------
                    var err = catchError(() =>
                        builder.bindAlias(aliasKey, "foo"),
                    );

                    var aliasRef = builder.getAliasOrigin(aliasKey);

                    // Assert --------
                    expect(err).to.not.be.undefined;
                    expect(err.message).to.equal(
                        DIErrors.BindingConflict(aliasKey),
                    );
                    expect(aliasRef).to.equal(typeKey);
                });

                test("WHEN strategy 'keep'", () => {
                    // Arrange -----
                    var typeKey = "typeKey";
                    var aliasKey = "aliasKey";
                    var expectedValue = 11;
                    var builder = createContainerBuilder()
                        .bindInstance(typeKey, expectedValue)
                        .bindAlias(aliasKey, typeKey);

                    // Act ---------
                    builder.bindAlias(aliasKey, "asd", { ifConflict: "keep" });
                    var aliasRef = builder.getAliasOrigin(aliasKey);

                    // Assert ------
                    expect(aliasRef).to.equal(typeKey);
                });

                test("WHEN strategy 'replace'", () => {
                    // Arrange -----
                    var typeKey = "typeKey";
                    var aliasKey = "aliasKey";
                    var builder = createContainerBuilder()
                        .bindInstance(typeKey, 22)
                        .bindAlias(aliasKey, "foo");

                    // Act ---------
                    builder.bindAlias(aliasKey, typeKey, {
                        ifConflict: "replace",
                    });
                    var aliasRef = builder.getAliasOrigin(aliasKey);

                    // Assert ------
                    expect(aliasRef).to.equal(typeKey);
                });

                test("WHEN set default strategy via builder options", () => {
                    // Arrange -----
                    var typeKey = "typeKey";
                    var aliasKey = "aliasKey";
                    var builder = createContainerBuilder({
                        ifConflict: "replace",
                    })
                        .bindInstance(typeKey, 22)
                        .bindAlias(aliasKey, "foo");

                    // Act ---------
                    builder.bindAlias(aliasKey, typeKey);
                    var aliasRef = builder.getAliasOrigin(aliasKey);

                    // Assert ------
                    expect(aliasRef).to.equal(typeKey);
                });
            });
        });

        describe("Conditional", () => {
            test.each([true, false])(
                "WHEN binding condition is '%s'",
                (condition) => {
                    // Arrange ----------
                    var aliasKey = "aliasKey";
                    var instanceKey = "instanceKey";
                    var factoryKey = "factoryKey";
                    var builder = createContainerBuilder();

                    // Act --------------
                    builder.when(condition, (binder) =>
                        binder
                            .bindInstance(instanceKey, 42)
                            .bindFactory(factoryKey, () => {})
                            .bindAlias(aliasKey, instanceKey),
                    );

                    // Assert -----------
                    expect(builder.has(aliasKey), "alias bound").toBe(
                        condition,
                    );
                    expect(builder.has(instanceKey), "instance bound").toBe(
                        condition,
                    );
                    expect(builder.has(factoryKey), "factory bound").toBe(
                        condition,
                    );
                },
            );
        });
    });

    describe("Modules", () => {
        test("WHEN: Include static module", () => {
            // Arrange --------
            var instType = "instType";
            var factoryType = "factoryType";
            var safeFactoryType = "safeFactoryType";
            var aliasKey = "alias";
            var sModule = staticModule("test").create((binder) =>
                binder
                    .bindInstance(instType, 42)
                    .bindFactory(factoryType, () => "foo")
                    .bindSafeFactory(
                        safeFactoryType,
                        (r) => r.get(instType),
                        (d) => ({ value: d }),
                    )
                    .bindAlias(aliasKey, factoryType),
            );

            // Act ------------
            var builder = createContainerBuilder().include(sModule);

            var instTypeEntry = builder.findEntry(instType);
            var factoryTypeEntry = builder.findEntry(factoryType);
            var safeFactoryEntry = builder.findEntry(safeFactoryType);

            // Assert ---------
            expect(builder.hasModule(sModule)).is.true;
            expect(instTypeEntry).toBeDefined();
            expect(instTypeEntry.module).toEqual(sModule);
            expect(factoryTypeEntry).toBeDefined();
            expect(factoryTypeEntry.module).toEqual(sModule);
            expect(safeFactoryEntry).toBeDefined();
            expect(safeFactoryEntry.module).toEqual(sModule);
            expect(builder.has(aliasKey)).is.true;
        });

        test("WHEN: Include static module twice", () => {
            // Arrange --------
            var instType = "instType";
            var factoryType = "factoryType";
            var safeFactoryType = "safeFactoryType";
            var aliasKey = "alias";
            var sModule = staticModule("test").create((binder) =>
                binder
                    .bindInstance(instType, 42)
                    .bindFactory(factoryType, () => "foo")
                    .bindSafeFactory(
                        safeFactoryType,
                        (r) => r.get(instType),
                        (d) => ({ value: d }),
                    )
                    .bindAlias(aliasKey, factoryType),
            );

            var builder = createContainerBuilder().include(sModule);

            // Act ------------
            builder.include(sModule);

            // Assert ---------
            // Should not to throw error cause binding conflict
            // cause module includes only once to the builder
            expect(builder.hasModule(sModule)).is.true;
            expect(builder.has(instType)).is.true;
            expect(builder.has(factoryType)).is.true;
            expect(builder.has(safeFactoryType)).is.true;
            expect(builder.has(aliasKey)).is.true;
        });

        test("WHEN: Include one static module into another", () => {
            // Arrange ------
            var typeKeyA = "typeKeyA";
            var typeKeyB = "typeKeyB";

            var moduleA = staticModule("A").create((binder) => {
                binder.bindInstance(typeKeyA, 11);
            });

            var moduleB = staticModule("B").create((binder) => {
                binder.include(moduleA).bindInstance(typeKeyB, 22);
            });

            var builder = createContainerBuilder().include(moduleB);

            // Act ----------
            var typeA = builder.findEntry(typeKeyA);
            var typeB = builder.findEntry(typeKeyB);

            // Assert -------
            expect(builder.hasModule(moduleA)).is.true;
            expect(builder.hasModule(moduleB)).is.true;
            expect(typeA.module).toBe(moduleA);
            expect(typeB.module).toBe(moduleB);
        });
    });

    describe("Middleware", () => {
        describe("Add middleware", () => {
            test("WHEN add middleware to builder", () => {
                // Arrange --------
                var builder = createContainerBuilder();
                var middleware = {}; // Yup, empty middlewares are allowed

                // Act ------------
                builder.use(middleware);

                var middlewareWasAdded = builder.hasMiddleware(middleware);

                // Assert ---------
                expect(middlewareWasAdded).is.true;
            });

            test("WHEN check middleware not added", () => {
                // Arrange ---------
                var builder = createContainerBuilder();

                // Act -------------
                var middlewareWasAdded = builder.hasMiddleware({});

                // Assert ----------
                expect(middlewareWasAdded).is.false;
            });

            test("WHEN: add and has onUse hook", () => {
                // Arrange ---------
                var builder = createContainerBuilder();

                var onUseHandler = vi.fn();
                var middleware = { onUse: onUseHandler };

                // Act -------------
                builder.use(middleware);
                var wasAdded = builder.hasMiddleware(middleware);

                // Assert ----------
                expect(wasAdded).is.true;
                expect(onUseHandler).toHaveBeenCalledExactlyOnceWith(builder);
            });
        });

        describe("onBind hook", () => {
            test("WHEN bind instance", () => {
                // Arrange ------------
                var typeKey = "typeKey";
                var onBindMock = vi.fn((entry) => entry);
                var builder = createContainerBuilder().use({
                    onBind: onBindMock,
                });

                // Act ----------------
                builder.bindInstance(typeKey, 42);

                var entry = builder.findEntry(typeKey);

                // Assert -------------
                expect(entry).toBeDefined();
                expect(onBindMock).toHaveBeenCalledWith(entry, entry);
            });

            test("WHEN bind factory", () => {
                // Arrange ------------
                var typeKey = "typeKey";
                var onBindMock = vi.fn((entry) => entry);
                var builder = createContainerBuilder().use({
                    onBind: onBindMock,
                });

                // Act ----------------
                builder.bindFactory(typeKey, () => {});

                var entry = builder.findEntry(typeKey);

                // Assert -------------
                expect(entry).toBeDefined();
                expect(onBindMock).toHaveBeenCalledWith(entry, entry);
            });

            test("WHEN modify entry with onBind one middleware", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var onBindMock = vi.fn((entry) => ({
                    ...entry,
                    instance: expectedValue,
                }));
                var builder = createContainerBuilder().use({
                    onBind: onBindMock,
                });

                // Act -----------
                builder.bindInstance(typeKey, 0);

                var entry = builder.findEntry(typeKey);
                var entries = builder.findAllEntries(typeKey);

                // Assert --------
                // 1. onBind hook was called on type instance bind
                expect(onBindMock).toHaveBeenCalled();

                // 2. Type instance binding was override by onBind
                expect(entry).toBeDefined();
                expect(entry.instance).toBe(expectedValue);
                expect(entries).has.length(1); // It's not multibinding
                expect(entries[0]).toBe(entry);
            });

            test("WHEN modify entry with onBind many middlewares", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var value = 3;
                var expectedValue = value * 5 + 10;
                var onBindMockA = vi.fn((entry) => ({
                    ...entry,
                    instance: entry.instance * 5,
                }));
                var onBindMockB = vi.fn((entry) => ({
                    ...entry,
                    instance: entry.instance + 10,
                }));

                var builder = createContainerBuilder()
                    .use({ onBind: onBindMockA })
                    .use({ onBind: onBindMockB });

                // Act ----------
                builder.bindInstance(typeKey, value);

                var entry = builder.findEntry(typeKey);
                var entries = builder.findAllEntries(typeKey);

                // Assert -------
                // 1. All onBind hooks were called on type instance bind
                expect(onBindMockA).toHaveBeenCalled();
                expect(onBindMockB).toHaveBeenCalled();

                // 2. Type instance binding was override by onBind
                expect(entry).toBeDefined();
                expect(entry.instance).toBe(expectedValue);
                expect(entries).has.length(1); // It's not multibinding
                expect(entries[0]).toBe(entry);
            });

            test("WHEN try to change entry id", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var newTypeKey = "newTypeKey";
                var middlewareName = "bindMiddleware";
                var builder = createContainerBuilder().use({
                    name: middlewareName,
                    onBind: (entry) => ({
                        ...entry,
                        $id: newTypeKey,
                    }),
                });

                // Act -----------
                var error = catchError(() => builder.bindInstance(typeKey));

                // Assert --------
                expect(error).toBeDefined();
                expect(error.message).to.equal(
                    DIErrors.MiddlewareEntryTypeMismatch(
                        middlewareName,
                        newTypeKey,
                        typeKey,
                    ),
                );
            });

            test("WHEN try to return not a type entry object", () => {
                // Arrange ---------
                var typeKey = "typeKey";
                var middlewareName = "bindMiddleware";
                var builder = createContainerBuilder().use({
                    name: middlewareName,
                    onBind: () => ({ type: typeKey }),
                });

                // Act -------------
                var error = catchError(() => builder.bindInstance(typeKey, 1));

                // Assert ----------
                expect(error).toBeDefined();
                expect(error.message).to.equal(
                    DIErrors.MiddlewareEntryTypeMismatch(
                        middlewareName,
                        undefined,
                        typeKey,
                    ),
                );
            });

            test("WHEN try to return undefined or null object", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var builder = createContainerBuilder().use({
                    onBind: () => {}, // Oh no, type entry return was forgotten :(
                });

                // Act -----------
                var error = catchError(() => {
                    builder.bindInstance(typeKey, 11);
                });

                // Assert --------
                expect(error).toBeDefined();
                expect(error.message).to.equal(
                    DIErrors.MiddlewareEntryTypeMismatch(
                        "unnamed",
                        undefined,
                        typeKey,
                    ),
                );
            });

            test("WHEN bind instance before middleware add", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var onBindMock = vi.fn((entry) => ({ ...entry, instance: 0 }));
                var builder = createContainerBuilder();

                // Act ------------
                builder
                    .bindInstance(typeKey, expectedValue)
                    .use({ onBind: onBindMock });

                var entry = builder.findEntry(typeKey);

                // Assert ---------
                // 1. Middleware was not called
                expect(onBindMock).not.toHaveBeenCalled();
                // 2. Entry was not changed
                expect(entry).toBeDefined();
                expect(entry.instance).toBe(expectedValue);
            });

            test("WHEN middleware without onBind hook", () => {
                // Arrange ----------
                var builder = createContainerBuilder().use({});

                // Act --------------
                builder
                    .bindInstance("instanceKey", 42)
                    .bindFactory("factoryKey", () => {});

                var instanceEntry = builder.findEntry("instanceKey");
                var factoryEntry = builder.findEntry("factoryKey");

                // Assert -----------
                // It's ok. Middleware will be ignored when bind instance or factory
                expect(instanceEntry).toBeDefined();
                expect(factoryEntry).toBeDefined();
            });
        });
    });

    describe("Building container", () => {
        test("WHEN build", () => {
            // Arrange --------
            var builder = createContainerBuilder();

            // Act ---------
            var container = builder.build();

            // Assert -----
            expect(container).toBeInstanceOf(Object);
            expect(container).is.frozen;
            expect(container.id).toEqual("");
            expect(container.path).is.empty;
            expect(container.isDisposed).is.false;
        });

        describe("Aliases building", () => {
            describe("Verify alias origin type exist", () => {
                test("WHEN alias origin type is exists", () => {
                    // Arrange -------
                    var builder = createContainerBuilder()
                        .bindInstance("typeKey", 42)
                        .bindAlias("aliasKey", "typeKey");

                    // Act -----------
                    var error = catchError(() => {
                        builder.build();
                    });

                    // Assert --------
                    expect(error).is.undefined;
                });

                test("WHEN alias origin type is not exists", () => {
                    // Arrange ------
                    var typeKey = "typeKey";
                    var aliasKey = "aliasKey";
                    var builder = createContainerBuilder().bindAlias(
                        aliasKey,
                        typeKey,
                    );

                    // Act ----------
                    var error = catchError(() => {
                        builder.build();
                    });

                    // Assert ------
                    expect(error).toBeDefined();
                    expect(error.message).is.equal(
                        DIErrors.AliasMissingRef(aliasKey, typeKey),
                    );
                });
            });

            describe("Alias reference optimization", () => {
                test("WHEN: Alias ref to instance entry", () => {
                    // Arrange ------
                    var typeKey = "typeKey";
                    var aliasKey = "aliasKey";

                    var builder = createContainerBuilder()
                        .bindInstance(typeKey, { num: 42 })
                        .bindAlias(aliasKey, typeKey);

                    // Act ----------
                    var container = builder.build();

                    var valueAlias = container.get(aliasKey);
                    var valueType = container.get(aliasKey);

                    // Assert -------
                    // Should be the same object reference
                    expect(valueAlias).toBe(valueType);
                });

                test("WHEN: Alias ref to multi instance entry", () => {
                    // Arrange ------
                    var typeKey = "typeKey";
                    var aliasKey = "aliasKey";

                    var builder = createContainerBuilder()
                        .bindInstance(typeKey, 11, { ifConflict: "append" })
                        .bindInstance(typeKey, 22, { ifConflict: "append" })
                        .bindAlias(aliasKey, typeKey);

                    // Act ----------
                    var container = builder.build();

                    var aliasFirstValue = container.get(aliasKey);
                    var aliasValues = container.getAll(aliasKey);
                    var typeFirstValue = container.get(typeKey);
                    var typeValues = container.getAll(typeKey);

                    // Assert -------
                    expect(aliasFirstValue).toBe(typeFirstValue);
                    expect(aliasValues).toEqual(typeValues);
                });

                test("WHEN: Alias ref to factory entry", () => {
                    // Arrange -------
                    var aliasKey = "aliasKey";
                    var typeKey = "typeKey";

                    var factory = vi.fn(() => ({ str: "foo" }));

                    var builder = createContainerBuilder()
                        .bindFactory(typeKey, factory, { lifecycle: "lazy" })
                        .bindAlias(aliasKey, typeKey);

                    // Act -----------
                    var container = builder.build();

                    var aliasValue = container.get(aliasKey);
                    var typeValue = container.get(typeKey);

                    // Assert --------
                    // 1. Should resolve the same value
                    expect(aliasValue).toBe(typeValue);

                    // 2. Should call factory only once
                    expect(factory).toHaveBeenCalledOnce();
                });

                test("WHEN: Alias reference to it self", () => {
                    // Arrange ------
                    var aliasKey = "aliasKey";
                    var builder = createContainerBuilder().bindAlias(
                        aliasKey,
                        aliasKey,
                    );

                    // Act ----------
                    var error = catchError(() => {
                        builder.build();
                    });

                    // Assert -------
                    // 1. Should throw error
                    expect(error).toBeDefined();

                    // 2.Error message should contain alias cycle error
                    //   with reference chain
                    expect(error.message).to.eq(
                        DIErrors.AliasCycle(aliasKey, [aliasKey, aliasKey]),
                    );
                });

                test("WHEN: Alias binding has cycle", () => {
                    // Arrange ------
                    var builder = createContainerBuilder()
                        .bindAlias("A", "B")
                        .bindAlias("B", "C")
                        .bindAlias("C", "D")
                        .bindAlias("D", "A");

                    // Act ----------
                    var error = catchError(() => {
                        builder.build();
                    });

                    // Assert -------
                    expect(error).toBeDefined();
                    expect(error.message).toEqual(
                        DIErrors.AliasCycle("A", ["A", "B", "C", "D", "A"]),
                    );
                });

                test("WHEN: Alias reference non-exist binding", () => {
                    // Arrange -------
                    var builder = createContainerBuilder()
                        .bindAlias("aliasA", "aliasB")
                        .bindAlias("aliasB", "nonExist");

                    // Act -----------
                    var error = catchError(() => {
                        builder.build();
                    });

                    // Assert --------
                    expect(error).toBeDefined();
                    expect(error.message).toEqual(
                        DIErrors.AliasMissingRef("aliasB", "nonExist"),
                    );
                });

                test("WHEN: Alias reference through another alias", () => {
                    // Arrange -------
                    var typeKey = "typeKey";
                    var aliasKeyA = "aliasKeyA";
                    var aliasKeyB = "aliasKeyB";
                    var aliasKeyC = "aliasKeyC";

                    var builder = createContainerBuilder()
                        .bindAlias(aliasKeyA, aliasKeyB)
                        .bindAlias(aliasKeyB, aliasKeyC)
                        .bindAlias(aliasKeyC, typeKey)
                        .bindInstance(typeKey, 42);

                    // Act -----------
                    var container = builder.build();

                    var aliasValueA = container.get(aliasKeyA);
                    var aliasValueB = container.get(aliasKeyB);
                    var aliasValueC = container.get(aliasKeyC);
                    var value = container.get(typeKey);

                    // Assert --------
                    expect(aliasValueA).toBe(value);
                    expect(aliasValueB).toBe(value);
                    expect(aliasValueC).toBe(value);
                });
            });
        });

        describe("Type binding requirement", () => {
            test("WHEN type required but not bound", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var builder = createContainerBuilder().requireType(typeKey);

                // Act ------------
                var error = catchError(() => {
                    builder.build();
                });

                // Assert ----------
                expect(error).toBeDefined();
                expect(error.message).to.equal(
                    DIErrors.MissingRequiredTypeError(typeKey),
                );
            });

            test("WHEN type with name required but not bound", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var builder = createContainerBuilder()
                    .requireType(typeKey, typeName)
                    .bindInstance(typeKey, 42);

                // Act ------------
                var error = catchError(() => {
                    builder.build();
                });

                // Assert ---------
                expect(error).toBeDefined();
                expect(error.message).to.equal(
                    DIErrors.MissingRequiredTypeError(typeKey + "$" + typeName),
                );
            });

            test("WHEN required type bound", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var builder = createContainerBuilder()
                    .requireType(typeKey)
                    .bindInstance(typeKey, 42);

                // Act ------------
                builder.build();
                var entry = builder.findEntry(typeKey);

                // Assert ---------
                // No error thrown, type entry exists
                expect(entry).toBeDefined();
            });

            test("WHEN required type with name bound", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var builder = createContainerBuilder()
                    .requireType(typeKey, typeName)
                    .bindInstance(typeKey, 42, { name: typeName });

                // Act ------------
                builder.build();
                var entry = builder.findEntry(typeKey, typeName);

                // Assert ---------
                // No error thrown, type entry exits
                expect(entry).toBeDefined();
            });

            test("WHEN required type bound as alias", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var aliasKey = "aliasKey";
                var builder = createContainerBuilder()
                    .requireType(aliasKey)
                    .bindInstance(typeKey, 42)
                    .bindAlias(aliasKey, typeKey);

                // Act -----------
                builder.build();
                var entry = builder.findEntry(typeKey);

                // Assert --------
                expect(entry).toBeDefined();
            });
        });

        describe("Safe factories check", () => {
            test("WHEN: Safe factory meets requirements", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var depKey = "depKey";

                var resolverMock = vi.fn((r) => {
                    return { dep: r.get(depKey) };
                });
                var factoryMock = vi.fn();

                var builder = createContainerBuilder()
                    .bindSafeFactory(typeKey, resolverMock, factoryMock)
                    .bindInstance(depKey, 42);

                // Act ----------
                var error = catchError(() => {
                    builder.build();
                });

                // Assert -------
                // 1. Should not throw, since all required dependencies are present
                expect(error).is.undefined;

                // 2. Resolver should be called twice:
                //    - First: dependencies check
                //    - Second: resolve dependencies for singleton
                expect(resolverMock).toHaveBeenCalledTimes(2);

                // 3. Factory should be called immediately during build
                expect(factoryMock).toHaveBeenCalledTimes(1);
            });

            test("WHEN: Safe factory can't get required dependency", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var depKey = "depKey";

                var resolverMock = vi.fn((r) => ({ dep: r.get(depKey) }));
                var factoryMock = vi.fn();

                var builder = createContainerBuilder().bindSafeFactory(
                    typeKey,
                    resolverMock,
                    factoryMock,
                );

                // Act ----------
                var error = catchError(() => {
                    builder.build();
                });

                // Assert -------
                // 1. Should throw a MissingRequiredTypeError for the missing dependency
                expect(error).toBeDefined();
                expect(error.message).toEqual(
                    DIErrors.MissingRequiredTypeError(depKey),
                );

                // 2. Resolver should be called during build
                expect(resolverMock).toHaveBeenCalledTimes(1);

                // 3. Factory should not be called since resolution failed (singleton)
                expect(factoryMock).not.toHaveBeenCalled();
            });

            test("WHEN: Safe factory with unresolved optional dependency", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var depKey = "depKey";

                var resolverMock = vi.fn((r) => ({
                    dep: r.maybe(depKey),
                    arr: r.getAll(),
                }));
                var factoryMock = vi.fn();

                var builder = createContainerBuilder().bindSafeFactory(
                    typeKey,
                    resolverMock,
                    factoryMock,
                );

                // Act ----------
                var error = catchError(() => {
                    builder.build();
                });

                // Assert -------
                // 1. Should not throw, since optional dependency not required
                expect(error).is.undefined;

                // 2. Resolver should be called twice:
                //    - First: dependencies check
                //    - Second: resolve dependencies for singleton
                expect(resolverMock).toHaveBeenCalledTimes(2);

                // 3. Factory should be called immediately during build
                expect(factoryMock).toHaveBeenCalledTimes(1);
            });
        });

        describe("Inject into external service", () => {
            test("WHEN: Register injection delegate", () => {
                // Arrange ------
                var delegate = vi.fn();
                var builder = createContainerBuilder();

                // Act ----------
                var builderRef = builder.injectInto(delegate);

                // Assert -------
                // 1. Should support call chaining
                expect(builderRef).toBe(builder);

                // 2. Should not run before container build
                expect(delegate).not.toHaveBeenCalled();
            });

            test("WHEN: Build container with injection delegates", () => {
                // Arrange --------
                var external = { foo: 0, bar: "" };

                var expectedNumValue = 42;
                var expectedStrValue = "foo";

                var delegateA = vi.fn((r) => {
                    external.foo = r.get("num");
                });
                var delegateB = vi.fn((r) => {
                    external.bar = r.get("str");
                });

                var builder = createContainerBuilder()
                    .bindInstance("num", expectedNumValue)
                    .bindInstance("str", expectedStrValue)
                    .injectInto(delegateA)
                    .injectInto(delegateB);

                // Act -------------
                var container = builder.build();

                // Assert ----------
                // 1. Delegates are called in order with the container as resolver
                expect(delegateB).toHaveBeenCalledAfter(delegateA);
                expect(delegateA).toHaveBeenCalledWith(container);
                expect(delegateB).toHaveBeenCalledWith(container);

                // 2. Values are correctly injected into external objects
                expect(external.foo).toBe(expectedNumValue);
                expect(external.bar).toBe(expectedStrValue);
            });
        });
    });
});

describe("Container Scope", () => {
    describe("Resolve type instances", () => {
        describe("Get type instance", () => {
            test("WHEN get not bound type instance", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var scope = createContainerBuilder().build();

                // Act ------------
                var error = catchError(() => {
                    scope.get(typeKey);
                });

                // Assert ---------
                expect(error).toBeDefined();
                expect(error.message).to.equal(
                    DIErrors.TypeBindingNotFound(typeKey),
                );
            });

            test("WHEN get not bound type instance with name", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var scope = createContainerBuilder().build();

                // Act ------------
                var error = catchError(() => {
                    scope.get(typeKey, typeName);
                });

                // Assert ---------
                expect(error).toBeDefined();
                expect(error.message).to.equal(
                    DIErrors.TypeBindingNotFound(typeKey, typeName),
                );
            });

            test("WHEN get from instance binding", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var scope = createContainerBuilder()
                    .bindInstance(typeKey, expectedValue)
                    .build();

                // Act ------------
                var resolvedValue = scope.get(typeKey);

                // Assert ---------
                expect(resolvedValue).toBe(expectedValue);
            });

            test("WHEN get from named instance binding", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var expectedValue = 42;
                var scope = createContainerBuilder()
                    .bindInstance(typeKey, expectedValue, { name: typeName })
                    .build();

                // Act ------------
                var resolvedValue = scope.get(typeKey, typeName);

                // Assert ---------
                expect(resolvedValue).toBe(expectedValue);
            });

            test("WHEN get from factory binding", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var factoryMock = vi.fn(() => expectedValue);
                var scope = createContainerBuilder()
                    .bindFactory(typeKey, factoryMock)
                    .build();

                // Act ------------
                var resolvedValue = scope.get(typeKey);

                // Assert ---------
                expect(resolvedValue).toBe(expectedValue);
                expect(factoryMock).toHaveBeenCalled();
            });

            test("WHEN get from named factory binding", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var expectedValue = 42;
                var factoryMock = vi.fn(() => expectedValue);
                var scope = createContainerBuilder()
                    .bindFactory(typeKey, factoryMock, { name: typeName })
                    .build();

                // Act ------------
                var resolvedValue = scope.get(typeKey, typeName);

                // Assert ---------
                expect(resolvedValue).toBe(expectedValue);
                expect(factoryMock).toHaveBeenCalled();
            });

            test("WHEN: get from safe factory", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var depKey = "depKey";
                var expectedValue = 420;
                var injectorFn = vi.fn((r) => r.get(depKey));
                var factoryFn = vi.fn((d) => d * 10);

                var scope = createContainerBuilder()
                    .bindInstance(depKey, 42)
                    .bindSafeFactory(typeKey, injectorFn, factoryFn)
                    .build();

                // Act ------------
                var resolvedValue = scope.get(typeKey);

                // Assert ---------
                expect(injectorFn).toHaveBeenCalled();
                expect(injectorFn).toHaveReturnedWith(42);
                expect(factoryFn).toHaveBeenCalledWith(42, expect.any(Object));
                expect(resolvedValue).toBe(expectedValue);
            });

            test("WHEN get from alias instance binding", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var aliasKey = "aliasKey";
                var expectedValue = 42;
                var scope = createContainerBuilder()
                    .bindInstance(typeKey, expectedValue)
                    .bindAlias(aliasKey, typeKey)
                    .build();

                // Act ------------
                var resolvedValue = scope.get(aliasKey);

                // Assert ---------
                expect(resolvedValue).toBe(expectedValue);
            });

            test("WHEN get from named alias instance binding", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var aliasKey = "aliasKey";
                var aliasName = "aliasName";
                var expectedValue = 42;
                var scope = createContainerBuilder()
                    .bindInstance(typeKey, expectedValue)
                    .bindAlias(aliasKey, typeKey, { name: aliasName })
                    .build();

                // Act ------------
                var resolvedValue = scope.get(aliasKey, aliasName);

                // Assert ---------
                expect(resolvedValue).toBe(expectedValue);
            });

            test("WHEN get first instance of multi binding", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var scope = createContainerBuilder()
                    .bindInstance(typeKey, expectedValue, {
                        ifConflict: "append",
                    })
                    .bindInstance(typeKey, 4, { ifConflict: "append" })
                    .bindInstance(typeKey, 2, { ifConflict: "append" })
                    .build();

                // Act ----------
                var value = scope.get(typeKey);

                // Assert -------
                expect(value).toBe(expectedValue);
            });
        });

        describe("Get type instance with dependencies", () => {
            test("WHEN has one dependency", () => {
                // Arrange ---------
                var expectedValue = "fooBar";
                var container = createContainerBuilder()
                    .bindInstance("instTypeKey", "foo")
                    .bindFactory(
                        "factoryTypeKey",
                        (r) => r.get("instTypeKey") + "Bar",
                    )
                    .build();

                // Act -------------
                var result = container.get("factoryTypeKey");

                // Assert ----------
                expect(result).toBe(expectedValue);
            });

            test("WHEN has many dependencies", () => {
                // Arrange ----------
                var values = [11, 22, 33];
                var expectedValue = values.reduce((s, n) => s + n, 0);

                var container = createContainerBuilder()
                    .bindInstance("value1", values[0])
                    .bindInstance("value2", values[1])
                    .bindInstance("value3", values[2])
                    .bindFactory(
                        "sum",
                        (r) =>
                            r.get("value1") + r.get("value2") + r.get("value3"),
                    )
                    .build();

                // Act --------------
                var result = container.get("sum");

                // Assert -----------
                expect(result).toBe(expectedValue);
            });

            test("WHEN has dependencies chain", () => {
                // Arrange ----------
                var values = [11, 22, 33];
                var expectedValue = values.reduce((s, n) => s + n, 0);

                var container = createContainerBuilder()
                    .bindInstance("value1", values[0])
                    .bindFactory("value2", (r) => values[1] + r.get("value1"))
                    .bindFactory("value3", (r) => values[2] + r.get("value2"))
                    .build();

                // Act --------------
                var result = container.get("value3");

                // Assert -----------
                expect(result).toBe(expectedValue);
            });

            test("WHEN has self dependency cycle", () => {
                // Arrange --------
                var container = createContainerBuilder()
                    .bindFactory("typeKey", (r) => r.get("typeKey"), {
                        lifecycle: "lazy",
                    })
                    .build();

                // Act ------------
                var error = catchError(() => container.get("typeKey"));

                // Assert ---------
                expect(error).toBeDefined();
                expect(error.message).to.equal(
                    DIErrors.DependenciesCycle("typeKey", ["typeKey"]),
                );
            });

            test("WHEN has short dependency cycle", () => {
                // Arrange --------
                var expectedTypeStack = ["typeKey", "typeDep", "typeKey"];
                var container = createContainerBuilder()
                    .bindFactory("typeDep", (r) => r.get("typeKey"), {
                        lifecycle: "lazy",
                    })
                    .bindFactory("typeKey", (r) => r.get("typeDep"), {
                        lifecycle: "lazy",
                    })
                    .build();

                // Act ------------
                var error = catchError(() => container.get("typeKey"));

                // Assert ---------
                expect(error).toBeDefined();
                expect(error.message).to.equal(
                    DIErrors.DependenciesCycle("typeKey", expectedTypeStack),
                );
            });

            test("WHEN has deep dependency cycle", () => {
                // Arrange --------
                var expectedTypeStack = [
                    "typeA",
                    "typeB",
                    "typeC",
                    "typeD",
                    "typeE",
                    "typeF",
                    "typeA",
                ];

                var container = createContainerBuilder()
                    .bindFactory("typeA", (r) => r.get("typeB"), {
                        lifecycle: "lazy",
                    })
                    .bindFactory("typeB", (r) => r.get("typeC"), {
                        lifecycle: "lazy",
                    })
                    .bindFactory("typeC", (r) => r.get("typeD"), {
                        lifecycle: "lazy",
                    })
                    .bindFactory("typeD", (r) => r.get("typeE"), {
                        lifecycle: "lazy",
                    })
                    .bindFactory("typeE", (r) => r.get("typeF"), {
                        lifecycle: "lazy",
                    })
                    .bindFactory("typeF", (r) => r.get("typeA"), {
                        lifecycle: "lazy",
                    })
                    .build();

                // Act ------------
                var error = catchError(() => container.get("typeA"));

                // Assert ---------
                expect(error).toBeDefined();
                expect(error.message).to.equal(
                    DIErrors.DependenciesCycle("typeA", expectedTypeStack),
                );
            });
        });

        describe("Maybe type instance", () => {
            test("WHEN type has one binding", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var container = createContainerBuilder()
                    .bindInstance(typeKey, expectedValue)
                    .build();

                // Act ------------
                var instance = container.maybe(typeKey);

                // Assert ---------
                expect(instance).toBe(expectedValue);
            });

            test("WHEN type has many bindings", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var container = createContainerBuilder()
                    .bindInstance(typeKey, expectedValue, {
                        ifConflict: "append",
                    })
                    .bindInstance(typeKey, 11, { ifConflict: "append" })
                    .build();

                // Act ------------
                var instance = container.maybe(typeKey);

                // Assert ---------
                expect(instance).toBe(expectedValue);
            });

            test("WHEN type has no bindings", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var container = createContainerBuilder().build();

                // Act ----------
                var instance = container.maybe(typeKey);

                // Assert -------
                expect(instance).toBeUndefined();
            });
        });

        describe("Resolve all type instances", () => {
            test("WHEN type has no bindings", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var container = createContainerBuilder().build();

                // Act -----------
                var instancies = container.getAll(typeKey);

                // Assert --------
                // Without bindings, returns empty array
                expect(instancies).toBeInstanceOf(Array);
                expect(instancies).is.empty;
            });

            test("WHEN have one binding", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var valueFactory = vi.fn(() => expectedValue);
                var container = createContainerBuilder()
                    .bindFactory(typeKey, valueFactory, {
                        lifecycle: "lazy",
                    })
                    .build();

                // Act ------------
                var instances = container.getAll(typeKey);

                // Assert ---------
                expect(instances).toBeInstanceOf(Array);
                expect(instances).have.length(1);
                expect(instances[0]).toBe(expectedValue);

                expect(valueFactory).toHaveBeenCalled();
            });

            test("WHEN have many bindings", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var factoryA = vi.fn(() => 11);
                var factoryB = vi.fn(() => 22);
                var factoryC = vi.fn(() => 33);

                var container = createContainerBuilder()
                    .bindFactory(typeKey, factoryA, {
                        ifConflict: "append",
                        lifecycle: "lazy",
                        name: typeName,
                    })
                    .bindFactory(typeKey, factoryB, {
                        ifConflict: "append",
                        lifecycle: "lazy",
                        name: typeName,
                    })
                    .bindFactory(typeKey, factoryC, {
                        ifConflict: "append",
                        lifecycle: "lazy",
                        name: typeName,
                    })
                    .build();

                // Act ----------
                var instances = container.getAll(typeKey, typeName);

                // Assert -------
                expect(instances).toBeInstanceOf(Array);
                expect(instances).have.length(3);

                expect(factoryA).toHaveBeenCalled();
                expect(instances[0]).toBe(11);

                expect(factoryB).toHaveBeenCalled();
                expect(instances[1]).toBe(22);

                expect(factoryC).toHaveBeenCalled();
                expect(instances[2]).toBe(33);
            });

            test("WHEN have bindings through aliases", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var container = createContainerBuilder()
                    .bindInstance("A", 11)
                    .bindFactory("B", () => 22, {
                        lifecycle: "lazy",
                        name: typeName,
                    })
                    .bindFactory("C", () => 33, { lifecycle: "lazy" })
                    .bindAlias(typeKey, "A", {
                        name: typeName,
                        ifConflict: "append",
                    })
                    .bindAlias(typeKey, "B", {
                        name: typeName,
                        originName: typeName,
                        ifConflict: "append",
                    })
                    .bindAlias(typeKey, "C", {
                        name: typeName,
                        ifConflict: "append",
                    })
                    .build();

                // Act -----------
                var instances = container.getAll(typeKey, typeName);

                // Assert --------
                expect(instances).toBeInstanceOf(Array);
                expect(instances).have.length(3);
            });
        });

        describe("Get type instance provider", () => {
            test("WHEN: Get provider", () => {
                // Arrange ---------
                var typeKey = "typeKey";
                var factory = vi.fn();
                var container = createContainerBuilder()
                    .bindFactory(typeKey, factory, { lifecycle: "lazy" })
                    .build();

                // Act -------------
                var provider = container.providerOf(typeKey);

                // Assert ----------
                expect(provider).instanceOf(Function);
                expect(factory).not.toHaveBeenCalled();
            });

            test("WHEN: get provider of unbound type", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var container = createContainerBuilder().build();

                // Act ----------
                var error = catchError(() => {
                    container.providerOf(typeKey);
                });

                // Assert -------
                expect(error).toBeDefined();
                expect(error.message).toEqual(
                    DIErrors.TypeBindingNotFound(typeKey),
                );
            });

            test("WHEN: Get provider and call it", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var factory = vi.fn(() => expectedValue);
                var container = createContainerBuilder()
                    .bindFactory(typeKey, factory, { lifecycle: "lazy" })
                    .build();

                // Act -----------
                var provider = container.providerOf(typeKey);
                var value = provider();

                // Assert --------
                expect(provider).instanceOf(Function);
                expect(value).toBe(expectedValue);
                expect(factory).toHaveBeenCalledOnce();
                expect(factory).toHaveReturnedWith(value);
            });

            test("WHEN: get type provider with specified name", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var expectedValue = 42;
                var factory = vi.fn(() => expectedValue);
                var container = createContainerBuilder()
                    .bindFactory(typeKey, factory, {
                        name: typeName,
                        lifecycle: "lazy",
                    })
                    .build();

                // Act ----------
                var provider = container.providerOf(typeKey, typeName);
                var value = provider();

                // Assert -------
                expect(factory).toHaveBeenCalled();
                expect(value).toBe(expectedValue);
            });
        });
    });

    describe("Lifecycles", () => {
        describe("Singleton", () => {
            test("WHEN build container", () => {
                // Arrange ---------
                var typeKey = "typeKey";
                var factory = vi.fn(() => 42);

                var builder = createContainerBuilder().bindFactory(
                    typeKey,
                    factory,
                );

                // Act --------------
                builder.build();

                // Assert -----------
                // The instance of type was created by calling factory on container build
                expect(factory).toHaveBeenCalledTimes(1);
            });

            test("WHEN get value from container", () => {
                // Arrange -----
                var expectedValue = 42;
                var typeKey = "typeKey";
                var factory = vi.fn(() => ({
                    value: expectedValue,
                }));

                var container = createContainerBuilder()
                    .bindFactory(typeKey, factory)
                    .build();

                factory.mockClear();

                // Act ---------
                var result = container.get(typeKey);

                // Assert ------
                // 1. Expected object was resolved
                expect(result.value).toBe(expectedValue);
                // 2. Instance was not re-created on resolve after build container
                expect(factory).not.toHaveBeenCalled();
            });

            test("WHEN get more instances from container", () => {
                // Arrange -----
                var expectedValue = 42;
                var typeKey = "typeKey";
                var factory = vi.fn(() => ({
                    value: expectedValue,
                }));

                var container = createContainerBuilder()
                    .bindFactory(typeKey, factory)
                    .build();

                factory.mockClear();

                // Act ---------
                var resultA = container.get(typeKey);
                var resultB = container.get(typeKey);

                // Assert ------
                // 1. Expected object was resolved
                expect(resultA.value).toBe(expectedValue);
                // 2. Instance was not re-created on resolve after build container
                expect(factory).not.toHaveBeenCalled();
                // 3. Returns same instance of type
                expect(resultB).toBe(resultB);
            });
        });

        describe("Lazy singleton", () => {
            test("WHEN build container", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var factory = vi.fn(() => ({ value: expectedValue }));

                var builder = createContainerBuilder().bindFactory(
                    typeKey,
                    factory,
                    { lifecycle: "lazy" },
                );

                // Act ----------
                builder.build();

                // Assert -------
                // Lazy Singleton was not created on container build
                expect(factory).not.toHaveBeenCalled();
            });

            test("WHEN get instance from container", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var factory = vi.fn(() => ({ value: expectedValue }));

                var container = createContainerBuilder()
                    .bindFactory(typeKey, factory, { lifecycle: "lazy" })
                    .build();

                // Act ----------
                var instance = container.get(typeKey);

                // Assert -------
                // Lazy Singleton was created by factory call
                expect(factory).toHaveBeenCalledTimes(1);
                expect(factory).toHaveReturnedWith(instance);

                // Resolved expected instance
                expect(instance.value).toBe(expectedValue);
            });

            test("WHEN get many instances", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var expectedValue = 42;
                var factory = vi.fn(() => ({ value: expectedValue }));

                var container = createContainerBuilder()
                    .bindFactory(typeKey, factory, { lifecycle: "lazy" })
                    .build();

                // Act ----------
                var instanceA = container.get(typeKey);
                var instanceB = container.get(typeKey);

                // Assert -------
                // 1. Lazy Singleton was created by factory call
                expect(factory).toHaveBeenCalledTimes(1);
                expect(factory).toHaveReturnedWith(instanceA);

                // 2. Resolved expected instance
                expect(instanceA.value).toBe(expectedValue);

                // 3. Resolved with same instance
                expect(instanceB).toBe(instanceA);
            });
        });

        describe("Transient", () => {
            test("WHEN build container", () => {
                // Arrange ------------
                var expectedValue = 42;
                var typeKey = "typeKey";
                var factory = vi.fn(() => ({ value: expectedValue }));

                var builder = createContainerBuilder().bindFactory(
                    typeKey,
                    factory,
                    { lifecycle: "transient" },
                );

                // Act ----------------
                builder.build();

                // Assert -------------
                // Instance of type was not created on container build
                expect(factory).not.toHaveBeenCalled();
            });

            test("WHEN get instance", () => {
                // Arrange ------------
                var expectedValue = 42;
                var typeKey = "typeKey";
                var factory = vi.fn(() => ({ value: expectedValue }));

                var container = createContainerBuilder()
                    .bindFactory(typeKey, factory, { lifecycle: "transient" })
                    .build();

                // Act ----------------
                var instance = container.get(typeKey);

                // Assert -------------
                // 1. Instance of type created on resolve
                expect(factory).toHaveBeenCalledTimes(1);

                // 2. Resolved with expected value
                expect(instance.value).toBe(expectedValue);
            });

            test("WHEN get many instances", () => {
                // Arrange ------------
                var expectedValue = 42;
                var typeKey = "typeKey";
                var factory = vi.fn(() => ({ value: expectedValue }));

                var container = createContainerBuilder()
                    .bindFactory(typeKey, factory, { lifecycle: "transient" })
                    .build();

                // Act ----------------
                var instanceA = container.get(typeKey);
                var instanceB = container.get(typeKey);

                // Assert -------------
                // 1. Instance of type was created on each resolve
                expect(factory).toHaveBeenCalledTimes(2);

                // 2. Resolved with expected value
                expect(instanceA.value).toBe(expectedValue);
                expect(instanceB.value).toBe(expectedValue);

                // 3. Resolved instances not a same
                expect(instanceB).not.toBe(instanceA);
            });
        });
    });

    describe("Middleware", () => {
        test("WHEN: empty middleware", () => {
            // Arrange ------
            var typeKey = "typeKey";
            var expectedInst = { value: 42 };
            var middleware = {};
            var container = createContainerBuilder()
                .use(middleware)
                .bindFactory(typeKey, () => expectedInst)
                .build();

            // Act -----------
            var inst = container.get(typeKey);

            // Assert --------
            // Nothing special... just checking
            expect(inst).toBe(expectedInst);
        });

        describe("onRequest", () => {
            test("WHEN: Listen instance requests", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var expectedInst = 42;
                var factory = vi.fn(() => expectedInst);
                var onRequestHandler = vi.fn();
                var builder = createContainerBuilder()
                    .use({ onRequest: onRequestHandler })
                    .bindFactory(typeKey, factory, { lifecycle: "lazy" });

                var entry = builder.findEntry(typeKey);

                var container = builder.build();

                // Act -----------
                var inst1 = container.get(typeKey);
                var inst2 = container.get(typeKey);

                // Assert --------
                expect(inst1).toBe(expectedInst);
                expect(inst2).toBe(expectedInst);

                expect(factory).toHaveBeenCalledOnce();

                expect(onRequestHandler).toHaveBeenNthCalledWith(
                    1,
                    entry,
                    container,
                    typeKey,
                    undefined,
                );
                expect(onRequestHandler).toHaveBeenNthCalledWith(
                    2,
                    entry,
                    container,
                    typeKey,
                    undefined,
                );
            });

            test("WHEN: Reject instance request", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var typeName = "typeName";
                var expectedErrorMessage = "Type Request Rejected";

                var factory = vi.fn();
                var onRequestHandler = vi.fn(() => {
                    throw new Error(expectedErrorMessage);
                });
                var builder = createContainerBuilder()
                    .use({ onRequest: onRequestHandler })
                    .bindFactory(typeKey, factory, {
                        lifecycle: "lazy",
                        name: typeName,
                    });

                var entry = builder.findEntry(typeKey, typeName);
                var container = builder.build();

                // Act -----------
                var error = catchError(() => {
                    container.get(typeKey, typeName);
                });

                // Assert --------
                expect(error).toBeDefined();
                expect(error.message).toEqual(expectedErrorMessage);

                expect(factory).not.toHaveBeenCalled();

                expect(onRequestHandler).toHaveBeenCalledExactlyOnceWith(
                    entry,
                    container,
                    typeKey,
                    typeName,
                );
            });
        });

        describe("onResolve", () => {
            test("WHEN: listen instance resolve events", () => {
                // Arrange ---------
                var typeKey = "typeKey";
                var typeValue = 42;

                var onResolveHandler = vi.fn((_, instance) => instance);

                var builder = createContainerBuilder()
                    .use({ onResolve: onResolveHandler })
                    .bindInstance(typeKey, typeValue);

                var typeEntry = builder.findEntry(typeKey);

                var container = builder.build();

                // Act -------------
                container.get(typeKey);

                // Assert ----------
                expect(onResolveHandler).toHaveBeenCalledWith(
                    typeEntry,
                    typeValue,
                    container,
                );
            });

            test("WHEN: override resolved instance", () => {
                // Arrange ---------
                var typeKey = "typeKey";
                var typeValue = 42;
                var expectedValue = 123;

                var onResolveHandler = vi.fn(() => expectedValue);

                var builder = createContainerBuilder()
                    .bindInstance(typeKey, typeValue)
                    .use({ onResolve: onResolveHandler });

                var typeEntry = builder.findEntry(typeKey);

                var container = builder.build();

                // Act -------------
                var value = container.get(typeKey);

                // Assert ----------
                expect(value).toBe(expectedValue);
                expect(onResolveHandler).toHaveBeenCalledWith(
                    typeEntry,
                    typeValue,
                    container,
                );
                expect(onResolveHandler).toHaveReturnedWith(value);
            });

            test("WHEN: override instance with many hooks", () => {
                // Arrange -------
                var aliasKey = "aliasKey";
                var typeKey = "typeKey";
                var typeValue = 42;

                var expectedResult = (typeValue + 1) * 10;

                var firstOnResolveHandler = vi.fn((_, value) => value + 1);
                var secondOnResolveHandler = vi.fn((_, value) => value * 10);

                var builder = createContainerBuilder()
                    .bindAlias(aliasKey, typeKey)
                    .use({ onResolve: firstOnResolveHandler })
                    .use({ onResolve: secondOnResolveHandler })
                    .bindInstance(typeKey, typeValue);

                var entry = builder.findEntry(typeKey);

                var container = builder.build();

                // Act -----------
                var value = container.get(aliasKey);

                // Assert --------
                expect(value).toBe(expectedResult);

                expect(firstOnResolveHandler).toHaveBeenCalledWith(
                    entry,
                    typeValue,
                    container,
                );
                expect(firstOnResolveHandler).toHaveReturnedWith(typeValue + 1);

                expect(secondOnResolveHandler).toHaveBeenCalledWith(
                    entry,
                    typeValue + 1,
                    container,
                );
                expect(secondOnResolveHandler).toHaveReturnedWith(value);
            });
        });

        describe("onActivated", () => {
            test("WHEN: Listen activation events", () => {
                // Arrange ---------
                var typeKey = "typeKey";
                var expectedInst = { value: 42 };
                var onActivatedHandler = vi.fn((_, inst) => inst);
                var builder = createContainerBuilder()
                    .use({
                        onActivated: onActivatedHandler,
                    })
                    .bindFactory(typeKey, () => expectedInst, {
                        lifecycle: "lazy",
                    });

                var entry = builder.findEntry(typeKey);
                var container = builder.build();

                // Act -------------

                var inst1 = container.get(typeKey);
                var inst2 = container.get(typeKey);

                // Assert ---------
                expect(inst1).toBe(expectedInst);
                expect(inst1).toBe(inst2);

                expect(onActivatedHandler).toHaveBeenCalledExactlyOnceWith(
                    entry,
                    expectedInst,
                    container,
                );
                expect(onActivatedHandler).toHaveReturnedWith(expectedInst);
            });

            test("WHEN: Override activated instance", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var factoryInst = 11;
                var expectedInst = 22;
                var factory = vi.fn(() => factoryInst);
                var onActivatedHandler = vi.fn(() => expectedInst);
                var builder = createContainerBuilder()
                    .use({ onActivated: onActivatedHandler })
                    .bindFactory(typeKey, factory, { lifecycle: "lazy" });

                var entry = builder.findEntry(typeKey);
                var container = builder.build();

                // Act -----------
                var inst1 = container.get(typeKey);
                var inst2 = container.get(typeKey);

                // Assert --------
                // 1. onActivated should define the final instance
                expect(inst1).toBe(expectedInst);
                expect(inst1).toBe(inst2);

                // 2. Factory should be called once and return original value
                expect(factory).toHaveBeenCalledOnce();
                expect(factory).toHaveReturnedWith(factoryInst);

                // 3. Hook receives raw instance and returns modified
                expect(onActivatedHandler).toHaveBeenCalledAfter(factory);
                expect(onActivatedHandler).toHaveBeenCalledExactlyOnceWith(
                    entry,
                    factoryInst,
                    container,
                );
                expect(onActivatedHandler).toHaveReturnedWith(expectedInst);
            });

            test("WHEN: Override activated instance with many hooks", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var originValue = 0;
                var valueOne = 1;
                var valueTwo = 2;

                var factory = vi.fn(() => originValue);
                var onActivatedOne = vi.fn(() => valueOne);
                var onActivatedTwo = vi.fn(() => valueTwo);

                var builder = createContainerBuilder()
                    .use({ onActivated: onActivatedOne })
                    .use({ onActivated: onActivatedTwo })
                    .bindFactory(typeKey, factory, { lifecycle: "lazy" });

                var entry = builder.findEntry(typeKey);
                var container = builder.build();

                // Act ----------
                var inst1 = container.get(typeKey);
                var inst2 = container.get(typeKey);

                // Assert -------
                // 1. Last onActivated should define the final instance
                expect(inst1).toBe(valueTwo);
                expect(inst2).toBe(inst1);

                // 2. Factory should be called once and return original value
                expect(factory).toHaveBeenCalledOnce();
                expect(factory).toHaveReturnedWith(originValue);

                // 3. First hook receives raw instance, returns modified
                expect(onActivatedOne).toHaveBeenCalledAfter(factory);
                expect(onActivatedOne).toHaveBeenCalledExactlyOnceWith(
                    entry,
                    originValue,
                    container,
                );
                expect(onActivatedOne).toHaveReturnedWith(valueOne);

                // 4. Second hook receives result of first hook
                expect(onActivatedTwo).toHaveBeenCalledAfter(onActivatedOne);
                expect(onActivatedTwo).toHaveBeenCalledExactlyOnceWith(
                    entry,
                    valueOne,
                    container,
                );
                expect(onActivatedTwo).toHaveReturnedWith(valueTwo);
            });
        });
    });

    describe("Child scopes", () => {
        describe("Get child scope", () => {
            test("WHEN: Create child scope", () => {
                // Arrange -----------
                var scopeId = "myScope";
                var onScopeOpen = vi.fn();
                var container = createContainerBuilder()
                    .use({ onScopeOpen })
                    .build();

                // Act ---------------
                var childScope = container.scope(scopeId);

                // Assert ------------
                expect(container.hasChildScope(scopeId)).is.true;

                expect(childScope.id).toBe(scopeId);
                expect(childScope).not.toBe(container);
                expect(Object.getPrototypeOf(childScope)).toBe(
                    Object.getPrototypeOf(container),
                );
                expect(childScope.sealed).is.false;
                expect(childScope.isolated).is.false;
                expect(childScope.isDisposed).is.false;

                expect(onScopeOpen).toHaveBeenCalledExactlyOnceWith(childScope);
            });

            test("WHEN: Get child scope twice with same id", () => {
                // Arrange ------------
                var scopeId = "child";
                var onScopeOpen = vi.fn();
                var container = createContainerBuilder()
                    .use({ onScopeOpen })
                    .build();
                var scopeA = container.scope(scopeId);

                // Act ----------------
                var scopeB = container.scope(scopeId);

                // Assert -------------
                expect(scopeB).toBe(scopeA);
                expect(onScopeOpen).toHaveBeenCalledExactlyOnceWith(scopeA);
            });

            test("WHEN: Create sealed scope", () => {
                // Arrange -----------
                var scopeId = "myScope";
                var container = createContainerBuilder().build();

                // Act ---------------
                var childScope = container.scope(scopeId, { sealed: true });

                // Assert ------------
                expect(container.hasChildScope(scopeId)).is.true;

                expect(childScope.id).toBe(scopeId);
                expect(childScope).not.toBe(container);
                expect(Object.getPrototypeOf(childScope)).toBe(
                    Object.getPrototypeOf(container),
                );
                expect(childScope.sealed).is.true;
                expect(childScope.isolated).is.false;
                expect(childScope.isDisposed).is.false;
            });

            test("WHEN: Get scope with same name as parent", () => {
                // Arrange -------
                var container = createContainerBuilder().build();

                var scopeA = container.scope("A");
                var scopeB = scopeA.scope("B");

                // Act -----------
                var scopeA2 = scopeB.scope("A");

                // Assert --------
                expect(scopeA2).toBe(scopeA);
            });

            test("WHEN: Trying open new scope from sealed scope", () => {
                // Arrange ---------
                var sealedScopeName = "sealed";
                var childScopeName = "child";
                var container = createContainerBuilder().build();
                var sealedScope = container.scope(sealedScopeName, {
                    sealed: true,
                });

                // Act -------------
                var error = catchError(() => {
                    sealedScope.scope(childScopeName);
                });

                // Assert ----------
                expect(error).toBeDefined();
                expect(error.message).toEqual(
                    DIErrors.SealedScope(sealedScopeName, childScopeName),
                );
            });

            test("WHEN: Trying to get parent scope from sealed scope", () => {
                // Arrange -------
                var parentName = "parent";
                var childName = "child";
                var container = createContainerBuilder().build();

                var parentScope = container.scope(parentName);
                var childScope = parentScope.scope(childName, { sealed: true });

                // Act -----------
                var scope = childScope.scope(parentName);

                // Assert --------
                expect(childScope.hasChildScope(parentName)).is.false;
                expect(scope).toBe(parentScope);
            });

            test("WHEN: Create isolated scope", () => {
                // Arrange -----------
                var scopeId = "myScope";
                var container = createContainerBuilder().build();

                // Act ---------------
                var childScope = container.scope(scopeId, { isolated: true });

                // Assert ------------
                expect(childScope.id).toBe(scopeId);
                expect(childScope).not.toBe(container);
                expect(Object.getPrototypeOf(childScope)).toBe(
                    Object.getPrototypeOf(container),
                );
                expect(childScope.sealed).is.false;
                expect(childScope.isolated).is.true;
            });
        });

        describe("Scoped instances", () => {
            test("WHEN: Get singleton from child scope", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var factory = vi.fn(() => ({ value: 42 }));
                var container = createContainerBuilder()
                    .bindFactory(typeKey, factory)
                    .build();

                var scopeA = container.scope("A");
                var scopeB = scopeA.scope("B");

                // Act -----------
                var instRoot = container.get(typeKey);
                var instA = scopeA.get(typeKey);
                var instB = scopeB.get(typeKey);

                // Assert --------
                expect(factory).toHaveBeenCalledOnce();

                expect(instA).toBe(instRoot);
                expect(instB).toBe(instRoot);
            });

            test("WHEN: Get instance from same scope", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var container = createContainerBuilder()
                    .bindFactory(typeKey, () => ({ value: "foo" }), {
                        lifecycle: "scope",
                    })
                    .build();

                var childScope = container.scope("child");

                // Act -----------
                var inst1 = childScope.get(typeKey);
                var inst2 = childScope.get(typeKey);

                // Assert --------
                expect(inst1).toBe(inst2);
            });

            test("WHEN: Get instance of same type from different scopes", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var container = createContainerBuilder()
                    .bindFactory(typeKey, () => ({ value: 42 }), {
                        lifecycle: "scope",
                    })
                    .build();

                var scopeA = container.scope("A");
                var scopeB = container.scope("B");

                // Act -----------
                var instA = scopeA.get(typeKey);
                var instB = scopeB.get(typeKey);

                // Assert --------
                expect(instA).not.toBe(instB);
            });

            test("WHEN: Get instance from parent and child scopes", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var container = createContainerBuilder()
                    .bindFactory(typeKey, () => ({ goTo: "bar" }))
                    .build();

                var parent = container.scope("parent");
                var child = container.scope("child");

                // Act -----------
                var instParent = parent.get(typeKey);
                var instChild = child.get(typeKey);

                // Assert --------
                expect(instChild).toBe(instParent);
            });

            test("WHEN: Get instance from parent and isolated child scopes", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var container = createContainerBuilder()
                    .bindFactory(typeKey, () => ({ goTo: "bar" }), {
                        lifecycle: "scope",
                    })
                    .build();

                var parent = container.scope("parent");
                var child = container.scope("child", { isolated: true });

                // Act -----------
                var instParent = parent.get(typeKey);
                var instChild = child.get(typeKey);

                // Assert --------
                expect(instChild).not.toBe(instParent);
            });

            test("WHEN: Getting instance from scope inside isolated scope", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var factory = vi.fn(() => ({ value: "nya" }));
                var container = createContainerBuilder()
                    .bindFactory(typeKey, factory, { lifecycle: "scope" })
                    .build();

                var scopeA = container.scope("A");
                var scopeB = scopeA.scope("B", { isolated: true });
                var scopeC = scopeB.scope("C");

                // Act ----------
                var instA = scopeA.get(typeKey);
                var instB = scopeB.get(typeKey);
                var instC = scopeC.get(typeKey);

                // Assert -------
                // 1. Instances from scopes B & C should be the same
                expect(instC).toBe(instB);

                // 2. Instance from scopes A & C should be different,
                //    because parent B is isolated from A
                expect(instC).not.toBe(instA);

                // 3. Factory should be called twice: once for A, once for B (shared with C)
                expect(factory).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe("Allowed scopes", () => {
        test("WHEN: Get instance from allowed scope", () => {
            // Arrange ----------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var allowedScope = "scope";
            var factory = vi.fn(() => expectedValue);
            var container = createContainerBuilder()
                .bindFactory(typeKey, factory, {
                    lifecycle: "scope",
                    allowedScopes: [allowedScope],
                })
                .build();

            var scope = container.scope(allowedScope);

            // Act --------------
            var value = scope.get(typeKey);

            // Assert -----------
            expect(value).toBe(expectedValue);
            expect(factory).toHaveBeenCalledOnce();
        });

        test("WHEN: get instance from not allowed scope", () => {
            // Arrange ------------
            var typeKey = "typeKey";
            var currentScope = "current";
            var factory = vi.fn(() => 42);
            var container = createContainerBuilder()
                .bindFactory(typeKey, factory, {
                    lifecycle: "scope",
                    allowedScopes: ["allowed"],
                })
                .build();

            var scope = container.scope(currentScope);

            // Act ----------------
            var error = catchError(() => {
                scope.get(typeKey);
            });

            // Assert -------------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual(
                DIErrors.ScopeViolation(currentScope, typeKey),
            );
            expect(factory).not.toHaveBeenCalled();
        });

        test("WHEN: Get optional type from not allowed scope", () => {
            // Arrange ------------
            var typeKey = "typeKey";
            var currentScope = "current";
            var factory = vi.fn(() => 42);
            var container = createContainerBuilder()
                .bindFactory(typeKey, factory, {
                    lifecycle: "scope",
                    allowedScopes: ["allowed"],
                })
                .build();

            var scope = container.scope(currentScope);

            // Act ----------
            var value = scope.maybe(typeKey);

            // Assert -------
            expect(value).is.undefined;
            expect(factory).not.toHaveBeenCalled();
        });

        test("WHEN: Get instance from child of allowed scope", () => {
            // Arrange --------
            var typeKey = "typeKey";
            var factory = vi.fn(() => ({ value: 42 }));
            var parentScopeName = "parent";
            var childScopeName = "child";
            var container = createContainerBuilder()
                .bindFactory(typeKey, factory, {
                    lifecycle: "scope",
                    allowedScopes: [parentScopeName],
                })
                .build();

            var parentScope = container.scope(parentScopeName);
            var childScope = parentScope.scope(childScopeName);

            // Act ------------
            var childInst = childScope.get(typeKey);
            var parentInst = parentScope.get(typeKey);

            // Assert ---------
            expect(childInst).toBe(parentInst);
            expect(factory).toHaveBeenCalledOnce();
        });

        test("WHEN: Get instance from isolated child of allowed scope", () => {
            // Arrange --------
            var typeKey = "typeKey";
            var factory = vi.fn(() => ({ value: 42 }));
            var parentScopeName = "parent";
            var childScopeName = "child";
            var container = createContainerBuilder()
                .bindFactory(typeKey, factory, {
                    lifecycle: "scope",
                    allowedScopes: [parentScopeName],
                })
                .build();

            var parentScope = container.scope(parentScopeName);
            var childScope = parentScope.scope(childScopeName, {
                isolated: true,
            });

            // Act ------------
            var error = catchError(() => {
                childScope.get(typeKey);
            });

            // Assert ---------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual(
                DIErrors.ScopeViolation(childScopeName, typeKey),
            );
            expect(factory).not.toHaveBeenCalled();
        });
    });

    describe("Disposable scope", () => {
        test("WHEN: Dispose scope", () => {
            // Arrange -------
            var onScopeDispose = vi.fn();
            var scope = createContainerBuilder()
                .use({ onScopeDispose })
                .build();

            // Act -----------
            scope.dispose();

            // Assert --------
            expect(scope.isDisposed).is.true;
            expect(onScopeDispose).toHaveBeenCalledExactlyOnceWith(scope);
        });

        test("WHEN: Dispose scope with child scope", () => {
            // Arrange -------
            var onScopeDispose = vi.fn();
            var rootScope = createContainerBuilder()
                .use({ onScopeDispose })
                .build();
            var childScope = rootScope.scope("child");

            // Act -----------
            rootScope.dispose();

            // Assert --------
            expect(rootScope.isDisposed).is.true;
            expect(childScope.isDisposed).is.true;
            expect(rootScope.hasChildScope(childScope.id)).is.false;
            expect(onScopeDispose).toHaveBeenNthCalledWith(1, childScope);
            expect(onScopeDispose).toHaveBeenNthCalledWith(2, rootScope);
        });

        test("WHEN: Dispose scope with deep child tree", () => {
            // Arrange ------
            var rootScope = createContainerBuilder().build();

            var childA = rootScope.scope("A");
            var childA1 = childA.scope("A1");
            var childA2 = childA.scope("A2");

            var childB = rootScope.scope("B");
            var childB1 = childB.scope("B1");
            var childB2 = childB.scope("B2");

            // Act ----------
            rootScope.dispose();

            // Assert -------
            expect(childA1.isDisposed).is.true;
            expect(childA.hasChildScope(childA1.id)).is.false;
            expect(childA2.isDisposed).is.true;
            expect(childA.hasChildScope(childA2.id)).is.false;
            expect(childA.isDisposed).is.true;

            expect(childB1.isDisposed).is.true;
            expect(childB.hasChildScope(childB1.id)).is.false;
            expect(childB2.isDisposed).is.true;
            expect(childB.hasChildScope(childB2.id)).is.false;
            expect(childB.isDisposed).is.true;

            expect(rootScope.isDisposed).is.true;
            expect(rootScope.hasChildScope(childA.id)).is.false;
            expect(rootScope.hasChildScope(childB.id)).is.false;
        });

        test("WHEN: Dispose already disposed scope", () => {
            // Arrange -------
            var onScopeDispose = vi.fn();
            var rootScope = createContainerBuilder()
                .use({ onScopeDispose })
                .build();
            rootScope.dispose();
            onScopeDispose.mockClear();

            // Act -----------
            rootScope.dispose();

            // Assert --------
            expect(rootScope.isDisposed).is.true;
            expect(onScopeDispose).not.toHaveBeenCalled();
        });

        test("WHEN: Auto-dispose local instances", () => {
            // Arrange -------
            var typeKey = "typeKey";

            var disposeFunc = vi.fn();
            var factory = (_, ctx) => ({
                scopeId: ctx.current,
                dispose() {
                    disposeFunc(this.scopeId);
                },
            });

            var container = createContainerBuilder()
                .bindFactory(typeKey, factory, { lifecycle: "scope" })
                .build();

            container.scope("A").get(typeKey);
            container.scope("B").get(typeKey);
            container.scope("C").get(typeKey);
            container.get(typeKey);

            // Act ---------
            container.dispose();

            // Arrange -----
            expect(disposeFunc).toHaveBeenCalledTimes(4);
            expect(disposeFunc).toHaveBeenCalledWith("A");
            expect(disposeFunc).toHaveBeenCalledWith("B");
            expect(disposeFunc).toHaveBeenCalledWith("C");
            expect(container.isDisposed).is.true;
        });

        test("WHEN: Auto-dispose local instances with 'Symbol.dispose'", () => {
            // Arrange -------
            var typeKey = "typeKey";

            var disposeFunc = vi.fn();
            var factory = (_, ctx) => ({
                scopeId: ctx.current,
                [Symbol.dispose]() {
                    disposeFunc(this.scopeId);
                },
            });

            var container = createContainerBuilder()
                .bindFactory(typeKey, factory, { lifecycle: "scope" })
                .build();

            container.scope("A").get(typeKey);
            container.scope("B").get(typeKey);
            container.scope("C").get(typeKey);
            container.get(typeKey);

            // Act ---------
            container.dispose();

            // Arrange -----
            expect(disposeFunc).toHaveBeenCalledTimes(4);
            expect(disposeFunc).toHaveBeenCalledWith("A");
            expect(disposeFunc).toHaveBeenCalledWith("B");
            expect(disposeFunc).toHaveBeenCalledWith("C");
            expect(container.isDisposed).is.true;
        });

        test("WHEN: Auto-dispose local instance with both Symbol.dispose and dispose methods", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var disposeMethodMock = vi.fn();
            var disposeSymbolMock = vi.fn();
            var factory = () => ({
                dispose: disposeMethodMock,
                [Symbol.dispose]: disposeSymbolMock,
            });

            var container = createContainerBuilder()
                .bindFactory(typeKey, factory, { lifecycle: "scope" })
                .build();

            container.get(typeKey);

            // Act -----------
            container.dispose();

            // Assert --------
            // 1. 'Symbol.dispose' method should be called (has higher priority)
            expect(disposeSymbolMock).toHaveBeenCalledOnce();

            // 2. 'dispose' method should NOT be called to avoid double disposal
            expect(disposeMethodMock).not.toHaveBeenCalled();
        });

        test("WHEN: Auto-dispose local instance with callable dispose property", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var factory = () => ({ dispose: 42 });
            var container = createContainerBuilder()
                .bindFactory(typeKey, factory, { lifecycle: "scope" })
                .build();

            container.get(typeKey);

            // Act -----------
            container.dispose();

            // Assert --------
            // Should not to call 'dispose' value as function
            expect(container.isDisposed).is.true;
        });

        test("WHEN: Dispose scope with local instances twice", () => {
            // Arrange -------
            var typeKey = "typeKey";

            var disposeFunc = vi.fn();
            var factory = (_, ctx) => ({
                scopeId: ctx.current,
                dispose() {
                    disposeFunc(this.scopeId);
                },
            });

            var container = createContainerBuilder()
                .bindFactory(typeKey, factory, { lifecycle: "scope" })
                .build();

            container.scope("A").get(typeKey);
            container.scope("B").get(typeKey);
            container.scope("C").get(typeKey);
            container.get(typeKey);
            container.dispose();

            // Act ---------
            container.dispose();

            // Arrange -----
            expect(disposeFunc).toHaveBeenCalledTimes(4);
            expect(disposeFunc).toHaveBeenCalledWith("A");
            expect(disposeFunc).toHaveBeenCalledWith("B");
            expect(disposeFunc).toHaveBeenCalledWith("C");
            expect(container.isDisposed).is.true;
        });

        test("WHEN: Trying to get instance from disposed root scope", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var container = createContainerBuilder()
                .bindInstance(typeKey, 42)
                .build();

            container.dispose();

            // Act -----------
            var error = catchError(() => {
                container.get(typeKey);
            });

            // Assert --------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual(
                DIErrors.InstanceAccessAfterDispose(
                    typeKey,
                    container.id,
                    container.path,
                ),
            );
        });

        test("WHEN: Trying to get instance from disposed scope", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var container = createContainerBuilder()
                .bindInstance(typeKey, 42)
                .build();

            var scope = container.scope("A").scope("B").scope("C");
            scope.dispose();

            // Act -----------
            var error = catchError(() => {
                scope.get(typeKey);
            });

            // Assert --------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual(
                DIErrors.InstanceAccessAfterDispose(
                    typeKey,
                    scope.id,
                    scope.path,
                ),
            );
        });

        test("WHEN: Trying to open child scope from disposed scope", () => {
            // Arrange -----
            var childScopeId = "child";
            var container = createContainerBuilder().build();
            var scope = container.scope("A").scope("B").scope("C");
            scope.dispose();

            // Act ---------
            var error = catchError(() => {
                scope.scope(childScopeId);
            });

            // Assert ------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual(
                DIErrors.ChildScopeCreationAfterDispose(
                    childScopeId,
                    scope.id,
                    scope.path,
                ),
            );
        });
    });
});

describe("Container Module", () => {
    test("WHEN: Define static module", () => {
        // Arrange ---------
        var moduleName = "testModule";
        var delegate = vi.fn();

        // Act -------------
        var myModule = staticModule(moduleName).create(delegate);

        // Assert ----------
        expect(myModule.id).toBe(moduleName);
        expect(myModule.type).toBe("static");
        expect(myModule.delegate).toBe(delegate);
        expect(delegate).not.toHaveBeenCalled();
    });
});
