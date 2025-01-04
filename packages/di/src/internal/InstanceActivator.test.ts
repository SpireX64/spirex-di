import {
    createMockResolver,
    makeFactoryEntryMock,
    makeInstanceEntryMock,
} from "../__test__/mocks";
import { InstanceActivator } from "./InstanceActivator";

describe("InstanceActivator", () => {
    test("Activate instance entry", () => {
        // Arrange -------
        const instanceEntry = makeInstanceEntryMock("value", 42);
        const resolver = createMockResolver();
        const activator = new InstanceActivator();

        // Act -----------
        const instance = activator.createInstance(instanceEntry, resolver);

        expect(instance).toBe(instanceEntry.instance);
    });

    test("Activate factory entry", () => {
        // Arrange --------
        const expectedValue = 42;
        const factoryEntry = makeFactoryEntryMock(
            "value",
            jest.fn(() => expectedValue),
        );
        const resolver = createMockResolver();
        const activator = new InstanceActivator();

        // Act ------------
        const instance = activator.createInstance(factoryEntry, resolver);

        // Assert ---------
        expect(instance).toBe(expectedValue);
        expect(factoryEntry.factory).toHaveBeenCalledTimes(1);
    });

    test("Activate 2-level factory chain", () => {
        type TypeMap = { v1: number; v2: string };

        // Arrange ----------
        const factoryEntry = makeFactoryEntryMock<TypeMap>(
            "v2",
            jest.fn((r) => r.get("v1").toString() + "px"),
        );
        const resolver = createMockResolver<TypeMap>({ v1: 42 });
        const activator = new InstanceActivator<TypeMap>();

        // Act -------------
        const instance = activator.createInstance(factoryEntry, resolver);

        // Assert ----------
        expect(instance).toBe("42px");

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(resolver.get).toHaveBeenCalled();
        expect(factoryEntry.factory).toHaveBeenCalledTimes(1);
    });
});
