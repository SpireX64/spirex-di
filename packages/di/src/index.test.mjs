import { vi, describe, test, expect } from "vitest";
import { createContainerBuilder } from "./index";

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
                builder.bindInstance(typeKey);

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
        });
    });

    describe("BuildContainer", () => {
        test("WHEN build", () => {
            // Arrange --------
            var builder = createContainerBuilder();

            // Act ---------
            var container = builder.build();

            // Assert -----
            expect(container).to.be.an.instanceOf(Object);
        });
    });
});
