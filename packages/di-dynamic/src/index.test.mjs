import { vi, describe, test, expect } from "vitest";
import { diBuilder, staticModule } from "@spirex/di";
import { dynamicModule, DynamicModules } from "./index";
import { Errors } from "./index.js";

const fakeModule = {
    mNumber: 42,
    mString: "foo",
    mFunc: () => "qwe",
    mMutFunc: (obj) => {
        return (obj.foo = "asd");
    },
    mClass: class MyClass {},
    mDeep: {
        obj: {
            values: {
                qwe: "qwe",
                asd: 11,
            },
        },
    },
};

function catchError(procedure) {
    try {
        procedure();
    } catch (e) {
        if (e instanceof Error) return e;
    }
    return undefined;
}

async function catchErrorAsync(procedure) {
    try {
        await procedure();
    } catch (e) {
        if (e instanceof Error) return e;
    }
    return undefined;
}

describe("Dynamic Modules", () => {
    test("WHEN: define dynamic module", () => {
        // Arrange ------
        var moduleId = "myModule";
        var importDelegate = vi.fn();
        var binderDelegate = vi.fn();

        // Act ----------
        var dyModule = dynamicModule(moduleId, importDelegate).create(
            binderDelegate,
        );

        // Assert -------
        expect(dyModule).toBeInstanceOf(Object);
        expect(dyModule).is.frozen;

        expect(dyModule.id).toBe(moduleId);
        expect(dyModule.type).toBe("dynamic");
        expect(dyModule.isLoaded).is.false;

        expect(importDelegate).not.toHaveBeenCalled();
        expect(binderDelegate).not.toHaveBeenCalled();
    });

    describe("Module loading", () => {
        test("WHEN: Load module", async () => {
            // Arrange -------
            var importDelegate = vi.fn(() => Promise.resolve(fakeModule));
            var binderDelegate = vi.fn();

            var dyModule = dynamicModule("myModule", importDelegate).create(
                binderDelegate,
            );

            // Act -----------
            await dyModule.loadAsync();

            // Assert --------
            expect(dyModule.isLoaded).is.true;
            expect(importDelegate).toHaveBeenCalledOnce();
            expect(binderDelegate).not.toHaveBeenCalledOnce();
        });

        test("WHEN: Load module twice", async () => {
            // Arrange -------
            var importDelegate = vi.fn(() => Promise.resolve(fakeModule));
            var binderDelegate = vi.fn();

            var dyModule = dynamicModule("myModule", importDelegate).create(
                binderDelegate,
            );
            await dyModule.loadAsync();

            // Act -----------
            await dyModule.loadAsync();

            // Assert --------
            expect(dyModule.isLoaded).is.true;
            expect(importDelegate).toHaveBeenCalledOnce();
            expect(binderDelegate).not.toHaveBeenCalledOnce();
        });

        test("WHEN: Error on load module", async () => {
            // Arrange ------
            var expectedErrorMessage = "loading failure";
            var importDelegate = vi.fn(() =>
                Promise.reject(new Error(expectedErrorMessage)),
            );
            var binderDelegate = vi.fn();

            var dyModule = dynamicModule("myModule", importDelegate).create(
                binderDelegate,
            );

            // Act ----------
            var error = await catchErrorAsync(() => dyModule.loadAsync());

            // Assert -------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual(expectedErrorMessage);
            expect(dyModule.isLoaded).is.false;
        });

        test("WHEN: Load dynamic module with included dynamic submodule", async () => {
            // Arrange -----
            var dySubmoduleImportDelegate = vi.fn(() =>
                Promise.resolve({ value: 42 }),
            );
            var dyModuleImportDelegate = vi.fn(() =>
                Promise.resolve(fakeModule),
            );

            const dySubmodule = dynamicModule(
                "dySubmodule",
                dySubmoduleImportDelegate,
            ).create((binder, esm) => {
                binder.bindInstance("sub", esm.value);
            });

            const dyModule = dynamicModule(
                "dyModule",
                dyModuleImportDelegate,
            ).create((binder, esm) => {
                binder
                    .include(dySubmodule)
                    .bindFactory("value", (r) => esm.mNumber + r.get("sub"));
            });

            const container = diBuilder()
                .use(DynamicModules)
                .include(dyModule)
                .build();

            // Act ---------
            await dyModule.loadAsync();

            // Assert ------
            expect(dySubmoduleImportDelegate).toHaveBeenCalledOnce();
            expect(dySubmodule.isLoaded).is.true;

            expect(dyModuleImportDelegate).toHaveBeenCalledOnce();
            expect(dyModule.isLoaded).is.true;
        });

        test("WHEN: Load dynamic module after submodule loaded", async () => {
            // Arrange -----
            var dySubmoduleImportDelegate = vi.fn(() =>
                Promise.resolve({ value: 42 }),
            );
            var dyModuleImportDelegate = vi.fn(() =>
                Promise.resolve(fakeModule),
            );

            const dySubmodule = dynamicModule(
                "dySubmodule",
                dySubmoduleImportDelegate,
            ).create((binder, esm) => {
                binder.bindInstance("sub", esm.value);
            });

            const dySubmodule2 = dynamicModule("dySubmodule2", () =>
                Promise.resolve(),
            ).create((binder) => {
                binder.bindInstance("sub2", 42);
            });

            const dyModule = dynamicModule(
                "dyModule",
                dyModuleImportDelegate,
            ).create((binder, esm) => {
                binder
                    .include(dySubmodule)
                    .include(dySubmodule2)
                    .bindFactory("value", (r) => esm.mNumber + r.get("sub"));
            });

            const builder = diBuilder()
                .use(DynamicModules)
                .include(dyModule);

            await dySubmodule.loadAsync();

            // Act ---------
            await dyModule.loadAsync();

            // Assert ------
            expect(dySubmoduleImportDelegate).toHaveBeenCalledOnce();
            expect(dySubmodule.isLoaded).is.true;

            expect(dyModuleImportDelegate).toHaveBeenCalledOnce();
            expect(dyModule.isLoaded).is.true;

            expect(builder.hasModule(dySubmodule)).is.true;
            expect(builder.hasModule(dySubmodule2)).is.true;
            expect(builder.hasModule(dyModule)).is.true;
        });
    });

    describe("Include to container", () => {
        test("WHEN: Add middleware", () => {
            // Arrange -------
            var builder = diBuilder();

            // Act -----------
            builder.use(DynamicModules);

            // Assert --------
            expect(builder.hasMiddleware(DynamicModules)).is.true;
        });

        test("WHEN: include module without middleware", () => {
            // Arrange ------
            var moduleID = "myModule";
            var importDelegate = vi.fn();
            var binderDelegate = vi.fn();

            var dyModule = dynamicModule(moduleID, importDelegate).create(
                binderDelegate,
            );
            var builder = diBuilder();

            // Act ----------
            var error = catchError(() => builder.include(dyModule));

            // Assert -------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual(Errors.MissingMiddleware(moduleID));

            expect(builder.hasModule(dyModule)).is.false;

            expect(importDelegate).not.toHaveBeenCalled();
            expect(binderDelegate).not.toHaveBeenCalled();
        });

        test("WHEN: include module", () => {
            // Arrange -------
            var moduleId = "dyModule";
            var importDelegate = vi.fn();
            var binderDelegate = vi.fn();

            var dyModule = dynamicModule(moduleId, importDelegate).create(
                binderDelegate,
            );

            var builder = diBuilder().use(DynamicModules);

            // Act -----------
            builder.include(dyModule);

            // Assert --------
            expect(builder.hasModule(dyModule)).is.true;

            expect(binderDelegate).toHaveBeenCalledOnce();
            expect(importDelegate).not.toHaveBeenCalled();
        });

        test("WHEN: include module twice", () => {
            // Arrange -------
            var moduleId = "dyModule";
            var importDelegate = vi.fn();
            var binderDelegate = vi.fn();

            var dyModule = dynamicModule(moduleId, importDelegate).create(
                binderDelegate,
            );

            var builder = diBuilder()
                .use(DynamicModules)
                .include(dyModule);

            // Act -----------
            builder.include(dyModule);

            // Assert --------
            expect(builder.hasModule(dyModule)).is.true;

            expect(binderDelegate).toHaveBeenCalledOnce();
            expect(importDelegate).not.toHaveBeenCalled();
        });
    });

    describe("Dynamic binding", () => {
        test("WHEN: Bind instance", () => {
            // Arrange --------
            var typeKey = "typeKey";
            var importDelegate = vi.fn();
            var dyModule = dynamicModule("dyModule", importDelegate).create(
                (binder, module) => {
                    binder.bindInstance(typeKey, module.value);
                },
            );

            var builder = diBuilder()
                .use(DynamicModules)
                .include(dyModule);

            // Act -------
            var typeEntry = builder.findEntry(typeKey);

            // Assert ----
            expect(typeEntry).toBeDefined();
            expect(typeEntry.module).toBe(dyModule);
            expect(typeEntry.instance).is.undefined;
            expect(typeEntry.factory).toBeDefined();
            expect(typeEntry.lifecycle).toBe("lazy");
        });

        test("WHEN: Bind factory", () => {
            // Arrange ------
            var typeKey = "typeKey";
            var importDelegate = vi.fn();
            var binderDelegate = vi.fn((binder, { Class }) => {
                binder.bindFactory(typeKey, () => new Class());
            });
            var dyModule = dynamicModule("dyModule", importDelegate).create(
                binderDelegate,
            );

            var builder = diBuilder()
                .use(DynamicModules)
                .include(dyModule);

            // Act ----------
            var typeEntry = builder.findEntry(typeKey);

            // Assert -------
            expect(typeEntry).toBeDefined();
            expect(typeEntry.factory).toBeDefined();
            expect(typeEntry.module).toBe(dyModule);
            expect(typeEntry.lifecycle).toBe("lazy");

            expect(binderDelegate).toHaveBeenCalledOnce();
            expect(importDelegate).not.toHaveBeenCalled();
        });

        test("WHEN: Bind scoped factory", () => {
            // Arrange ------
            var typeKey = "typeKey";
            var dyModule = dynamicModule("dyModule", () => null).create(
                (binder, { MyClass }) => {
                    binder.bindFactory(typeKey, () => new MyClass(), {
                        lifecycle: "scope",
                    });
                },
            );

            var builder = diBuilder()
                .use(DynamicModules)
                .include(dyModule);

            // Act ----------
            var typeEntry = builder.findEntry(typeKey);

            // Assert -------
            expect(typeEntry).toBeDefined();
            expect(typeEntry.module).toBe(dyModule);
            expect(typeEntry.lifecycle).toBe("scope");
        });

        test("WHEN: Include static submodule", () => {
            // Arrange --------
            var typeSt = "st";
            var typeDy = "dy";

            var stModule = staticModule("stModule").create((binder) => {
                binder.bindInstance(typeSt, 11);
            });

            var importDelegate = vi.fn();
            var dyModule = dynamicModule("dyModule", importDelegate).create(
                (binder, { value }) => {
                    binder.include(stModule).bindInstance(typeDy, value);
                },
            );

            var builder = diBuilder()
                .use(DynamicModules)
                .include(dyModule);

            // Act ------------
            var stTypeEntry = builder.findEntry(typeSt);
            var dyTypeEntry = builder.findEntry(typeDy);

            // Assert ---------
            expect(stTypeEntry).toBeDefined();
            expect(stTypeEntry.module).toBe(stModule);
            expect(stTypeEntry.instance).toBe(11);

            expect(dyTypeEntry).toBeDefined();
            expect(dyTypeEntry.module).toBe(dyModule);
            expect(dyModule.instance).is.undefined;
            expect(importDelegate).not.toHaveBeenCalled();
        });

        test("WHEN: Include dynamic submodule", () => {
            // Arrange --------
            var typeKeyA = "typeKeyA";
            var typeKeyB = "typeKeyB";

            var dyModuleA = dynamicModule("dyModuleA", () => null).create(
                (binder, { ClassA }) => {
                    binder.bindFactory(typeKeyA, () => new ClassA());
                },
            );

            var dyModuleB = dynamicModule("dyModuleB", () => null).create(
                (binder, { ClassB }) => {
                    binder.include(dyModuleA).bindSafeFactory(
                        typeKeyB,
                        (r) => r.get(typeKeyA),
                        (d) => new ClassB(d),
                    );
                },
            );

            var builder = diBuilder()
                .use(DynamicModules)
                .include(dyModuleB);

            // Act ------------
            var typeEntryA = builder.findEntry(typeKeyA);
            var typeEntryB = builder.findEntry(typeKeyB);

            // Assert ---------
            expect(typeEntryA).toBeDefined();
            expect(typeEntryA.module).toBe(dyModuleA);

            expect(typeEntryB).toBeDefined();
            expect(typeEntryB.module).toBe(dyModuleB);
        });
    });

    describe("ESModule stub", () => {
        test("WHEN: get module members", () => {
            // Arrange ----------
            var builder = diBuilder().use(DynamicModules);

            // Act --------------
            var dyModule = dynamicModule("dyModule", () =>
                Promise.resolve(fakeModule),
            ).create((binder, esModule) => {
                var num = esModule.mNumber;
                var str = esModule.mString;
                var func = esModule.mFunc;
                var ClassRef = esModule.mClass;

                binder
                    .bindInstance("num", num)
                    .bindInstance("str", str)
                    .bindFactory("serviceA", (r) => func(r.get("num")))
                    .bindFactory(
                        "serviceB",
                        (r) => new ClassRef(r.get("str"), r.get("serviceA")),
                    );
            });

            builder.include(dyModule); // Exec delegate

            // Assert -----------
            // All bindings exist, no errors thrown
            expect(builder.has("num")).is.true;
            expect(builder.has("str")).is.true;
            expect(builder.has("serviceA")).is.true;
            expect(builder.has("serviceB")).is.true;
        });

        test("WHEN: decompose module members", () => {
            // Arrange ----------
            var builder = diBuilder().use(DynamicModules);

            // Act --------------
            var dyModule = dynamicModule("dyModule", () =>
                Promise.resolve(fakeModule),
            ).create((binder, { mString, mNumber, mClass, mFunc }) => {
                binder
                    .bindInstance("num", mNumber)
                    .bindInstance("str", mNumber)
                    .bindFactory("serviceA", (r) => mFunc(r.get("num")))
                    .bindFactory(
                        "serviceB",
                        (r) => new mClass(r.get("str"), r.get("serviceA")),
                    );
            });

            builder.include(dyModule); // Exec delegate

            // Assert -----------
            // All bindings exist, no errors thrown
            expect(builder.has("num")).is.true;
            expect(builder.has("str")).is.true;
            expect(builder.has("serviceA")).is.true;
            expect(builder.has("serviceB")).is.true;
        });

        test("WHEN: deep values access & decompose", () => {
            // Arrange ----------
            var builder = diBuilder().use(DynamicModules);

            // Act --------------
            var dyModule = dynamicModule("dyModule", () =>
                Promise.resolve(fakeModule),
            ).create((binder, esModule) => {
                var { qwe, asd } = esModule.mDeep.obj.values;
                binder.bindInstance("str", qwe).bindInstance("num", asd);
            });

            builder.include(dyModule); // Exec delegate

            // Assert -----------
            // All bindings exist, no errors thrown
            expect(builder.has("num")).is.true;
            expect(builder.has("str")).is.true;
        });

        test("WHEN: Trying to use values", () => {
            // Arrange ----------
            var builder = diBuilder().use(DynamicModules);

            // Act --------------
            var dyModule = dynamicModule("dyModule", () =>
                Promise.resolve(fakeModule),
            ).create((binder, { mNumber }) => {
                binder.bindInstance("num", mNumber + 10);
            });

            var error = catchError(() => {
                builder.include(dyModule);
            });

            // Assert -----------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual(
                Errors.DynamicModuleAccess(dyModule.id, ["mNumber"]),
            );
        });

        test("WHEN: Trying to call func", () => {
            // Arrange ----------
            var builder = diBuilder().use(DynamicModules);

            // Act --------------
            var dyModule = dynamicModule("dyModule", () =>
                Promise.resolve(fakeModule),
            ).create((binder, { mFunc }) => {
                binder.bindInstance("value", mFunc());
            });

            var error = catchError(() => {
                builder.include(dyModule);
            });

            // Assert -----------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual(
                Errors.DynamicModuleAccess(dyModule.id, ["mFunc"]),
            );
        });

        test("WHEN: Trying to create class instance", () => {
            // Arrange ----------
            var builder = diBuilder().use(DynamicModules);

            // Act --------------
            var dyModule = dynamicModule("dyModule", () =>
                Promise.resolve(fakeModule),
            ).create((binder, { mClass }) => {
                binder.bindInstance("value", new mClass());
            });

            var error = catchError(() => {
                builder.include(dyModule);
            });

            // Assert -----------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual(
                Errors.DynamicModuleAccess(dyModule.id, ["mClass"]),
            );
        });

        test("WHEN: Trying to mutate module member", () => {
            // Arrange ----------
            var builder = diBuilder().use(DynamicModules);

            // Act --------------
            var dyModule = dynamicModule("dyModule", () =>
                Promise.resolve(fakeModule),
            ).create((binder, { mNumber }) => {
                mNumber += 1;
                binder.bindInstance("value", mNumber);
            });

            var error = catchError(() => {
                builder.include(dyModule);
            });

            // Assert -----------
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual(
                Errors.DynamicModuleAccess(dyModule.id, ["mNumber"]),
            );
        });
    });

    describe("Resolve instances", () => {
        describe("Module not loaded", () => {
            test("WHEN: resolve instance", () => {
                // Arrange -------
                var moduleId = "dyModule";
                var typeKey = "typeKey";

                var importDelegate = vi.fn();
                var dyModule = dynamicModule(moduleId, importDelegate).create(
                    (binder, module) => {
                        binder.bindInstance(typeKey, module.value);
                    },
                );

                var container = diBuilder()
                    .use(DynamicModules)
                    .include(dyModule)
                    .build();

                // Act -----------
                var error = catchError(() => container.get(typeKey));

                // Assert --------
                expect(importDelegate).not.toHaveBeenCalled();
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual(
                    Errors.ModuleNotLoaded(moduleId, typeKey),
                );
            });

            test("WHEN: resolve factory", () => {
                // Arrange --------
                var typeKey = "typeKey";
                var importDelegate = vi.fn();
                var dyModule = dynamicModule("dyModule", importDelegate).create(
                    (binder, { SomeService }) => {
                        binder.bindFactory(typeKey, () => new SomeService());
                    },
                );

                var container = diBuilder()
                    .use(DynamicModules)
                    .include(dyModule)
                    .build();

                // Act ------------
                var error = catchError(() => container.get(typeKey));

                // Assert ---------
                expect(importDelegate).not.toHaveBeenCalled();
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual(
                    Errors.ModuleNotLoaded(dyModule.id, typeKey),
                );
            });
        });

        describe("Module loaded", () => {
            test("WHEN: resolve instance", async () => {
                // Arrange -------
                var typeKey = "typeKey";
                var importDelegate = vi.fn(() => Promise.resolve(fakeModule));

                var dyModule = dynamicModule("dyModule", importDelegate).create(
                    (binder, { mNumber }) => {
                        binder.bindInstance(typeKey, mNumber);
                    },
                );

                var container = diBuilder()
                    .use(DynamicModules)
                    .include(dyModule)
                    .build();

                // Act -----------
                await dyModule.loadAsync();

                var value = container.get(typeKey);

                // Assert --------
                expect(value).toBe(fakeModule.mNumber);
            });

            test("WHEN: resolve factory", async () => {
                // Arrange -------
                var typeKey = "typeKey";
                var importDelegate = vi.fn(() => Promise.resolve(fakeModule));
                var dyModule = dynamicModule("dyModule", importDelegate).create(
                    (binder, { mClass }) => {
                        binder.bindFactory(typeKey, () => new mClass());
                    },
                );

                var container = diBuilder()
                    .use(DynamicModules)
                    .include(dyModule)
                    .build();

                // Act -----------
                await dyModule.loadAsync();

                var inst = container.get(typeKey);

                // Assert --------
                expect(inst).toBeInstanceOf(fakeModule.mClass);
            });

            test("WHEN: Resolve dynamic submodule instance", async () => {
                // Arrange ------
                var typeKeyA = "typeKeyA";
                var typeKeyB = "typeKeyB";

                var importDelegateA = vi.fn(() =>
                    Promise.resolve({ value: 42 }),
                );
                var importDelegateB = vi.fn(() => Promise.resolve(fakeModule));

                var dyModuleA = dynamicModule(
                    "dyModuleA",
                    importDelegateA,
                ).create((binder, { value }) => {
                    binder.bindInstance(typeKeyA, value);
                });

                var dyModuleB = dynamicModule(
                    "dyModuleB",
                    importDelegateB,
                ).create((binder, { mNumber }) => {
                    binder
                        .include(dyModuleA)
                        .bindFactory(
                            typeKeyB,
                            (r) => r.get(typeKeyA) + mNumber,
                        );
                });

                var container = diBuilder()
                    .use(DynamicModules)
                    .include(dyModuleB)
                    .build();

                // Act ----------
                await dyModuleB.loadAsync();

                var valueA = container.get(typeKeyA);
                var valueB = container.get(typeKeyB);

                // Assert -------
                expect(valueA).toBe(42);
                expect(valueB).toBe(valueA + fakeModule.mNumber);

                expect(dyModuleA.isLoaded).is.true;
                expect(dyModuleB.isLoaded).is.true;

                expect(importDelegateA).toHaveBeenCalled();
                expect(importDelegateB).toHaveBeenCalled();
            });

            test("WHEN: Call factory with side-effect", async () => {
                // Arrange -------
                var dyModule = dynamicModule("dyModule", () =>
                    Promise.resolve(fakeModule),
                ).create((binder, { mMutFunc, mDeep }) => {
                    binder.bindFactory("value", () => mMutFunc(mDeep));
                });

                var container = diBuilder()
                    .use(DynamicModules)
                    .include(dyModule)
                    .build();

                // Act -----------
                await dyModule.loadAsync();

                var value = container.get("value");

                // Assert --------
                expect(value).toEqual("asd");
            });
        });
    });
});
