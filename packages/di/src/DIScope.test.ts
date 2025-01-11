import { DIScope } from "./DIScope";

describe("DIScope", () => {
    describe("Create scope instance", () => {
        test("Create instance with string id", () => {
            // Arrange ----
            const id = "scope-id";
            // Act --------
            const scope = new DIScope(id);
            // Assert -----
            expect(scope.id).toBe(id);
        });

        test("Create instance with symbol id", () => {
            // Arrange ----
            const id = Symbol("scope-id");
            // Act --------
            const scope = new DIScope(id);
            // Assert -----
            expect(scope.id).toBe(id);
        });
    });
});
