import { vi, describe, test, expect } from "vitest";
import { createContainerBuilder } from "./index";

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
                expect(instanceEntry.type).to.equal(typeKey);
                expect("instance" in instanceEntry).to.be.true;
                expect(instanceEntry.instance).to.equal(expectedValue);
                expect("factory" in instanceEntry).to.be.false;
                expect(instanceEntry.factory).to.be.undefined;
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
                expect(factoryEntry.type).to.equal(typeKey);
                expect("factory" in factoryEntry).to.be.true;
                expect(factoryEntry.factory).to.equal(factoryMockFn);
                expect("instance" in factoryEntry).to.be.false;
                expect(factoryEntry.instance).to.be.undefined;
            });
        });
    });

    describe("BuildContainer", () => {
        test("WHEN build", () => {
            // Arrnage --------
            var builder = createContainerBuilder();

            // Act ---------
            const container = builder.build();

            // Assert -----
            expect(container).to.be.an.instanceOf(Object);
        });
    });
});
