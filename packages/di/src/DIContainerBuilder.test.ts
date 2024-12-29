import { DIContainerBuilder } from "./DIContainerBuilder";
import { DIContainer } from "./DIContainer";
import { catchError } from "./__test__/errors";
import { isFactoryTypeEntry } from "./utils";
import type { TLifecycle } from "./types";

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

    describe("Binding conflicts", () => {
        test("Throw when bind two instances with same type", () => {
            // Arrange -------
            const builder = new DIContainerBuilder<{ typeKey: number }>();

            const expectedValue = 8;
            builder.bindInstance("typeKey", expectedValue);

            // Act -----------
            const err = catchError(() => builder.bindInstance("typeKey", 42));
            const entry = builder.getTypeEntry("typeKey");

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
            const entry = builder.getTypeEntry("typeKey");

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
            const entry = builder.getTypeEntry("typeKey");

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
            const entry = builder.getTypeEntry("typeKey");

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
            const entry = builder.getTypeEntry("typeKey");

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
            const entry = builder.getTypeEntry("typeKey");

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
            const entry = builder.getTypeEntry("value");

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
                const entry = builder.getTypeEntry("value");

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
            const entry = builder.getTypeEntry("value");

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
            const entry = builder.getTypeEntry("value");

            // Assert ------------
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect("lifecycle" in entry!).toBeFalsy();
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
