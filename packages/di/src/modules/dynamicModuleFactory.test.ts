import { catchError } from "../__test__/errors";
import { Errors } from "../errors";
import { dynamicModuleFactory } from "./dynamicModuleFactory";

describe("DynamicModule", () => {
    test("create", () => {
        // Arrange --------
        const expectedModuleName = "myDynamicModule";
        const dynamicJsModule = { asd: 42, foo: "bar" };
        const moduleDelegate = jest.fn(() => Promise.resolve(dynamicJsModule));

        // Act ------------
        const myDynamicModule = dynamicModuleFactory(
            expectedModuleName,
            moduleDelegate,
        ).create<{ value: number; strValue: string }>(
            jest.fn((builder, { foo, asd }) => {
                builder.bindInstance("strValue", foo.valueOf());
                builder.bindFactory("value", () => asd.valueOf());
            }),
        );

        // Assert --------
        expect(myDynamicModule.type).toBe("dynamic");
        expect(myDynamicModule.name).toBe(expectedModuleName);
        expect(Object.isFrozen(myDynamicModule)).toBeTruthy();
        expect(myDynamicModule.builderDelegate).not.toHaveBeenCalled();
        expect(myDynamicModule.importDelegate).toBe(moduleDelegate);
        expect(moduleDelegate).not.toHaveBeenCalled();
    });

    test("invalidName", () => {
        // Assert ----
        const invalidName = "  moduleName ";
        const dynamicJsModule = { asd: 42, foo: "bar" };
        const moduleDelegate = jest.fn(() => Promise.resolve(dynamicJsModule));

        // Act -------
        const error = catchError(() =>
            dynamicModuleFactory(invalidName, moduleDelegate),
        );

        // Assert ----
        expect(error).toBeDefined();
        expect(error?.message).toEqual(Errors.InvalidModuleName(invalidName));
    });
});
