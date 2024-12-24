import { DIContainerBuilder } from "./DIContainerBuilder";

describe("DIContainerBuilder", () => {
    test("Create builder instance", () => {
        // Act ----------
        const builder = new DIContainerBuilder();

        // Assert -------
        expect(builder).toBeInstanceOf(DIContainerBuilder);
    });

    test("Bind instance", () => {
        // Arrange ------
        const expectedTypeKey = "typeKey";
        const expectedValue = 42;
        const builder = new DIContainerBuilder<{ typeKey: number }>();

        // Act ----------
        const builderRef = builder.bindInstance(expectedTypeKey, expectedValue);
        const typeEntry = builder.getTypeEntry(expectedTypeKey);

        // Arrange ------
        expect(builderRef).toBeInstanceOf(DIContainerBuilder);
        expect(typeEntry).not.toBeNull();
        expect(typeEntry?.type).toBe(expectedTypeKey);
        expect(typeEntry?.instance).toBe(expectedValue);
        expect(typeEntry?.factory).toBeUndefined();
    });

    test("Bind factory", () => {
        // Arrange ------
        const expectedTypeKey = "typeKey";
        const factory = jest.fn(() => "lorem");
        const builder = new DIContainerBuilder<{ typeKey: string }>();

        // Act ----------
        const builderRef = builder.bindFactory(expectedTypeKey, factory);
        const typeEntry = builder.getTypeEntry(expectedTypeKey);

        // Assert -------
        expect(builderRef).toBeInstanceOf(DIContainerBuilder);
        expect(typeEntry).not.toBeNull();
        expect(typeEntry?.type).toBe(expectedTypeKey);
        expect(typeEntry?.factory).toBe(factory);
        expect(typeEntry?.instance).toBeUndefined();
        expect(factory).not.toHaveBeenCalled();
    });
});
