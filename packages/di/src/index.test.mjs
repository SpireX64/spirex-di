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
    });

    describe("Binding", () => {
        describe("Instance", () => {
            test("WHEN binding instance or value to the type", () => {
                // Arrange ----
                var typeKey = "typeKey";
                var builder = createContainerBuilder();

                // Act --------
                var chainingBuilderRef = builder.bindInstance(typeKey, 42);

                // Assert -----
                expect(builder.hasEntry(typeKey)).to.be.true;
                expect(chainingBuilderRef).to.equal(builder);
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

                // Assert ------
                expect(builder.hasEntry(typeKey)).to.be.true;
                expect(factoryMockFn).not.toHaveBeenCalled();
                expect(chainingBuilderRef).to.equal(builder);
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
