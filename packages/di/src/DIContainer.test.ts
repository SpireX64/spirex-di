import { DIContainer } from "./DIContainer";
import {
    makeEntriesMap,
    makeFactoryEntryMock,
    makeInstanceEntryMock,
} from "./__test__/mocks";
import { catchError } from "./__test__/errors";

describe("DIContainer", () => {
    describe("Resolve type instance", () => {
        test("Get a registered instance", () => {
            type TypeMap = { value: number };

            // Arrange ----------
            const expectedValue = 42;
            const container = new DIContainer<TypeMap>(
                makeEntriesMap(
                    makeInstanceEntryMock<TypeMap>("value", expectedValue),
                ),
            );

            // Act --------------
            const value = container.get("value");

            // Arrange ----------
            expect(value).toBe(expectedValue);
        });

        test("Get a registered factory", () => {
            type TypeMap = { value: number };

            // Arrange ----------
            const expectedValue = 42;
            const factory = jest.fn(() => expectedValue);
            const container = new DIContainer<TypeMap>(
                makeEntriesMap(makeFactoryEntryMock<TypeMap>("value", factory)),
            );

            // Act --------------
            const value = container.get("value");

            // Arrange ----------
            expect(value).toBe(expectedValue);
            expect(factory).toHaveBeenCalledTimes(1);
        });

        test("Throw when get an unregister type", () => {
            // Arrange ----------
            const container = new DIContainer<{ value: number }>(
                makeEntriesMap(),
            );

            // Act --------------
            const error = catchError(() => container.get("value"));

            // Arrange ----------
            expect(error).not.toBeUndefined();
            expect(error?.message).toContain("value");
        });
    });
});
