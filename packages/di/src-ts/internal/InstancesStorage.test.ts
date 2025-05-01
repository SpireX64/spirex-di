import { InstancesStorage } from "./InstancesStorage";
import { makeFactoryEntryMock, makeInstanceEntryMock } from "../__test__/mocks";

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

    test("Clear storage", () => {
        type TypeMap = { value: number };

        // Arrange ---------
        const entry = makeInstanceEntryMock<TypeMap>("value", 42);
        const storage = new InstancesStorage<TypeMap>();

        storage.storeInstance(entry, 42);
        const notEmptyBeforeClear = storage.isEmpty;

        // Act -------
        storage.clear();

        // Assert ------
        expect(notEmptyBeforeClear).toBeFalsy();
        expect(storage.isEmpty).toBeTruthy();
        expect(storage.getInstance(entry)).toBeNull();
    });
});
