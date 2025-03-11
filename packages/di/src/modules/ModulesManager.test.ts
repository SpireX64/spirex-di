import { ModulesManager } from "./ModulesManager";
import { dynamicModuleFactory } from "./dynamicModuleFactory";
import { staticModuleFactory } from "./staticModuleFactory";
import { catchError, catchErrorAsync } from "../__test__/errors";
import { Errors } from "../errors";

class MockClass {
    data: number;
    constructor() {
        this.data = 12;
    }
}

describe("ModulesManager", () => {
    describe("addModule", () => {
        describe("static", () => {
            test("addOnce", () => {
                // Arrange ---------
                const buildDelegate = jest.fn();
                const staticModule =
                    staticModuleFactory("staticModule").create(buildDelegate);

                const manager = new ModulesManager();

                const hasBeforeAdd = manager.has(staticModule);
                const countBeforeAdd = manager.count;

                // Act --------------
                manager.add(staticModule);

                // Assert -----------
                expect(hasBeforeAdd).toBeFalsy();
                expect(countBeforeAdd).toBe(0);
                expect(manager.has(staticModule)).toBeTruthy();
                expect(manager.count).toBe(1);
                expect(buildDelegate).not.toHaveBeenCalled();
            });

            test("addTwice", () => {
                // Arrange ---------
                const buildDelegate = jest.fn();
                const staticModule =
                    staticModuleFactory("staticModule").create(buildDelegate);

                const manager = new ModulesManager();
                manager.add(staticModule);

                const hasBeforeAddTwice = manager.has(staticModule);
                const countBeforeAddTwice = manager.count;

                // Act --------------
                manager.add(staticModule);

                // Assert -----------
                expect(hasBeforeAddTwice).toBeTruthy();
                expect(countBeforeAddTwice).toBe(1);
                expect(manager.has(staticModule)).toBeTruthy();
                expect(manager.count).toBe(1);
                expect(buildDelegate).not.toHaveBeenCalled();
            });
        });
        describe("dynamic", () => {
            test("addOnce", () => {
                // Arrange ------------
                const importDelegate = jest.fn(() => Promise.resolve({}));
                const buildDelegate = jest.fn();
                const dynamicModule = dynamicModuleFactory(
                    "dynamicModule",
                    importDelegate,
                ).create(buildDelegate);

                const manager = new ModulesManager();
                const hasBeforeAdd = manager.has(dynamicModule);
                const countBeforeAdd = manager.count;

                // Act ----------------
                manager.add(dynamicModule);

                // Assert -------------
                expect(hasBeforeAdd).toBeFalsy();
                expect(countBeforeAdd).toBe(0);
                expect(manager.has(dynamicModule)).toBeTruthy();
                expect(manager.count).toBe(1);
                expect(importDelegate).not.toHaveBeenCalled();
                expect(buildDelegate).not.toHaveBeenCalled();
            });

            test("addTwice", () => {
                // Arrange ------------
                const importDelegate = jest.fn(() => Promise.resolve({}));
                const buildDelegate = jest.fn();
                const dynamicModule = dynamicModuleFactory(
                    "dynamicModule",
                    importDelegate,
                ).create(buildDelegate);

                const manager = new ModulesManager();
                manager.add(dynamicModule);
                const hasBeforeAddTwice = manager.has(dynamicModule);
                const countBeforeAddTwice = manager.count;

                // Act ----------------
                manager.add(dynamicModule);

                // Assert -------------
                expect(hasBeforeAddTwice).toBeTruthy();
                expect(countBeforeAddTwice).toBe(1);
                expect(manager.has(dynamicModule)).toBeTruthy();
                expect(manager.count).toBe(1);
                expect(importDelegate).not.toHaveBeenCalled();
                expect(buildDelegate).not.toHaveBeenCalled();
            });
        });
    });

    describe("stubJSModule", () => {
        test("create", () => {
            // Arrange -----------
            const importDelegate = jest.fn(() => Promise.resolve({}));
            const buildDelegate = jest.fn();
            const dynamicModule = dynamicModuleFactory(
                "dynamicModule",
                importDelegate,
            ).create(buildDelegate);

            const manager = new ModulesManager();

            const stubModule = manager.getESModule(dynamicModule);

            expect(importDelegate).not.toHaveBeenCalled();
            expect(buildDelegate).not.toHaveBeenCalled();
            expect(stubModule).not.toBeNull();
        });

        describe("moduleStub", () => {
            describe("beforeLoad", () => {
                test("accessMember", () => {
                    // Arrange ---------
                    const realModule = {
                        numberValue: 42,
                        stringValue: "FooBar",
                        deep: { level: { velue: 123 } },
                        func: () => {},
                        Cls: MockClass,
                    };

                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);

                    const manager = new ModulesManager();

                    // Act ------------
                    const stub = manager.getESModule(dynamicModule);

                    // Assert ---------
                    expect(stub).toBeDefined();
                    expect(stub.numberValue).toBeDefined();
                    expect(stub.numberValue).not.toBe(realModule.numberValue);
                    expect(stub.stringValue).toBeDefined();
                    expect(stub.stringValue).not.toBe(realModule.stringValue);
                    expect(stub.deep.level.velue).toBeDefined();
                    expect(stub.deep.level.velue).not.toBe(
                        realModule.deep.level.velue,
                    );
                    expect(stub.Cls).toBeDefined();
                    expect(stub.Cls).not.toBe(realModule.Cls);
                });

                test("call stub", () => {
                    // Assert --------
                    const realModule = () => {};
                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);
                    const manager = new ModulesManager();
                    const stub = manager.getESModule(dynamicModule);

                    // Act ----------
                    const error = catchError(stub);

                    // Assert -------
                    expect(error).toBeDefined();
                    expect(error?.message).toEqual(
                        Errors.DynamicModuleStubAccess,
                    );
                });

                test("callFunc", () => {
                    // Arrange ------------
                    const realModule = { func: jest.fn() };
                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);
                    const manager = new ModulesManager();
                    const stub = manager.getESModule(dynamicModule);
                    const funcAccessor = stub.func;

                    // Act ----------------
                    const error = catchError(() => {
                        stub.func();
                    });
                    const errorAccessor = catchError(() => {
                        funcAccessor();
                    });

                    // Assert -------------
                    expect(realModule.func).not.toHaveBeenCalled();
                    expect(error).toBeDefined();
                    expect(error?.message).toEqual(
                        Errors.DynamicModuleFunctionCall(
                            dynamicModule.name,
                            "func",
                        ),
                    );
                    expect(errorAccessor).toBeDefined();
                    expect(errorAccessor?.message).toEqual(
                        Errors.DynamicModuleFunctionCall(
                            dynamicModule.name,
                            "func",
                        ),
                    );
                });

                test("createClassInstance", () => {
                    // Arrange ------------
                    const realModule = { Cls: MockClass };
                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);
                    const manager = new ModulesManager();
                    const stub = manager.getESModule(dynamicModule);
                    const clsAccessor = stub.Cls;

                    // Act ----------------
                    const error = catchError(() => new stub.Cls());
                    const errorAccessor = catchError(() => new clsAccessor());

                    // Assert -------------
                    expect(error).toBeDefined();
                    expect(error?.message).toEqual(
                        Errors.DynamicModuleConstructorCall(
                            dynamicModule.name,
                            "Cls",
                        ),
                    );
                    expect(errorAccessor).toBeDefined();
                    expect(errorAccessor?.message).toEqual(
                        Errors.DynamicModuleConstructorCall(
                            dynamicModule.name,
                            "Cls",
                        ),
                    );
                });

                test("modifyNonObjectModuleMember", () => {
                    // Arrange --------
                    const realModule = 42;
                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);
                    const manager = new ModulesManager();
                    const stub = manager.getESModule(dynamicModule);

                    // Act -------------
                    const error = catchError(() => {
                        // @ts-expect-error: Ignore a real type of the module & try set value
                        stub.value = 123;
                    });

                    // Assert ---------
                    expect(error).toBeDefined();
                    expect(error?.message).toEqual(
                        Errors.DynamicModuleModification(
                            dynamicModule.name,
                            "value",
                        ),
                    );
                });

                test("modifyNonObjectModuleMemberProperty", () => {
                    // Arrange -------
                    const realModule = { data: 42 };
                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);
                    const manager = new ModulesManager();
                    const stub = manager.getESModule(dynamicModule);

                    // Act -------------
                    const error = catchError(() => {
                        // @ts-expect-error: Ignore a real type of the module & try set value
                        stub.data.value = 123;
                    });

                    // Assert ---------
                    expect(error).toBeDefined();
                    expect(error?.message).toEqual(
                        Errors.DynamicModuleModification(
                            dynamicModule.name,
                            "data.value",
                        ),
                    );
                });

                test("modifyMember", () => {
                    // Arrange ---------
                    const realModule = {
                        value: 42,
                        deep: { level: { value: "foo" } },
                    };
                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);
                    const manager = new ModulesManager();
                    const stub = manager.getESModule(dynamicModule);
                    const deepLevelAccessor = stub.deep.level;

                    // Act -------------
                    const error = catchError(() => {
                        stub.value = 1;
                    });

                    const errorAccessor = catchError(() => {
                        deepLevelAccessor.value = "bar";
                    });

                    // Assert ----------
                    expect(error).toBeDefined();
                    expect(error?.message).toEqual(
                        Errors.DynamicModuleModification(
                            dynamicModule.name,
                            "value",
                        ),
                    );
                    expect(errorAccessor).toBeDefined();
                    expect(errorAccessor?.message).toEqual(
                        Errors.DynamicModuleModification(
                            dynamicModule.name,
                            "deep.level.value",
                        ),
                    );
                });
            });

            describe("afterLoad", () => {
                test("accessMember", async () => {
                    // Arrange ---------
                    const realModule = {
                        numberValue: 42,
                        stringValue: "FooBar",
                        deep: { level: { velue: 123 } },
                        func: () => {},
                        Cls: MockClass,
                    };

                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);

                    const manager = new ModulesManager();
                    manager.add(dynamicModule);

                    // Act ------------
                    const stub = manager.getESModule(dynamicModule);
                    const valueAccessor = stub.numberValue;
                    await manager.loadModuleAsync(dynamicModule);

                    // Assert ---------
                    expect(buildDelegate).not.toHaveBeenCalled();
                    expect(importDelegate).toHaveBeenCalled(); // Module was imported
                    expect(stub).toBeDefined();
                    expect(stub).not.toBe(realModule);
                    expect(stub.numberValue).toBeDefined();
                    expect(stub.numberValue).toBe(realModule.numberValue);
                    expect(stub.stringValue).toBeDefined();
                    expect(stub.stringValue).toBe(realModule.stringValue);
                    expect(stub.deep.level.velue).toBeDefined();
                    expect(stub.deep.level.velue).toBe(
                        realModule.deep.level.velue,
                    );
                    expect(stub.Cls).toBeDefined();
                    expect(stub.Cls).toBe(realModule.Cls);

                    expect(valueAccessor).not.toBe(realModule.numberValue); // It's module accessor
                    expect(valueAccessor.valueOf()).toBe(
                        realModule.numberValue,
                    ); // Real value
                });

                test("callFunc", async () => {
                    // Arrange ------------
                    const realModule = { func: jest.fn() };
                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);
                    const manager = new ModulesManager();
                    manager.add(dynamicModule);

                    const stub = manager.getESModule(dynamicModule);
                    const funcAccessor = stub.func;

                    await manager.loadModuleAsync(dynamicModule);

                    // Act ----------------
                    stub.func();
                    funcAccessor();

                    // Assert -------------
                    expect(buildDelegate).not.toHaveBeenCalled();
                    expect(importDelegate).toHaveBeenCalled(); // Module was imported
                    expect(stub).not.toBe(realModule); // It's module stub
                    expect(realModule.func).toHaveBeenCalledTimes(2); //stub.func() & funcAccessor()
                });

                test("createClassInstance", async () => {
                    // Arrange ------------
                    const realModule = { Cls: MockClass };
                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);
                    const manager = new ModulesManager();
                    manager.add(dynamicModule);

                    const stub = manager.getESModule(dynamicModule);
                    const clsAccessor = stub.Cls;
                    await manager.loadModuleAsync(dynamicModule);

                    // Act ----------------
                    const inst = new stub.Cls();
                    const inst2 = new clsAccessor();

                    // Assert -------------
                    expect(buildDelegate).not.toHaveBeenCalled();
                    expect(importDelegate).toHaveBeenCalled(); // Module was imported
                    expect(stub).not.toBe(realModule); // It's module stub
                    expect(inst).toBeDefined();
                    expect(inst).toBeInstanceOf(MockClass);
                    expect(inst).toBeInstanceOf(stub.Cls);
                    expect(inst).toBeInstanceOf(clsAccessor);
                    expect(inst2).toBeDefined();
                    expect(inst2).toBeInstanceOf(MockClass);
                    expect(inst2).toBeInstanceOf(stub.Cls);
                    expect(inst2).toBeInstanceOf(clsAccessor);
                });

                test("modifyNonObjectModuleMember", async () => {
                    // Arrange --------
                    const realModule = 42;
                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);
                    const manager = new ModulesManager();
                    manager.add(dynamicModule);

                    const stub = manager.getESModule(dynamicModule);
                    await manager.loadModuleAsync(dynamicModule);

                    // Act -------------
                    const error = catchError(() => {
                        // @ts-expect-error: Ignore a real type of the module & try set value
                        stub.value = 123;
                    });

                    // Assert ---------
                    expect(error).toBeDefined();
                    expect(error).toBeInstanceOf(TypeError);
                    expect(error?.message).toEqual(
                        Errors.NonObjectPropertySet("value", typeof realModule),
                    );
                });

                test("modifyNonObjectModuleMemberProperty", async () => {
                    // Arrange -------
                    const realModule = { data: 42 };
                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);
                    const manager = new ModulesManager();
                    manager.add(dynamicModule);

                    const stub = manager.getESModule(dynamicModule);
                    const dataAccessor = stub.data;
                    await manager.loadModuleAsync(dynamicModule);

                    // Act -------------
                    const error = catchError(() => {
                        // @ts-expect-error: Ignore a real type of the module & try set value
                        dataAccessor.value = 123;
                    });

                    // Assert ---------
                    expect(error).toBeDefined();
                    expect(error).toBeInstanceOf(TypeError);
                    expect(error?.message).toEqual(
                        Errors.NonObjectPropertySet(
                            "value",
                            typeof realModule.data,
                        ),
                    );
                });

                test("modifyMember", async () => {
                    // Arrange ---------
                    const realModule = {
                        value: 42,
                        deep: { value: "foo", level: { value: 321 } },
                    };
                    const importDelegate = jest.fn(() =>
                        Promise.resolve(realModule),
                    );
                    const buildDelegate = jest.fn();
                    const dynamicModule = dynamicModuleFactory(
                        "dynamicModule",
                        importDelegate,
                    ).create(buildDelegate);
                    const manager = new ModulesManager();
                    manager.add(dynamicModule);

                    const stub = manager.getESModule(dynamicModule);
                    const deepLevelAccessor = stub.deep.level;
                    await manager.loadModuleAsync(dynamicModule);

                    // Act -------------
                    stub.value = 1;
                    stub.deep.value = "bar";
                    deepLevelAccessor.value = 432;

                    // Assert ----------
                    expect(buildDelegate).not.toHaveBeenCalled();
                    expect(importDelegate).toHaveBeenCalled(); // Module was imported
                    expect(stub).not.toBe(realModule); // It's module stub
                    expect(stub.value).toBe(1);
                    expect(stub.value).toBe(realModule.value);
                    expect(stub.deep.value).toBe("bar");
                    expect(stub.deep.value).toBe(realModule.deep.value);
                    expect(deepLevelAccessor.value).toBe(432);
                    expect(deepLevelAccessor.value).toBe(stub.deep.level.value);
                    expect(deepLevelAccessor.value).toBe(
                        realModule.deep.level.value,
                    );
                });
            });
        });
    });

    describe("moduleLoading", () => {
        test("load", async () => {
            // Arrange ---------
            const importDelegate = jest.fn(() =>
                Promise.resolve({ value: 42 }),
            );
            const buildDelegate = jest.fn();
            const dynamicModule = dynamicModuleFactory(
                "dynamicModule",
                importDelegate,
            ).create(buildDelegate);

            const manager = new ModulesManager();
            manager.add(dynamicModule);

            // Act ------------
            await manager.loadModuleAsync(dynamicModule);

            // Assert ---------
            expect(manager.checkLoaded(dynamicModule)).toBeTruthy();
            expect(importDelegate).toHaveBeenCalled();
        });

        test("loadTwice", async () => {
            // Arrange ---------
            const importDelegate = jest.fn(() =>
                Promise.resolve({ value: 42 }),
            );
            const buildDelegate = jest.fn();
            const dynamicModule = dynamicModuleFactory(
                "dynamicModule",
                importDelegate,
            ).create(buildDelegate);

            const manager = new ModulesManager();
            manager.add(dynamicModule);
            await manager.loadModuleAsync(dynamicModule); // First

            // Act ------------
            await manager.loadModuleAsync(dynamicModule); // Second

            // Assert ---------
            expect(manager.checkLoaded(dynamicModule)).toBeTruthy();
            expect(importDelegate).toHaveBeenCalledTimes(1); // Only one import
        });

        test("loadNotRegisteredModule", async () => {
            // Arrange ---------
            const importDelegate = jest.fn(() =>
                Promise.resolve({ value: 42 }),
            );
            const buildDelegate = jest.fn();
            const dynamicModule = dynamicModuleFactory(
                "dynamicModule",
                importDelegate,
            ).create(buildDelegate);

            const manager = new ModulesManager();

            // Act ------------
            const error = await catchErrorAsync(() =>
                manager.loadModuleAsync(dynamicModule),
            );

            // Assert ---------
            expect(manager.checkLoaded(dynamicModule)).toBeFalsy();
            expect(importDelegate).not.toHaveBeenCalled();
            expect(error).toBeDefined();
            expect(error?.message).toEqual(
                Errors.ModuleNotAvailable(dynamicModule.name),
            );
        });

        test("getLoadedModule", async () => {
            // Arrange ---------
            const realModule = { value: 42 };
            const importDelegate = jest.fn(() => Promise.resolve(realModule));
            const buildDelegate = jest.fn();
            const dynamicModule = dynamicModuleFactory(
                "dynamicModule",
                importDelegate,
            ).create(buildDelegate);

            const manager = new ModulesManager();
            manager.add(dynamicModule);
            await manager.loadModuleAsync(dynamicModule);

            // Act ------------
            const module = manager.getESModule(dynamicModule);

            // Assert ---------
            expect(module).toBe(realModule);
        });
    });

    describe("handle", () => {
        describe("getHandle", () => {
            test("existModule", () => {
                const jsModuleDelegate = jest.fn(() =>
                    Promise.resolve({ value: 42 }),
                );
                const dynamicModule = dynamicModuleFactory(
                    "dynamicModule",
                    jsModuleDelegate,
                ).create(() => {});

                const manager = new ModulesManager();
                manager.add(dynamicModule);

                // Act ----------
                const handle = manager.getModuleHandle(dynamicModule);

                // Assert -------
                expect(handle).not.toBeNull();
                expect(handle.module).toBe(dynamicModule);
                expect(handle.isLoaded).toBeFalsy();
                expect(jsModuleDelegate).not.toHaveBeenCalled();
            });

            test("getTwice", () => {
                const jsModuleDelegate = jest.fn(() =>
                    Promise.resolve({ value: 42 }),
                );
                const dynamicModule = dynamicModuleFactory(
                    "dynamicModule",
                    jsModuleDelegate,
                ).create(() => {});

                const manager = new ModulesManager();
                manager.add(dynamicModule);

                // Act ----------
                const handle1 = manager.getModuleHandle(dynamicModule);
                const handle2 = manager.getModuleHandle(dynamicModule);

                // Assert -------
                expect(handle1).toBe(handle2);
            });

            test("notRegisteredModule", () => {
                const jsModuleDelegate = jest.fn(() =>
                    Promise.resolve({ value: 42 }),
                );
                const dynamicModule = dynamicModuleFactory(
                    "dynamicModule",
                    jsModuleDelegate,
                ).create(() => {});

                const manager = new ModulesManager();

                // Act ----------
                const error = catchError(() =>
                    manager.getModuleHandle(dynamicModule),
                );

                // Assert -------
                expect(error).toBeDefined();
                expect(error?.message).toEqual(
                    Errors.ModuleNotAvailable(dynamicModule.name),
                );
            });
        });

        test("loadModule", async () => {
            const jsModuleDelegate = jest.fn(() =>
                Promise.resolve({ value: 42 }),
            );
            const dynamicModule = dynamicModuleFactory(
                "dynamicModule",
                jsModuleDelegate,
            ).create(() => {});

            const manager = new ModulesManager();
            manager.add(dynamicModule);
            const handle = manager.getModuleHandle(dynamicModule);

            // Act ----------
            const isLoadedBefore = handle.isLoaded;
            await handle.loadAsync();
            const isLoadedAfter = handle.isLoaded;

            // Assert --------
            expect(isLoadedBefore).toBeFalsy();
            expect(isLoadedAfter).toBeTruthy();
            expect(manager.checkLoaded(dynamicModule)).toBeTruthy();
            expect(jsModuleDelegate).toHaveBeenCalled();
        });
    });
});
