import { describe, test, expect } from "vitest";
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
            test("WHEN binding instance or value to the container type", () => {
                // Arrange ----
                var typeKey = "typeKey";
                var builder = createContainerBuilder();

                // Act --------
                builder.bindInstance(typeKey, 42);

                // Assert -----
                expect(builder.hasEntry(typeKey)).to.be.true;
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
