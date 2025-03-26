import { DIContainerBuilder } from "./DIContainerBuilder";
import { isFactoryTypeEntry, isInstanceTypeEntry } from "./utils";
import type { TLifecycle, TProvider } from "./types";
import { catchError } from "./__test__/errors";
import { createMockResolver } from "./__test__/mocks";
import { dynamicModuleFactory } from "./modules/dynamicModuleFactory";
import { staticModuleFactory } from "./modules/staticModuleFactory";
import { DIScope } from "./DIScope";

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
        const typeEntry = builder.findSomeTypeEntry(expectedTypeKey);

        // Arrange ------
        expect(builderRef).toBeInstanceOf(DIContainerBuilder);
        expect(builder.hasEntry(expectedTypeKey)).toBeTruthy();
        expect(typeEntry).not.toBeNull();
        expect(typeEntry?.type).toBe(expectedTypeKey);
        expect(typeEntry?.instance).toBe(expectedValue);
        expect(typeEntry?.factory).toBeUndefined();
        expect(typeEntry?.module).toBeUndefined();
        expect(Object.isFrozen(typeEntry)).toBeTruthy();
    });

    test("Bind factory", () => {
        // Arrange ------
        const expectedTypeKey = "typeKey";
        const factory = jest.fn(() => "lorem");
        const builder = new DIContainerBuilder<{ typeKey: string }>();

        // Act ----------
        const builderRef = builder.bindFactory(expectedTypeKey, factory);
        const typeEntry = builder.findSomeTypeEntry(expectedTypeKey);

        // Assert -------
        expect(builderRef).toBeInstanceOf(DIContainerBuilder);
        expect(builder.hasEntry(expectedTypeKey)).toBeTruthy();
        expect(typeEntry).not.toBeNull();
        expect(typeEntry?.type).toBe(expectedTypeKey);
        expect(typeEntry?.factory).toBe(factory);
        expect(typeEntry?.instance).toBeUndefined();
        expect(factory).not.toHaveBeenCalled();
        expect(typeEntry?.module).toBeUndefined();
        expect(Object.isFrozen(typeEntry)).toBeTruthy();
    });

    describe("Named binding", () => {
        test("Bind instance with name", () => {
            // Arrange ---------
            const expectedName = "lorem";
            const builder = new DIContainerBuilder<{ value: number }>();

            // Act ------------
            builder.bindInstance("value", 42, { name: expectedName });
            const entry = builder.findSomeTypeEntry("value", expectedName);

            // Assert ---------
            expect(entry).not.toBeNull();
            expect(builder.hasEntry("value", expectedName)).toBeTruthy();
            expect(entry?.type).toBe("value");
            expect(entry?.name).toBe(expectedName);
        });

        test("Bind factory with name", () => {
            // Arrange --------
            const expectedName = "lorem";
            const builder = new DIContainerBuilder<{ value: number }>();

            // Act ------------
            builder.bindFactory("value", () => 42, { name: expectedName });
            const entry = builder.findSomeTypeEntry("value", expectedName);

            // Assert ---------
            expect(entry).not.toBeNull();
            expect(builder.hasEntry("value", expectedName)).toBeTruthy();
            expect(entry?.type).toBe("value");
            expect(entry?.name).toBe(expectedName);
            expect(entry?.module).toBeUndefined();
        });

        test("Types with names are different entries", () => {
            // Arrange -----------
            const builder = new DIContainerBuilder<{ value: number }>();

            // Act ---------------
            builder.bindInstance("value", 0);
            builder.bindInstance("value", 1, { name: "foo" }); // no-throw
            builder.bindInstance("value", 2, { name: "bar" }); // no-throw

            const mainEntry = builder.findSomeTypeEntry("value");
            const fooEntry = builder.findSomeTypeEntry("value", "foo");
            const barEntry = builder.findSomeTypeEntry("value", "bar");

            // Assert ------------
            expect(mainEntry).not.toBeNull();
            expect(fooEntry).not.toBeNull();
            expect(barEntry).not.toBeNull();
            expect(mainEntry).not.toBe(fooEntry);
            expect(mainEntry).not.toBe(barEntry);
            expect(fooEntry).not.toBe(barEntry);
        });
    });

    describe("Binding conflicts", () => {
        test("Throw when bind two instances with same type", () => {
            // Arrange -------
            const builder = new DIContainerBuilder<{ typeKey: number }>();

            const expectedValue = 8;
            builder.bindInstance("typeKey", expectedValue);

            // Act -----------
            const err = catchError(() => builder.bindInstance("typeKey", 42));
            const entry = builder.findSomeTypeEntry("typeKey");

            // Assert --------
            expect(err).not.toBeUndefined();
            expect(entry?.instance).toBe(expectedValue);
        });

        test("Throw when bind two factories with same type  (explicit)", () => {
            // Arrange -------
            const builder = new DIContainerBuilder<{ typeKey: number }>();
            const expectedFactory = () => 8;
            builder.bindFactory("typeKey", expectedFactory);

            // Act -----------
            const err = catchError(() =>
                builder.bindFactory("typeKey", () => 42),
            );
            const entry = builder.findSomeTypeEntry("typeKey");

            // Assert --------
            expect(err).not.toBeUndefined();
            expect(entry?.factory).toBe(expectedFactory);
        });

        test("Throw when bind two factories with same type (implicit)", () => {
            // Arrange -------
            const builder = new DIContainerBuilder<{ typeKey: number }>();
            const expectedFactory = () => 8;
            builder.bindFactory("typeKey", expectedFactory);

            // Act -----------
            const err = catchError(() =>
                builder.bindFactory("typeKey", () => 42, {
                    ifConflict: "throw",
                }),
            );
            const entry = builder.findSomeTypeEntry("typeKey");

            // Assert --------
            expect(err).not.toBeUndefined();
            expect(entry?.factory).toBe(expectedFactory);
        });

        test("Keep origin binding on conflict (instance)", () => {
            // Arrange ----------
            const expectedValue = 8;
            const builder = new DIContainerBuilder<{ typeKey: number }>();
            builder.bindInstance("typeKey", expectedValue);

            // Act --------------
            builder.bindInstance("typeKey", 123, { ifConflict: "keep" });
            const entry = builder.findSomeTypeEntry("typeKey");

            // Arrange ---------
            expect(entry?.instance).toBe(expectedValue);
        });

        test("Keep origin binding on conflict (factory)", () => {
            // Arrange ----------
            const expectedValue = 8;
            const builder = new DIContainerBuilder<{ typeKey: number }>();
            builder.bindInstance("typeKey", expectedValue);

            // Act --------------
            builder.bindFactory("typeKey", () => 42, { ifConflict: "keep" });
            const entry = builder.findSomeTypeEntry("typeKey");

            // Arrange ---------
            expect(entry?.instance).toBe(expectedValue);
            expect(entry?.factory).toBeUndefined();
        });

        test("Replace origin binding on conflict (instance)", () => {
            const expectedValue = 42;
            const builder = new DIContainerBuilder<{ typeKey: number }>();
            builder.bindInstance("typeKey", 8);

            // Act --------------
            builder.bindInstance("typeKey", expectedValue, {
                ifConflict: "replace",
            });
            const entry = builder.findSomeTypeEntry("typeKey");

            // Arrange ---------
            expect(entry?.instance).toBe(expectedValue);
            expect(entry?.factory).toBeUndefined();
        });

        test("Replace origin binding on factory (instance)", () => {
            const builder = new DIContainerBuilder<{ typeKey: number }>();
            builder.bindInstance("typeKey", 8);
            const expectedFactory = () => 42;

            // Act --------------
            builder.bindFactory("typeKey", expectedFactory, {
                ifConflict: "replace",
            });
            const entry = builder.findSomeTypeEntry("typeKey");

            // Arrange ---------
            expect(entry?.factory).toBe(expectedFactory);
            expect(entry?.instance).toBeUndefined();
        });
    });

    describe("Multi-instance binding", () => {
        test("Add many instances with same type", () => {
            // Arrange --------
            const builder = new DIContainerBuilder<{ type: number }>();

            // Act ------------
            builder.bindInstance("type", 1, { ifConflict: "append" });
            builder.bindInstance("type", 2, { ifConflict: "append" });
            builder.bindInstance("type", 3, { ifConflict: "append" });

            const entries = builder.findAllTypeEntries("type");

            // Assert --------
            expect(entries).toHaveLength(3);
        });

        test("Replace all values of type", () => {
            // Arrange --------
            const builder = new DIContainerBuilder<{ type: number }>();

            // Act ------------
            builder.bindInstance("type", 1, { ifConflict: "append" });
            builder.bindInstance("type", 2, { ifConflict: "append" });
            builder.bindInstance("type", 42, { ifConflict: "replace" });

            const entries = builder.findAllTypeEntries("type");

            // Assert --------
            expect(entries).toHaveLength(1);
            expect(entries[0].instance).toBe(42);
        });
    });

    describe("Instance lifecycle", () => {
        test("Default lifecycle", () => {
            // Arrange ------------
            const builder = new DIContainerBuilder<{
                value: number;
            }>().bindFactory("value", () => 42);

            // Act ----------------
            const entry = builder.findSomeTypeEntry("value");

            let lifecycle: TLifecycle | undefined;
            if (isFactoryTypeEntry(entry)) lifecycle = entry.lifecycle;

            // Assert -------------
            expect(lifecycle).toBe("singleton");
        });

        test.each(["lazy", "transient"] as TLifecycle[])(
            "Custom lifecycle (%s)",
            (lifecycle) => {
                // Arrange -----------
                const builder = new DIContainerBuilder<{ value: number }>();
                builder.bindFactory("value", () => 42, { lifecycle });

                // Act ---------------
                const entry = builder.findSomeTypeEntry("value");

                let entryLifecycle: TLifecycle | undefined;
                if (isFactoryTypeEntry(entry)) entryLifecycle = entry.lifecycle;

                // Assert -----------
                expect(entryLifecycle).toBe(lifecycle);
            },
        );

        test("Pass unknown lifecycle", () => {
            // Arrange ------------
            const builder = new DIContainerBuilder<{
                value: number;
            }>();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            builder.bindFactory("value", () => 42, { lifecycle: "unknown" });
            const entry = builder.findSomeTypeEntry("value");

            // Act ----------------
            let lifecycle: TLifecycle | undefined;
            if (isFactoryTypeEntry(entry)) lifecycle = entry.lifecycle;

            // Assert -------------
            expect(lifecycle).toBe("singleton");
        });

        test("Instance binding have no lifecycle", () => {
            // Arrange -----------
            const builder = new DIContainerBuilder<{ value: number }>();
            builder.bindInstance("value", 42);

            // Act ---------------
            const entry = builder.findSomeTypeEntry("value");

            // Assert ------------
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect("lifecycle" in entry!).toBeFalsy();
        });
    });

    describe("Dependencies", () => {
        test("Bind factory with dependency", () => {
            type TypeMap = { num: number; str: string };

            // Arrange ------------
            const scopeId = "scope";
            const fakeResolver = createMockResolver<TypeMap>({ num: 42 });
            const builder = new DIContainerBuilder<TypeMap>();

            // Act ----------------
            builder.bindFactory("str", (r) => `${r.get("num").toString()}dx`);

            const entry = builder.findSomeTypeEntry("str");

            // Assert -------------
            expect(entry?.factory?.(fakeResolver, scopeId)).toBe("42dx");
        });

        test("Bind factory with dependency provider", () => {
            type TypeMap = {
                value: number;
                obj: { getter: TProvider<number> };
            };

            // Arrange ---------
            const expectedValue = 42;
            const resolver = createMockResolver<TypeMap>({
                value: expectedValue,
            });
            const builder = new DIContainerBuilder<TypeMap>();

            // Act -------------
            builder.bindFactory("obj", (r) => ({
                getter: r.getProvider("value"),
            }));

            const entry = builder.findSomeTypeEntry("obj");
            const resolvedObject = entry?.factory?.(resolver, "scope");

            // Assert ----------
            expect(resolvedObject).not.toBeUndefined();
            expect(resolvedObject?.getter()).toBe(expectedValue);
        });
    });

    describe("Finding entries", () => {
        test("Find not exist entry", () => {
            // Arrange ----------
            const builder = new DIContainerBuilder();

            // Act --------------
            const entry = builder.findSomeTypeEntry("value");

            // Assert -----------
            expect(entry).toBeNull();
        });

        test("Find not exist entry with name", () => {
            // Arrange -----------
            const builder = new DIContainerBuilder();

            // Act ---------------
            const entry = builder.findSomeTypeEntry("type", "name");

            // Assert ------------
            expect(entry).toBeNull();
        });

        test("Find some entry of type with many bindings", () => {
            type TypeMap = { value: number; other: string };

            // Arrange ------
            const builder = new DIContainerBuilder<TypeMap>()
                .bindInstance("value", 1, { ifConflict: "append" })
                .bindInstance("value", 2, { ifConflict: "append" });

            // Act ---------
            const entry = builder.findSomeTypeEntry("value");

            // Assert -----
            expect(entry).not.toBeNull();
        });

        test("Find all entries of type", () => {
            type TypeMap = { value: number; other: string };

            // Arrange ------
            const builder = new DIContainerBuilder<TypeMap>()
                .bindInstance("value", 1, { ifConflict: "append" })
                .bindInstance("value", 2, { ifConflict: "append" })
                .bindInstance("other", "foo", { ifConflict: "append" });

            // Act ---------
            const entries = builder.findAllTypeEntries("value");

            // Assert ------
            expect(entries).toBeInstanceOf(Array);
            expect(entries).toHaveLength(2);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            expect(entries.every((e) => e.type === "value")).toBeTruthy();
        });

        test("Find all entries of not bind type", () => {
            type TypeMap = { value: number; other: string };

            // Arrange ------
            const builder = new DIContainerBuilder<TypeMap>()
                .bindInstance("value", 1, { ifConflict: "append" })
                .bindInstance("value", 2, { ifConflict: "append" });

            // Act ---------
            const entries = builder.findAllTypeEntries("other");

            // Assert -------
            expect(entries).toBeInstanceOf(Array);
            expect(entries).toHaveLength(0);
        });

        test("Find all entries of type with one bind", () => {
            type TypeMap = { value: number; other: string };

            // Arrange ------
            const builder = new DIContainerBuilder<TypeMap>().bindInstance(
                "value",
                1,
            );

            // Act ---------
            const entries = builder.findAllTypeEntries("value");

            // Assert -------
            expect(entries).toBeInstanceOf(Array);
            expect(entries).toHaveLength(1);
        });
    });

    describe("module", () => {
        describe("static", () => {
            test("Add static module", () => {
                // Arrange ---------
                const staticModule = staticModuleFactory(
                    "staticModule",
                ).create<{
                    value: string;
                }>((builder) => {
                    builder.bindInstance("value", "hello");
                });

                // Act -------------
                const builder = new DIContainerBuilder().addModule(
                    staticModule,
                );

                const entry = builder.findSomeTypeEntry("value");

                // Assert ----------
                expect(entry).not.toBeNull();
                expect(isInstanceTypeEntry(entry)).toBeTruthy();
                expect(entry?.module).toBe(staticModule);
            });
        });

        describe("dynamic", () => {
            test("Add dynamic module", () => {
                // Arrange -------------
                const dynamicJSModuleImport = jest.fn(() =>
                    // import("./dynamicModule")
                    Promise.resolve({ value: 42 }),
                );
                const dynamicModule = dynamicModuleFactory(
                    "dyModule",
                    dynamicJSModuleImport,
                ).create<{ value: number; str: string }>(
                    (builder, jsModule) => {
                        builder.bindFactory("value", () => jsModule.value);
                    },
                );

                // Act -----------------
                const builder = new DIContainerBuilder().addModule(
                    dynamicModule,
                );

                const entry = builder.findSomeTypeEntry("value");

                // Assert --------------
                expect(entry).not.toBeNull();
                expect(isFactoryTypeEntry(entry)).toBeTruthy();
                expect(dynamicJSModuleImport).not.toHaveBeenCalled();
                expect(entry?.module).toBe(dynamicModule);
            });
        });
    });

    describe("Build container", () => {
        test("Trying to build empty container", () => {
            // Arrange ------------
            const builder = new DIContainerBuilder();

            // Act ----------------
            const error = catchError(() => builder.build());

            // Assert -------------
            expect(error).not.toBeNull();
            expect(error?.message).toContain(
                "Cannot create a container without bindings",
            );
        });

        test("Build container with one entry", () => {
            // Arrange ---------
            const builder = new DIContainerBuilder<{
                value: number;
            }>().bindInstance("value", 42);

            // Act -------------
            const container = builder.build();

            // Assert ----------
            expect(container).toBeInstanceOf(DIScope);
        });
    });
});
