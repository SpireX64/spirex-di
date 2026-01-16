import "zone.js";
import { vi, describe, test, expect, afterEach } from "vitest";
import { InjectionToken } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting,
} from "@angular/platform-browser-dynamic/testing";
import { diBuilder } from "@spirex/di";
import { AngularBridge, allOf, named } from "./index";

TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
);

describe("Angular Bridge", () => {
    describe("Middleware", () => {
        test("WHEN: Create middleware", () => {
            // Act --------
            var middleware = AngularBridge();

            // Assert -----
            expect(middleware).instanceOf(Object);
            expect(middleware.onPreBuild).instanceOf(Function);
        });

        describe("Applying middleware", () => {
            test("WHEN: Apply middleware without build", () => {
                // Arrange --------
                var builder = diBuilder();

                // Act ------------
                builder.use(AngularBridge());

                // Assert ---------
                expect(builder.has("AngularBridge")).is.false;
            });

            test("WHEN: Apply middleware with build", () => {
                // Arrange --------
                var builder = diBuilder();

                // Act ------------
                builder.use(AngularBridge()).build();

                // Assert ---------
                expect(builder.has("AngularBridge")).is.true;
            });
        });
    });

    describe("Bridge", () => {
        test("WHEN: Get bridge from container", () => {
            // Arrange ---------
            var container = diBuilder().use(AngularBridge()).build();

            // Act --------
            var bridge = container.get("AngularBridge");

            // Assert -----
            expect(bridge).instanceOf(Object);
            expect(bridge.tokens).instanceOf(Object);
            expect(bridge.tokens).is.frozen;
            expect(bridge.tokens).toHaveProperty("ScopeContext");
            expect(bridge.providersForRoot).instanceOf(Function);
            expect(bridge.providersForScope).instanceOf(Function);
        });

        describe("Injection tokens", () => {
            test("WHEN: Extract tokens from empty container", () => {
                // Arrange ---------
                var container = diBuilder().use(AngularBridge()).build();

                var bridge = container.get("AngularBridge");

                // Act --------
                var { tokens } = bridge;

                // Assert -----
                expect(tokens).instanceOf(Object);
                expect(tokens).is.frozen;
                expect(tokens).toHaveProperty("ScopeContext");
            });

            test("WHEN: Extract tokens", () => {
                // Arrange -------
                var typeKey = "typeKey";
                var factoryKey = "factoryKey";

                var container = diBuilder()
                    .bindInstance(typeKey, 42)
                    .bindFactory(factoryKey, () => "Hello")
                    .use(AngularBridge())
                    .build();

                var bridge = container.get("AngularBridge");

                // Act -----------
                var { tokens } = bridge;

                // Assert --------
                expect(tokens[typeKey]).instanceOf(InjectionToken);
                expect(tokens[factoryKey]).instanceOf(InjectionToken);
                expect(tokens["AngularBridge"]).is.undefined;
            });

            describe("Named token", () => {
                test("WHEN: Get named token from a regular Angular token", () => {
                    // Arrange -----------
                    var name = "typeName";
                    var token = new InjectionToken();

                    // Act ---------------
                    var namedToken = named(token, name);

                    // Assert ------------
                    expect(namedToken).toBe(token);
                });

                test("WHEN: Get named token for unnamed service", () => {
                    // Arrange -----------
                    var typeKey = "typeKey";
                    var name = "typeName";

                    var container = diBuilder()
                        .bindInstance(typeKey, 42)
                        .use(AngularBridge())
                        .build();

                    var bridge = container.get("AngularBridge");
                    var token = bridge.tokens[typeKey];

                    // Act ---------------
                    var namedToken = named(token, name);

                    // Assert ------------
                    expect(namedToken).toBe(token);
                });

                test("WHEN: Get named token of named service", () => {
                    // Arrange -----------
                    var typeKey = "typeKey";
                    var name = "typeName";

                    var container = diBuilder()
                        .bindInstance(typeKey, 42, { name })
                        .use(AngularBridge())
                        .build();

                    var bridge = container.get("AngularBridge");
                    var token = bridge.tokens[typeKey];

                    // Act ---------------
                    var namedToken = named(token, name);

                    // Assert ------------
                    expect(namedToken).not.toBe(token);
                });

                test("WHEN: Get named token of undefined named service", () => {
                    // Arrange -----------
                    var typeKey = "typeKey";
                    var typeNameA = "typeNameA";
                    var typeNameB = "typeNameB";
                    var name = "typeName";

                    var container = diBuilder()
                        .bindInstance(typeKey, 42, { name: typeNameA })
                        .use(AngularBridge())
                        .build();

                    var bridge = container.get("AngularBridge");
                    var token = bridge.tokens[typeKey];

                    // Act ---------------
                    var namedTokenA = named(token, typeNameA);
                    var namedTokenB = named(token, typeNameB);

                    // Assert ------------
                    expect(namedTokenA).not.toBe(token);
                    expect(namedTokenB).toBe(token);
                });

                test("WHEN: Get named token from named token", () => {
                    // Arrange -----------
                    var typeKey = "typeKey";
                    var name = "typeName";

                    var container = diBuilder()
                        .bindInstance(typeKey, 42, { name })
                        .use(AngularBridge())
                        .build();

                    var bridge = container.get("AngularBridge");
                    var token = bridge.tokens[typeKey];
                    var namedTokenA = named(token, name);

                    // Act ---------------
                    var namedTokenB = named(token, name);

                    // Assert ------------
                    expect(namedTokenA).not.toBe(token);
                    expect(namedTokenB).not.toBe(token);
                    expect(namedTokenB).toBe(namedTokenA);
                });
            });

            describe("Multi token", () => {
                test("WHEN: Get multi token from regular token", () => {
                    // Arrange --------
                    var regularToken = new InjectionToken();

                    // Act ------------
                    var token = allOf(regularToken);

                    // Assert ---------
                    expect(token).toBe(regularToken);
                });

                test("WHEN: Get multi token of container type", () => {
                    // Arrange -------
                    var typeKey = "typeKey";
                    var container = diBuilder()
                        .bindInstance(typeKey, 42)
                        .use(AngularBridge())
                        .build();

                    var bridge = container.get("AngularBridge");
                    var token = bridge.tokens[typeKey];

                    // Act -----------
                    var multiToken = allOf(token);

                    // Assert --------
                    expect(multiToken).instanceOf(InjectionToken);
                    expect(multiToken).not.toBe(token);
                });

                test("WHEN: Get named multi token of container type", () => {
                    // Arrange --------
                    var typeKey = "typeKey";
                    var typeName = "typeName";

                    var container = diBuilder()
                        .bindInstance(typeKey, 42, { name: typeName })
                        .use(AngularBridge())
                        .build();

                    // Act ------------

                    var bridge = container.get("AngularBridge");
                    var token = bridge.tokens[typeKey];

                    // Act -----------
                    var namedToken = named(token, typeName);
                    var multiTokenA = allOf(namedToken);
                    var multiTokenB = allOf(token, typeName);

                    // Assert ---------
                    expect(token).not.toBe(namedToken);
                    expect(token).not.toBe(multiTokenA);
                    expect(token).not.toBe(multiTokenB);

                    expect(namedToken).not.toBe(multiTokenA);
                    expect(namedToken).not.toBe(multiTokenB);

                    expect(multiTokenA).instanceOf(InjectionToken);
                    expect(multiTokenB).instanceOf(InjectionToken);
                    expect(multiTokenA).toBe(multiTokenB);
                });
            });
        });

        describe("Providers", () => {
            test("WHEN: get providers for root", () => {
                // Arrange --------
                var factoryKey = "factoryKey";
                var typeKey = "typeKey";

                var container = diBuilder()
                    .bindInstance(typeKey, 42)
                    .bindFactory(factoryKey, () => "foo")
                    .use(AngularBridge())
                    .build();

                var bridge = container.get("AngularBridge");

                // Act ------------
                var tokens = bridge.tokens;
                var rootProviders = bridge.providersForRoot();

                var typeProvider = rootProviders.find(
                    (e) => e.provide === tokens[typeKey],
                );
                var factoryProvider = rootProviders.find(
                    (e) => e.provide === tokens[factoryKey],
                );

                // Assert ---------
                expect(rootProviders).instanceOf(Array);

                expect(typeProvider).instanceOf(Object);
                expect(typeProvider.useFactory).instanceOf(Function);

                expect(factoryProvider).instanceOf(Object);
                expect(factoryProvider.useFactory).instanceOf(Function);
            });

            test("WHEN: Get provider for scope (no scope bindings)", () => {
                // Arrange --------
                var factoryKey = "factoryKey";
                var typeKey = "typeKey";

                var container = diBuilder()
                    .bindInstance(typeKey, 42)
                    .bindFactory(factoryKey, () => "foo")
                    .use(AngularBridge())
                    .build();

                var bridge = container.get("AngularBridge");

                // Act ------------
                var tokens = bridge.tokens;
                var scopeProviders = bridge.providersForScope("foo");

                var typeProvider = scopeProviders.find(
                    (e) => e.provide === tokens[typeKey],
                );
                var factoryProvider = scopeProviders.find(
                    (e) => e.provide === tokens[factoryKey],
                );

                // Assert ---------
                expect(scopeProviders).instanceOf(Array);
                expect(typeProvider).is.undefined;
                expect(factoryProvider).is.undefined;
            });

            test("WHEN: Get provider for scope", () => {
                // Arrange --------
                var factoryKey = "factoryKey";
                var typeKey = "typeKey";

                var container = diBuilder()
                    .bindInstance(typeKey, 42)
                    .bindFactory(factoryKey, () => "foo", {
                        lifecycle: "scope",
                    })
                    .use(AngularBridge())
                    .build();

                var bridge = container.get("AngularBridge");

                // Act ------------
                var tokens = bridge.tokens;
                var scopeProviders = bridge.providersForScope("foo");

                var typeProvider = scopeProviders.find(
                    (e) => e.provide === tokens[typeKey],
                );
                var factoryProvider = scopeProviders.find(
                    (e) => e.provide === tokens[factoryKey],
                );

                // Assert ---------
                expect(scopeProviders).instanceOf(Array);
                expect(typeProvider).is.undefined;

                expect(factoryProvider).instanceOf(Object);
                expect(factoryProvider.useFactory).instanceOf(Function);
            });

            test("WHEN: Get multi & scoped providers for scope", () => {
                // Arrange -------------
                var typeKey = "typeKey";
                var typeName = "typeName";

                var container = diBuilder()
                    .bindFactory(typeKey, () => 11, {
                        lifecycle: "scope",
                        ifConflict: "append",
                    })
                    .bindFactory(typeKey, () => 22, {
                        lifecycle: "scope",
                        ifConflict: "append",
                    })
                    .bindFactory(typeKey, () => 33, {
                        lifecycle: "scope",
                        ifConflict: "append",
                        name: typeName,
                    })
                    .bindFactory(
                        typeKey,
                        (r) => r.getAll(typeKey).reduce((s, i) => s + i, 0),
                        {
                            lifecycle: "scope",
                            ifConflict: "append",
                            name: typeName,
                        },
                    )
                    .use(AngularBridge())
                    .build();

                var bridge = container.get("AngularBridge");

                var token = bridge.tokens[typeKey];
                var namedToken = named(token, typeName);
                var multiToken = allOf(token);
                var namedMultiToken = allOf(token, typeName);

                // Act -----------------
                var scopedProviders = bridge.providersForScope("scope");
                var typeProvider = scopedProviders.find(
                    (p) => p.provide == token,
                );
                var namedTypeProvider = scopedProviders.find(
                    (p) => p.provide == namedToken,
                );
                var multiTypeProvider = scopedProviders.find(
                    (p) => p.provide == multiToken,
                );
                var namedMultiTypeProvider = scopedProviders.find(
                    (p) => p.provide == namedMultiToken,
                );

                // Assert --------------
                expect(typeProvider).instanceOf(Object);
                expect(typeProvider.useFactory).instanceOf(Function);

                expect(multiTypeProvider).instanceOf(Object);
                expect(multiTypeProvider.useFactory).instanceOf(Function);

                expect(namedTypeProvider).instanceOf(Object);
                expect(namedTypeProvider.useFactory).instanceOf(Function);

                expect(namedMultiTypeProvider).instanceOf(Object);
                expect(namedMultiTypeProvider.useFactory).instanceOf(Function);
            });
        });
    });

    describe("Integration with Angular DI", () => {
        afterEach(() => {
            TestBed.resetTestingModule();
        });

        test("WHEN: Resolve value", () => {
            // Arrange -------
            var typeKey = "typeKey";
            var expectedValue = 42;
            var container = diBuilder()
                .bindInstance(typeKey, expectedValue)
                .use(AngularBridge())
                .build();

            var bridge = container.get("AngularBridge");

            TestBed.configureTestingModule({
                providers: bridge.providersForRoot(),
            });

            // Act -----------
            var value = TestBed.inject(bridge.tokens[typeKey]);

            // Assert --------
            expect(value).toBe(expectedValue);
        });

        test("WHEN: Resolve singleton", () => {
            // Arrange --------
            var typeKey = "typeKey";
            var factory = vi.fn(() => new Object());

            var container = diBuilder()
                .bindFactory(typeKey, factory)
                .use(AngularBridge())
                .build();

            var bridge = container.get("AngularBridge");

            TestBed.configureTestingModule({
                providers: bridge.providersForRoot(),
            });

            // Act -----------
            var resolved = container.get(typeKey);
            var injectedA = TestBed.inject(bridge.tokens[typeKey]);
            var injectedB = TestBed.inject(bridge.tokens[typeKey]);

            // Arrange ------
            expect(factory).toHaveBeenCalledOnce();
            expect(injectedA).eq(resolved);
            expect(injectedB).eq(resolved);
        });

        test("WHEN: Resolve lazy instance", () => {
            // Arrange --------
            var typeKey = "typeKey";
            var factory = vi.fn(() => new Object());

            var container = diBuilder()
                .bindFactory(typeKey, factory, { lifecycle: "lazy" })
                .use(AngularBridge())
                .build();

            var bridge = container.get("AngularBridge");

            TestBed.configureTestingModule({
                providers: bridge.providersForRoot(),
            });

            // Act -----------
            var resolved = container.get(typeKey);
            var injectedA = TestBed.inject(bridge.tokens[typeKey]);
            var injectedB = TestBed.inject(bridge.tokens[typeKey]);

            // Arrange ------
            expect(factory).toHaveBeenCalledOnce();
            expect(injectedA).eq(resolved);
            expect(injectedB).eq(resolved);
        });

        test("WHEN: Resolve transient instance", () => {
            // Arrange --------
            var typeKey = "typeKey";
            var factory = vi.fn(() => new Object());

            var container = diBuilder()
                .bindFactory(typeKey, factory, { lifecycle: "transient" })
                .use(AngularBridge())
                .build();

            var bridge = container.get("AngularBridge");

            TestBed.configureTestingModule({
                providers: bridge.providersForRoot(),
            });

            // Act -----------
            var resolved = container.get(typeKey);
            var injectedA = TestBed.inject(bridge.tokens[typeKey]);
            var injectedB = TestBed.inject(bridge.tokens[typeKey]);

            // Arrange ------
            expect(factory).toHaveBeenCalledTimes(2);
            expect(injectedA).not.eq(resolved);
            expect(injectedB).not.eq(resolved);

            // It's OK, Angular does not support transient lifecycle :)
            expect(injectedA).eq(injectedB);
        });

        test("WHEN: Resolve scoped instance", () => {
            // Arrange --------
            var typeKey = "typeKey";
            var typeFactory = vi.fn(() => new Object());
            var container = diBuilder()
                .bindFactory(typeKey, typeFactory, { lifecycle: "scope" })
                .use(AngularBridge())
                .build();

            var bridge = container.get("AngularBridge");

            TestBed.configureTestingModule({
                providers: bridge.providersForRoot(),
            });

            // Act ------------
            var rootInstance = TestBed.inject(bridge.tokens[typeKey]);

            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: bridge.providersForScope(),
            });

            var scopeInstance = TestBed.inject(bridge.tokens[typeKey]);

            // Assert ---------
            expect(rootInstance).not.toBe(scopeInstance);
        });

        test("WHEN: Resolve all instances of type", () => {
            // Arrange --------
            var typeKey = "typeKey";
            var expectedValuesList = [11, 22, 33];
            var builder = diBuilder();
            expectedValuesList.forEach((v) =>
                builder.bindInstance(typeKey, v, { ifConflict: "append" }),
            );
            var container = builder.use(AngularBridge()).build();

            var bridge = container.get("AngularBridge");

            TestBed.configureTestingModule({
                providers: bridge.providersForRoot(),
            });

            // Act ------------
            var typeToken = bridge.tokens[typeKey];
            var firstValue = TestBed.inject(typeToken);
            var values = TestBed.inject(allOf(typeToken));

            // Assert ---------
            expect(firstValue).eq(expectedValuesList[0]);
            expect(values).instanceOf(Array);
            expect(values).toHaveLength(expectedValuesList.length);
            expect(values).toEqual(expect.arrayContaining(expectedValuesList));
        });

        test("WHEN: Resolve all instances of named type", () => {
            // Arrange --------
            var typeKey = "typeKey";
            var typeName = "typeName";
            var expectedValuesList = [11, 22, 33];
            var builder = diBuilder()
                .bindInstance(typeKey, 44)
            expectedValuesList.forEach((v) =>
                builder.bindInstance(typeKey, v, { name: typeName, ifConflict: "append" }),
            );
            var container = builder.use(AngularBridge()).build();

            var bridge = container.get("AngularBridge");

            var providers = bridge.providersForRoot()
            TestBed.configureTestingModule({
                providers,
            });

            // Act ------------
            var typeToken = named(bridge.tokens[typeKey], typeName);
            var firstValue = TestBed.inject(typeToken);
            var values = TestBed.inject(allOf(typeToken));

            // Assert ---------
            expect(firstValue).eq(expectedValuesList[0]);
            expect(values).instanceOf(Array);
            expect(values).toHaveLength(expectedValuesList.length);
            expect(values).toEqual(expect.arrayContaining(expectedValuesList));
        });

        test("WHEN: Resolve current scope context", () => {
            // Arrange --------
            var scopeId = "TestScope"
            var onScopeDispose = vi.fn()
            var container = diBuilder()
                .use({ onScopeDispose })
                .use(AngularBridge())
                .build()

            var bridge = container.get('AngularBridge')

            TestBed.configureTestingModule({
                providers: bridge.providersForScope(scopeId),
            })

            // Act ------------
            var context = TestBed.inject(bridge.tokens.ScopeContext);
            context.dispose()

            // Assert ---------
            expect(context.current).toBe(scopeId)
            expect(context.dispose).instanceOf(Function)
            expect(onScopeDispose).toHaveBeenCalledOnce(
                expect.objectContaining({ id: scopeId })
            )
        })
    });
});
