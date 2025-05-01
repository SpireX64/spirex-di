import { describe, test, expect } from "vitest";
import { createContainerBuilder } from "./index";

describe("ContainerBuilder", () => {
    describe("create", () => {
        test("createContainerBuilder", () => {
            // Arrange ---------------

            // Act -------------------
            const builder = createContainerBuilder();

            // Assert ----------------
            expect(builder).toBeInstanceOf(Object);
        });
    });
});
