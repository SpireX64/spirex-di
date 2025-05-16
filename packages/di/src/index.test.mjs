import { vi, describe, test, expect } from "vitest";
import { createContainerBuilder } from "./index";
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
 * const error = catchError(() => {
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
describe("ContainerBuilder", () => {
    describe("Create", () => {
        test("WHEN use default factory", () => {
            // Act -------------------
            var builder = createContainerBuilder();

            // Assert ----------------
            expect(builder).instanceOf(Object);
        });
    });

    describe("Checking", () => {
        describe("hasEntry", () => {
            test("WHEN type have no bindings", () => {
                // Arrange ------
                var builder = createContainerBuilder();

                // Act ----------
                var result = builder.hasEntry("typeKey");

                // Assert -------
                expect(result).to.be.false;
            });

            test("WHEN type have a binding", () => {
                // Arrange ------
                var typeKey = "typeKey";
                var builder = createContainerBuilder();
                builder.bindInstance(typeKey, 42);

                // Act ----------
                var result = builder.hasEntry("typeKey");

                // Assert -------
                expect(result).to.be.true;
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
                expect(builder.hasEntry(typeKey)).to.be.true;
                expect(chainingBuilderRef).to.equal(builder);

                expect(instanceEntry).instanceOf(Object);
                expect(instanceEntry).to.be.frozen;
                expect(instanceEntry.type).to.equal(typeKey);
                expect(instanceEntry.name).is.undefined;
                expect("instance" in instanceEntry).to.be.true;
                expect(instanceEntry.instance).to.equal(expectedValue);
                expect("factory" in instanceEntry).to.be.false;
                expect(instanceEntry.factory).to.be.undefined;
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
                expect(builder.hasEntry(typeKey)).to.be.false;
                expect(instanceEntryWithoutName).is.undefined;

                expect(builder.hasEntry(typeKey, name)).to.be.true;
                expect(instanceEntry).instanceOf(Object);
                expect(instanceEntry).to.be.frozen;
                expect(instanceEntry.type).to.equal(typeKey);
                expect(instanceEntry.name).to.equal(name);
                expect("instance" in instanceEntry).to.be.true;
                expect(instanceEntry.instance).to.equal(expectedValue);
                expect("factory" in instanceEntry).to.be.false;
                expect(instanceEntry.factory).to.be.undefined;
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
                expect(builder.hasEntry(typeKey)).to.be.true;
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
                expect(builder.hasEntry(typeKey)).to.be.false;
                expect(factoryEntryWithoutName).is.undefined;

                expect(builder.hasEntry(typeKey, name)).to.be.true;
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

        describe("Alias", () => {
            test("WHEN bind alias for type", () => {
                // Arrange ---------
                var typeKey = "typeKey";
                var aliasKey = "aliasKey";
                var builder = createContainerBuilder();
                builder.bindInstance(typeKey, "value");

                // Act -------------
                builder.bindAlias(aliasKey, typeKey);

                var hasAliasEntry = builder.hasEntry(aliasKey);
                var originEntry = builder.findEntry(typeKey);
                var aliasEntry = builder.findEntry(aliasKey);

                // Assert ----------
                expect(hasAliasEntry).is.true;
                expect(aliasEntry).toBeDefined();
                expect(originEntry).toBeDefined();
                expect(aliasEntry).toBe(originEntry);
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

                var hasAliasEntryWithoutName = builder.hasEntry(aliasKey);
                var hasAliasEntryWithName = builder.hasEntry(
                    aliasKey,
                    aliasName,
                );

                var aliasEntryWithoutName = builder.findEntry(aliasKey);
                var aliasEntryWithName = builder.findEntry(aliasKey, aliasName);

                var originEntry = builder.findEntry(typeKey);

                // Assert ---------
                expect(hasAliasEntryWithoutName).is.false;
                expect(hasAliasEntryWithName).is.true;

                expect(originEntry).toBeDefined();
                expect(aliasEntryWithoutName).is.undefined;
                expect(aliasEntryWithName).toBe(originEntry);
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

                var hasAliasEntry = builder.hasEntry(aliasKey);
                var originEntry = builder.findEntry(typeKey, typeName);
                var aliasEntry = builder.findEntry(aliasKey);

                // Assert ---------
                expect(hasAliasEntry).is.true;
                expect(originEntry).toBeDefined();
                expect(aliasEntry).toBe(originEntry);
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

                var hasAliasEntryWithoutName = builder.hasEntry(aliasKey);
                var hasAliasEntryWithName = builder.hasEntry(
                    aliasKey,
                    aliasName,
                );

                var aliasEntryWithoutName = builder.findEntry(aliasKey);
                var aliasEntryWithName = builder.findEntry(aliasKey, aliasName);

                var originEntry = builder.findEntry(typeKey, typeName);

                // Assert ---------
                expect(hasAliasEntryWithoutName).is.false;
                expect(hasAliasEntryWithName).is.true;

                expect(originEntry).toBeDefined();
                expect(aliasEntryWithoutName).is.undefined;
                expect(aliasEntryWithName).toBe(originEntry);
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

                var hasFirstAliasEntry = builder.hasEntry(firstAliasKey);
                var hasSecondAliasEntry = builder.hasEntry(secondAliasKey);

                var originEntry = builder.findEntry(originType);
                var firstAliasEntry = builder.findEntry(firstAliasKey);
                var secondAliasEntry = builder.findEntry(secondAliasKey);

                // Assert ----------
                expect(hasFirstAliasEntry).is.true;
                expect(hasSecondAliasEntry).is.true;
                expect(originEntry).toBeDefined();
                expect(firstAliasEntry).toBe(originEntry);
                expect(secondAliasEntry).toBe(originEntry);
            });

            test("WHEN bind alias cycle", () => {
                // Arrange --------
                var builder = createContainerBuilder().bindAlias("A", "B");

                // Act ------------
                var error = catchError(() => builder.bindAlias("B", "A"));

                // Assert ---------
                expect(error).is.not.undefined;
                expect(error.message).to.equal(
                    DIErrors.AliasCycle(["B", "A", "B"]),
                );
            });

            test("WHEN bind self cycle alias", () => {
                // Arrange ------
                var aliasKey = "A";
                var builder = createContainerBuilder();

                // Act ---------
                var error = catchError(() =>
                    builder.bindAlias(aliasKey, aliasKey),
                );

                // Assert ------
                expect(error).is.not.undefined;
                expect(error.message).to.equal(
                    DIErrors.AliasCycle([aliasKey, aliasKey]),
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

                    var aliasRef = builder.getAlias(aliasKey);

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
                    var aliasRef = builder.getAlias(aliasKey);

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
                    var aliasRef = builder.getAlias(aliasKey);

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
                    var aliasRef = builder.getAlias(aliasKey);

                    // Assert ------
                    expect(aliasRef).to.equal(typeKey);
                });
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
            expect(container).to.be.an.instanceOf(Object);
        });

        describe("Aliases building", () => {
            describe("Verify alias origin type exist", () => {
                test("WHEN alias origin type is exists", () => {
                    // Arrange -------
                    var builder = createContainerBuilder()
                        .bindInstance("typeKey", 42)
                        .bindAlias("aliasKey", "typeKey");

                    // Act -----------
                    var container = builder.build();

                    // Assert --------
                    expect(container).instanceOf(Object);
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
                test("WHEN no optimization required", () => {
                    // Arrange --------
                    var typeKey = "typeKey";
                    var aliasKey = "aliasKey";
                    var builder = createContainerBuilder()
                        .bindInstance(typeKey, 42)
                        .bindAlias(aliasKey, typeKey);

                    // Act ------------
                    var aliasRefBefore = builder.getAlias(aliasKey);

                    builder.build();

                    var aliasRefAfter = builder.getAlias(aliasKey);

                    // Assert ---------
                    expect(aliasRefBefore).toBe(typeKey);
                    expect(aliasRefAfter).toBe(aliasRefBefore);
                });

                test("WHEN optimization performed", () => {
                    // Arrange ----------
                    var typeKey = "typeKey";
                    var aliasA = "aliasA";
                    var aliasB = "aliasB";
                    var aliasC = "aliasC";
                    var aliasD = "aliasD";

                    var builder = createContainerBuilder()
                        .bindInstance(typeKey, 42)
                        .bindAlias(aliasA, typeKey)
                        .bindAlias(aliasB, aliasA)
                        .bindAlias(aliasC, aliasB)
                        .bindAlias(aliasD, aliasC);

                    // Act --------------
                    var aliasABefore = builder.getAlias(aliasA);
                    var aliasBBefore = builder.getAlias(aliasB);
                    var aliasCBefore = builder.getAlias(aliasC);
                    var aliasDBefore = builder.getAlias(aliasD);

                    builder.build();

                    var aliasAAfter = builder.getAlias(aliasA);
                    var aliasBAfter = builder.getAlias(aliasB);
                    var aliasCAfter = builder.getAlias(aliasC);
                    var aliasDAfter = builder.getAlias(aliasD);

                    // Assert -----------
                    expect(aliasABefore).toBe(typeKey);
                    expect(aliasAAfter).toBe(typeKey);

                    expect(aliasBBefore).toBe(aliasA);
                    expect(aliasBAfter).toBe(typeKey);

                    expect(aliasCBefore).toBe(aliasB);
                    expect(aliasCAfter).toBe(typeKey);

                    expect(aliasDBefore).toBe(aliasC);
                    expect(aliasDAfter).toBe(typeKey);
                });
            });
        });
    });
});
