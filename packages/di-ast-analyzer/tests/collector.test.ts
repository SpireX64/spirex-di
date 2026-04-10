import { describe, it, expect } from "vitest";
import { collectFileModel } from "../src/collector.js";
import * as acorn from "acorn";
import type { Program } from "estree";

function parse(code: string): Program {
    return acorn.parse(code, {
        ecmaVersion: "latest",
        sourceType: "module",
        locations: true,
    }) as unknown as Program;
}

function collect(code: string) {
    return collectFileModel(parse(code), "test.ts");
}

describe("collectFileModel", () => {
    describe("chained module binder calls", () => {
        it("detects all bindings in a chained binder.bindFactory().bindInstance() call", () => {
            const model = collect(`
                import { staticModule } from '@spirex/di';
                const M = staticModule('TestModule').create(binder => {
                    binder
                        .bindFactory('tokenA', () => 1)
                        .bindInstance('tokenB', 2)
                        .bindFactory('tokenC', () => 3)
                });
            `);

            expect(model.modules).toHaveLength(1);
            expect(model.modules[0].id).toBe("TestModule");

            const bindings = model.modules[0].bindings;
            expect(bindings).toHaveLength(3);

            const types = bindings.map((b) => b.ref.type).sort();
            expect(types).toEqual(["tokenA", "tokenB", "tokenC"]);

            for (const b of bindings) {
                expect(b.moduleId).toBe("TestModule");
            }
        });

        it("detects a single (non-chained) binder call", () => {
            const model = collect(`
                import { staticModule } from '@spirex/di';
                staticModule('Single').create(binder => {
                    binder.bindInstance('only', 42)
                });
            `);

            expect(model.modules).toHaveLength(1);
            expect(model.modules[0].bindings).toHaveLength(1);
            expect(model.modules[0].bindings[0].ref.type).toBe("only");
            expect(model.modules[0].bindings[0].moduleId).toBe("Single");
        });

        it("detects separate binder statements inside a module", () => {
            const model = collect(`
                import { staticModule } from '@spirex/di';
                staticModule('Multi').create(binder => {
                    binder.bindFactory('a', () => 1);
                    binder.bindInstance('b', 2);
                });
            `);

            expect(model.modules[0].bindings).toHaveLength(2);
            const types = model.modules[0].bindings.map((b) => b.ref.type).sort();
            expect(types).toEqual(["a", "b"]);
        });
    });

    describe("chained builder variable calls", () => {
        it("detects all bindings on a chained builder variable", () => {
            const model = collect(`
                import { diBuilder } from '@spirex/di';
                const b = diBuilder();
                b.bindFactory('x', () => 1).bindInstance('y', 2);
            `);

            const allBindings = model.builders.flatMap((b) => b.bindings);
            expect(allBindings).toHaveLength(2);

            const types = allBindings.map((b) => b.ref.type).sort();
            expect(types).toEqual(["x", "y"]);
        });

        it("detects separate builder variable calls", () => {
            const model = collect(`
                import { diBuilder } from '@spirex/di';
                const b = diBuilder();
                b.bindFactory('a', () => 1);
                b.bindInstance('b', 2);
            `);

            const allBindings = model.builders.flatMap((b) => b.bindings);
            expect(allBindings).toHaveLength(2);

            const types = allBindings.map((b) => b.ref.type).sort();
            expect(types).toEqual(["a", "b"]);
        });
    });

    describe("fluent diBuilder() chain", () => {
        it("detects all bindings in a diBuilder().bindFactory().bindInstance() chain", () => {
            const model = collect(`
                import { diBuilder } from '@spirex/di';
                diBuilder()
                    .bindFactory('p', () => 1)
                    .bindInstance('q', 2)
                    .build();
            `);

            const allBindings = model.builders.flatMap((b) => b.bindings);
            expect(allBindings).toHaveLength(2);

            const types = allBindings.map((b) => b.ref.type).sort();
            expect(types).toEqual(["p", "q"]);

            expect(model.builders[0].hasBuild).toBe(true);
        });
    });

    describe("factory resolver dependencies", () => {
        it("detects r.get() as a required dependency in bindFactory callback", () => {
            const model = collect(`
                import { staticModule } from '@spirex/di';
                staticModule('Mod').create(builder => {
                    builder.bindFactory('service', (r) => new Service(r.get('dep')));
                });
            `);

            const binding = model.modules[0].bindings[0];
            expect(binding.ref.type).toBe("service");
            expect(binding.dependencies).toHaveLength(1);
            expect(binding.dependencies[0].type).toBe("dep");
            expect(binding.resolverDeps).toHaveLength(1);
            expect(binding.resolverDeps![0].method).toBe("get");
            expect(binding.resolverDeps![0].optional).toBe(false);
            expect(binding.resolverDeps![0].ref.type).toBe("dep");
        });

        it("detects r.getAll() as an optional dependency", () => {
            const model = collect(`
                import { staticModule } from '@spirex/di';
                staticModule('I18n').create(builder => {
                    builder.bindFactory('i18nService', (r) =>
                        new I18nService(r.getAll('i18nResource'), { defaultLang: 'ru' })
                    );
                    builder.bindInstance('i18nResource', { ns: 'default' }, { ifConflict: 'append' });
                });
            `);

            const svcBinding = model.modules[0].bindings.find(b => b.ref.type === 'i18nService');
            expect(svcBinding).toBeDefined();
            expect(svcBinding!.resolverDeps).toHaveLength(1);
            expect(svcBinding!.resolverDeps![0].method).toBe("getAll");
            expect(svcBinding!.resolverDeps![0].optional).toBe(true);
            expect(svcBinding!.resolverDeps![0].ref.type).toBe("i18nResource");
            expect(svcBinding!.dependencies).toHaveLength(1);
            expect(svcBinding!.dependencies[0].type).toBe("i18nResource");
        });

        it("detects r.maybe() as an optional dependency", () => {
            const model = collect(`
                import { staticModule } from '@spirex/di';
                staticModule('Mod').create(b => {
                    b.bindFactory('svc', (r) => {
                        const opt = r.maybe('optional');
                        return new Svc(opt);
                    });
                });
            `);

            const binding = model.modules[0].bindings[0];
            expect(binding.resolverDeps).toHaveLength(1);
            expect(binding.resolverDeps![0].method).toBe("maybe");
            expect(binding.resolverDeps![0].optional).toBe(true);
        });

        it("detects multiple resolver calls in one factory", () => {
            const model = collect(`
                import { staticModule } from '@spirex/di';
                staticModule('Mod').create(b => {
                    b.bindFactory('svc', (r) =>
                        new Svc(r.get('a'), r.getAll('b'), r.maybe('c'))
                    );
                });
            `);

            const binding = model.modules[0].bindings[0];
            expect(binding.resolverDeps).toHaveLength(3);
            expect(binding.dependencies).toHaveLength(3);

            const methods = binding.resolverDeps!.map(d => d.method);
            expect(methods).toEqual(["get", "getAll", "maybe"]);

            expect(binding.resolverDeps![0].optional).toBe(false);
            expect(binding.resolverDeps![1].optional).toBe(true);
            expect(binding.resolverDeps![2].optional).toBe(true);
        });

        it("does not detect resolver deps when factory has no function param", () => {
            const model = collect(`
                import { staticModule } from '@spirex/di';
                staticModule('Mod').create(b => {
                    b.bindFactory('svc', myFactoryFn);
                });
            `);

            const binding = model.modules[0].bindings[0];
            expect(binding.resolverDeps).toBeUndefined();
            expect(binding.dependencies).toHaveLength(0);
        });

        it("detects resolver deps in standalone builder bindFactory", () => {
            const model = collect(`
                import { diBuilder } from '@spirex/di';
                const b = diBuilder();
                b.bindFactory('svc', (r) => new Svc(r.get('dep1'), r.getAll('dep2')));
            `);

            const allBindings = model.builders.flatMap(b => b.bindings);
            const svc = allBindings.find(b => b.ref.type === 'svc');
            expect(svc).toBeDefined();
            expect(svc!.resolverDeps).toHaveLength(2);
            expect(svc!.resolverDeps![0].ref.type).toBe("dep1");
            expect(svc!.resolverDeps![0].optional).toBe(false);
            expect(svc!.resolverDeps![1].ref.type).toBe("dep2");
            expect(svc!.resolverDeps![1].optional).toBe(true);
        });
    });

    describe("module variableName detection", () => {
        it("captures variableName when module is assigned to a variable", () => {
            const model = collect(`
                import { staticModule } from '@spirex/di';
                const MyMod = staticModule('MyModule').create(b => {
                    b.bindInstance('t', 1)
                });
            `);

            expect(model.modules[0].variableName).toBe("MyMod");
        });
    });
});
