import { DIContainerBuilder } from "./DIContainerBuilder";
import { DIContainer } from "./DIContainer";
import { isFactoryTypeEntry } from "./utils";
import type { TLifecycle, TProvider } from "./types";
import { catchError } from "./__test__/errors";
import { createMockResolver } from "./__test__/mocks";

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
        const typeEntry = builder.findTypeEntry(expectedTypeKey);

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
        const typeEntry = builder.findTypeEntry(expectedTypeKey);

        // Assert -------
        expect(builderRef).toBeInstanceOf(DIContainerBuilder);
        expect(typeEntry).not.toBeNull();
        expect(typeEntry?.type).toBe(expectedTypeKey);
        expect(typeEntry?.factory).toBe(factory);
        expect(typeEntry?.instance).toBeUndefined();
        expect(factory).not.toHaveBeenCalled();
    });

    describe("Named binding", () => {
        test("Bind instance with name", () => {
            // Arrange ---------
            const expectedName = "lorem";
            const builder = new DIContainerBuilder<{ value: number }>();

            // Act ------------
            builder.bindInstance("value", 42, { name: expectedName });
            const entry = builder.findTypeEntry("value", expectedName);

            // Assert ---------
            expect(entry).not.toBeNull();
            expect(entry?.type).toBe("value");
            expect(entry?.name).toBe(expectedName);
        });

        test("Bind factory with name", () => {
            // Arrange --------
            const expectedName = "lorem";
            const builder = new DIContainerBuilder<{ value: number }>();

            // Act ------------
            builder.bindFactory("value", () => 42, { name: expectedName });
            const entry = builder.findTypeEntry("value", expectedName);

            // Assert ---------
            expect(entry).not.toBeNull();
            expect(entry?.type).toBe("value");
            expect(entry?.name).toBe(expectedName);
        });

        test("Types with names are different entries", () => {
            // Arrange -----------
            const builder = new DIContainerBuilder<{ value: number }>();

            // Act ---------------
            builder.bindInstance("value", 0);
            builder.bindInstance("value", 1, { name: "foo" }); // no-throw
            builder.bindInstance("value", 2, { name: "bar" }); // no-throw

            const mainEntry = builder.findTypeEntry("value");
            const fooEntry = builder.findTypeEntry("value", "foo");
            const barEntry = builder.findTypeEntry("value", "bar");

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
            const entry = builder.findTypeEntry("typeKey");

            // Assert --------
            expect(err).not.toBeUndefined();
            expect(entry?.instance).toBe(expectedValue);
        });

        test("Throw when bind two factories with same type", () => {
            // Arrange -------
            const builder = new DIContainerBuilder<{ typeKey: number }>();
            const expectedFactory = () => 8;
            builder.bindFactory("typeKey", expectedFactory);

            // Act -----------
            const err = catchError(() =>
                builder.bindFactory("typeKey", () => 42),
            );
            const entry = builder.findTypeEntry("typeKey");

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
            const entry = builder.findTypeEntry("typeKey");

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
            const entry = builder.findTypeEntry("typeKey");

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
            const entry = builder.findTypeEntry("typeKey");

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
            const entry = builder.findTypeEntry("typeKey");

            // Arrange ---------
            expect(entry?.factory).toBe(expectedFactory);
            expect(entry?.instance).toBeUndefined();
        });
    });

    describe("Instance lifecycle", () => {
        test("Default lifecycle", () => {
            // Arrange ------------
            const builder = new DIContainerBuilder<{
                value: number;
            }>().bindFactory("value", () => 42);

            // Act ----------------
            const entry = builder.findTypeEntry("value");

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
                const entry = builder.findTypeEntry("value");

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
            const entry = builder.findTypeEntry("value");

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
            const entry = builder.findTypeEntry("value");

            // Assert ------------
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect("lifecycle" in entry!).toBeFalsy();
        });
    });

    describe("Dependencies", () => {
        test("Bind factory with dependency", () => {
            type TypeMap = { num: number; str: string };

            // Arrange ------------
            const fakeResolver = createMockResolver<TypeMap>({ num: 42 });
            const builder = new DIContainerBuilder<TypeMap>();

            // Act ----------------
            builder.bindFactory("str", (r) => `${r.get("num").toString()}dx`);

            const entry = builder.findTypeEntry("str");

            // Assert -------------
            expect(entry?.factory?.(fakeResolver)).toBe("42dx");
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

            const entry = builder.findTypeEntry("obj");
            const resolvedObject = entry?.factory?.(resolver);

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
            const entry = builder.findTypeEntry("value");

            // Assert -----------
            expect(entry).toBeNull();
        });

        test("Find not exist entry with name", () => {
            // Arrange -----------
            const builder = new DIContainerBuilder();

            // Act ---------------
            const entry = builder.findTypeEntry("type", "name");

            // Assert ------------
            expect(entry).toBeNull();
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
            expect(container).toBeInstanceOf(DIContainer);
        });
    });
});
