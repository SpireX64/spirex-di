import { staticModuleFactory } from "./staticModuleFactory";

describe("StaticModule", () => {
    test("create", () => {
        // Arrange -------
        const expectedName = "myStaticModule";
        const expectedNumberValue = 4312;
        const expectedStringValue = "Qwerty";

        // Act ----------
        const staticModule = staticModuleFactory(expectedName).create<{
            value: number;
            strValue: string;
        }>(
            jest.fn((builder) => {
                builder.bindInstance("strValue", expectedStringValue);
                builder.bindInstance("value", expectedNumberValue);
            }),
        );

        // Assert ------
        expect(staticModule.type).toBe("static");
        expect(staticModule.name).toBe(expectedName);
        expect(staticModule.builderDelegate).not.toHaveBeenCalled();
    });
});
