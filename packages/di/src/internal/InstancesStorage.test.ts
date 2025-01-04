import { InstancesStorage } from "./InstancesStorage";

describe("InstancesStorage", () => {
    test("New instance", () => {
        // Act ----------
        const storage = new InstancesStorage();

        // Assert ------
        expect(storage.isEmpty).toBeTruthy();
    });

    test("Trying to get not stored instance", () => {
        // Arrange -------
        const storage = new InstancesStorage<{ value: string }>();

        // Act -----------
        const value = storage.getInstance("value");

        // Assert --------
        expect(value).toBeNull();
    });

    test("Store instance", () => {
        // Arrange --------
        const expectedValue = 42;
        const storage = new InstancesStorage<{ value: number }>();

        // Act ------------
        storage.storeInstance("value", expectedValue);

        // Assert ---------
        expect(storage.isEmpty).toBeFalsy();
        expect(storage.getInstance("value")).toBe(expectedValue);
    });
});
