import { DIContainer } from "./DIContainer";
import {
    makeRegistrar,
    makeFactoryEntryMock,
    makeInstanceEntryMock,
} from "./__test__/mocks";
import { catchError } from "./__test__/errors";
import { IInstanceResolver } from "./types";
import { InstanceActivator } from "./internal/InstanceActivator";

describe("DIContainer", () => {
    describe("Resolve type instance", () => {
        test("Get a registered instance", () => {
            type TypeMap = { value: number };

            // Arrange ----------
            const expectedValue = 42;
            const container = new DIContainer<TypeMap>(
                makeRegistrar(
                    makeInstanceEntryMock<TypeMap>("value", expectedValue),
                ),
                new InstanceActivator(),
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
                makeRegistrar(makeFactoryEntryMock<TypeMap>("value", factory)),
                new InstanceActivator(),
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
                makeRegistrar(),
                new InstanceActivator(),
            );

            // Act --------------
            const error = catchError(() => container.get("value"));

            // Arrange ----------
            expect(error).not.toBeUndefined();
            expect(error?.message).toContain("value");
        });

        test("Singletons prepare when container created", () => {
            type TypeMap = { value: number };

            // Arrange --------
            const factory = jest.fn(() => 42);
            const factoryEntry = makeFactoryEntryMock<TypeMap>(
                "value",
                factory,
            );
            const map = makeRegistrar(factoryEntry);

            // Act -----------
            new DIContainer(map, new InstanceActivator());

            // Expect --------
            expect(factory).toHaveBeenCalledTimes(1);
        });

        test("Lazy singleton do not prepared when container created", () => {
            type TypeMap = { value: number };

            // Arrange --------
            const factory = jest.fn(() => 42);
            const factoryEntry = makeFactoryEntryMock<TypeMap>(
                "value",
                factory,
                "lazy",
            );
            const map = makeRegistrar(factoryEntry);

            // Act -----------
            new DIContainer(map, new InstanceActivator());

            // Expect --------
            expect(factory).toHaveBeenCalledTimes(0);
        });

        test("Lazy singleton created on required", () => {
            type TypeMap = { value: object };

            // Arrange ------------
            const factory = jest.fn(() => new Object());
            const container = new DIContainer(
                makeRegistrar(
                    makeFactoryEntryMock<TypeMap>("value", factory, "lazy"),
                ),
                new InstanceActivator(),
            );

            // Act -----------------
            const valueA = container.get("value");
            const valueB = container.get("value");

            // Assert --------------
            expect(factory).toHaveBeenCalledTimes(1);
            expect(valueA).toBe(valueB);
        });

        test("Get transient instance", () => {
            type TypeMap = { value: object };

            // Arrange ------------
            const factory = jest.fn(() => new Object());
            const container = new DIContainer(
                makeRegistrar(
                    makeFactoryEntryMock<TypeMap>(
                        "value",
                        factory,
                        "transient",
                    ),
                ),
                new InstanceActivator(),
            );

            // Act -----------------
            const valueA = container.get("value");
            const valueB = container.get("value");

            // Assert --------------
            expect(factory).toHaveBeenCalledTimes(2);
            expect(valueA).not.toBe(valueB);
        });

        test("Get instance with dependency", () => {
            type TypeMap = { valueA: string; valueB: string };
            const factory = jest.fn(
                (r: IInstanceResolver<TypeMap>) => `${r.get("valueA")}World`,
            );
            const container = new DIContainer(
                makeRegistrar(
                    makeInstanceEntryMock<TypeMap>("valueA", "Hello"),
                    makeFactoryEntryMock<TypeMap>("valueB", factory),
                ),
                new InstanceActivator(),
            );

            // Act ------------
            const value = container.get("valueB");

            // Assert --------
            expect(value).toBe("HelloWorld");
            expect(factory).toHaveBeenCalledTimes(1);
        });

        test("Get instance provider", () => {
            type TypeMap = { value: string };

            // Arrange ------------
            const expectedValue = "Hello";
            const factory = jest.fn(() => expectedValue);
            const container = new DIContainer(
                makeRegistrar(
                    makeFactoryEntryMock<TypeMap>("value", factory, "lazy"),
                ),
                new InstanceActivator(),
            );
            const valueProvider = container.getProvider("value");

            // Assert before -----------
            expect(factory).not.toHaveBeenCalled();

            // Act -------
            const value = valueProvider();

            // Assert --------
            expect(factory).toHaveBeenCalledTimes(1);
            expect(value).toBe(expectedValue);
        });

        test("Get named instance", () => {
            type TypeMap = { value: number };

            // Arrange ------------
            const container = new DIContainer(
                makeRegistrar(
                    makeInstanceEntryMock<TypeMap>("value", 1),
                    makeInstanceEntryMock<TypeMap>("value", 2, "foo"),
                    makeInstanceEntryMock<TypeMap>("value", 3, "bar"),
                ),
                new InstanceActivator(),
            );

            // Act -----------
            const value = container.get("value");
            const valueFoo = container.get("value", "foo");
            const valueBar = container.get("value", "bar");

            // Assert --------
            expect(value).toBe(1);
            expect(valueFoo).toBe(2);
            expect(valueBar).toBe(3);
        });
    });
});
