import { InstancesStorage } from "./InstancesStorage";
import { makeFactoryEntryMock } from "../__test__/mocks";

describe("InstancesStorage", () => {
    test("New instance", () => {
        // Act ----------
        const storage = new InstancesStorage();

        // Assert ------
        expect(storage.isEmpty).toBeTruthy();
    });

    test("Trying to get not stored instance", () => {
        type TypeMap = { value: number };

        // Arrange -------
        const expectedValue = 42;
        const entry = makeFactoryEntryMock<TypeMap>(
            "value",
            () => expectedValue,
        );
        const storage = new InstancesStorage<TypeMap>();

        // Act -----------
        const value = storage.getInstance(entry);

        // Assert --------
        expect(value).toBeNull();
    });

    test("Store instance", () => {
        type TypeMap = { value: number };

        // Arrange --------
        const expectedValue = 42;
        const entry = makeFactoryEntryMock<TypeMap>(
            "value",
            () => expectedValue,
        );
        const storage = new InstancesStorage<{ value: number }>();

        // Act ------------
        storage.storeInstance(entry, expectedValue);

        // Assert ---------
        expect(storage.isEmpty).toBeFalsy();
        expect(storage.getInstance(entry)).toBe(expectedValue);
    });
});
