import { describe, test, expect, vi } from "vitest";
import { diBuilder } from "@spirex/di";
import { Config } from "./index";

describe("Config Middleware", () => {
    test("WHEN: Instance not created", () => {
        // Arrange -----
        var typeKey = "typeKey";
        var factory = vi.fn();
        var configurator = vi.fn();

        // Act ---------
        diBuilder()
            .bindFactory(typeKey, factory, { lifecycle: "lazy" })
            .use(
                Config({
                    [typeKey]: configurator,
                }),
            )
            .build();

        // Assert ------
        expect(factory).not.toHaveBeenCalled();
        expect(configurator).not.toHaveBeenCalled();
    });

    test("WHEN: Instance activated", () => {
        // Arrange -----
        var expectedValue = 42;
        var typeKey = "typeKey";
        var factory = vi.fn(() => ({ value: null }));
        var configurator = vi.fn((obj) => {
            obj.value = expectedValue;
        });

        var container = diBuilder()
            .bindFactory(typeKey, factory, { lifecycle: "lazy" })
            .use(
                Config({
                    [typeKey]: configurator,
                }),
            )
            .build();

        // Act ---------
        var inst = container.get(typeKey);

        // Assert ------
        expect(inst.value).toBe(expectedValue);

        expect(factory).toHaveBeenCalled();
        expect(configurator).toHaveBeenCalled();
    });

    test("WHEN: Named instances activated", () => {
        // Arrange -----
        var valueDefault = 42;
        var valueFoo = 11;
        var valueBar = 22;

        var typeKey = "typeKey";
        var factoryDefault = vi.fn(() => ({ name: "default", value: null }));
        var factoryFoo = vi.fn(() => ({ name: "foo", value: null }));
        var factoryBar = vi.fn(() => ({ name: "bar", value: null }));

        var configDefault = vi.fn((it) => {
            it.value = valueDefault;
        });
        var configFoo = vi.fn((foo) => (foo.value = valueFoo));
        var configBar = vi.fn((bar) => (bar.value = valueBar));

        var container = diBuilder()
            .bindFactory(typeKey, factoryDefault, { lifecycle: "lazy" })
            .bindFactory(typeKey, factoryFoo, {
                name: "foo",
                lifecycle: "lazy",
            })
            .bindFactory(typeKey, factoryBar, {
                name: "bar",
                lifecycle: "lazy",
            })
            .use(
                Config({
                    [typeKey]: {
                        "": configDefault,
                        "foo": configFoo,
                        "bar": configBar,
                    },
                }),
            )
            .build();

        // Act ---------
        var instDefault = container.get(typeKey);
        var instFoo = container.get(typeKey, "foo");
        var instBar = container.get(typeKey, "bar");

        // Assert ------
        expect(instDefault.value).toBe(valueDefault);
        expect(instFoo.value).toBe(valueFoo);
        expect(instBar.value).toBe(valueBar);

        expect(factoryDefault).toHaveBeenCalled();
        expect(factoryFoo).toHaveBeenCalled();
        expect(factoryBar).toHaveBeenCalled();

        expect(configDefault).toHaveBeenCalled();
        expect(configFoo).toHaveBeenCalled();
        expect(configBar).toHaveBeenCalled();
    });

    test("WHEN: Pass not a function as configurator", () => {
        // Arrange ------
        var typeKey = "typeKey";
        var factory = vi.fn(() => ({ value: null }));
        var container = diBuilder()
            .bindFactory(typeKey, factory, { lifecycle: "lazy" })
            .use(
                Config({
                    [typeKey]: "non-function",
                }),
            )
            .build();

        // Act ----------
        var inst = container.get(typeKey);

        // Assert -------
        expect(inst).toBeDefined();
        expect(inst.value).is.null;
    });

    test("WHEN: Type have no config", () => {
        // Arrange ------
        var typeKey = "typeKey";
        var expectedValue = 11;
        var factory = vi.fn(() => ({ value: expectedValue }));
        var configurator = vi.fn((it) => {
            it.value = 42;
        });

        var container = diBuilder()
            .use(
                Config({
                    other: configurator,
                }),
            )
            .bindFactory(typeKey, factory, { lifecycle: "lazy" })
            .build();

        // Act ----------
        var inst = container.get(typeKey);

        // Assert -------
        expect(inst.value).toBe(expectedValue);
        expect(configurator).not.toHaveBeenCalled();
        expect(factory).toHaveBeenCalled();
    });
});
