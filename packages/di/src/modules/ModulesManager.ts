import type { TAnyDIModule, TDynamicDIModule } from "./types";
import type { TTypeMapBase } from "../types";
import { Errors } from "../errors";

// istanbul ignore next
function stub() {
    throw new Error(Errors.DynamicModuleStubAccess);
}

export class ModulesManager {
    private readonly _modules = new Set<TAnyDIModule<never>>();
    private readonly _cache = new Map<string, unknown>();

    public add<TypeMap extends TTypeMapBase>(
        diModule: TAnyDIModule<TypeMap>,
    ): void {
        this._modules.add(diModule);
    }

    public has<TypeMap extends TTypeMapBase>(
        diModule: TAnyDIModule<TypeMap>,
    ): boolean {
        return this._modules.has(diModule);
    }

    public get count(): number {
        return this._modules.size;
    }

    public async loadModuleAsync<TypeMap extends TTypeMapBase, JSModule>(
        diModule: TDynamicDIModule<TypeMap, JSModule>,
    ): Promise<void> {
        const jsModule = await diModule.importDelegate();
        this._cache.set(diModule.name, jsModule);
    }

    public getJSModule<TypeMap extends TTypeMapBase, JSModule>(
        diModule: TDynamicDIModule<TypeMap, JSModule>,
    ): JSModule {
        if (this._cache.has(diModule.name))
            return this._cache.get(diModule.name) as JSModule;

        // Make closure access to manager by module
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const managerRef = this;
        return new Proxy(stub, {
            get(_, key): unknown {
                const jsModule = managerRef._cache.get(diModule.name);
                if (jsModule) {
                    // @ts-expect-error: We don't know a real type of module member
                    return jsModule[key];
                }
                return managerRef.dynamicAccessor(diModule, [key]) as unknown;
            },

            set(_, member, newValue: unknown): boolean {
                const jsModule = managerRef._cache.get(diModule.name);
                if (jsModule) {
                    if (typeof jsModule !== "object") return false;
                    const descriptor = Object.getOwnPropertyDescriptor(
                        jsModule,
                        member,
                    );
                    if (!descriptor?.writable) return false;
                    // @ts-expect-error: Unsafe assignment
                    jsModule[member] = newValue;
                    return true;
                }
                throw new Error(
                    Errors.DynamicModuleModification(
                        diModule.name,
                        member.toString(),
                    ),
                );
            },
        }) as JSModule;
    }

    private dynamicAccessor<TypeMap extends TTypeMapBase, JSModule>(
        module: TDynamicDIModule<TypeMap, JSModule>,
        path: readonly (string | symbol)[],
    ) {
        // Make closure access to manager by module accessor
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const managerRef = this;
        return new Proxy(stub, {
            get(_, key): unknown {
                const jsModule = managerRef._cache.get(module.name);
                if (jsModule) {
                    const propPath =
                        key === "valueOf" ? path : path.concat(key);
                    // @ts-expect-error: Module linking mediator must be object or array
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    const prop = propPath.reduce((m, key) => m[key], jsModule);
                    if (key === "valueOf") return prop.valueOf.bind(prop);
                    else return prop;
                }
                return managerRef.dynamicAccessor(module, path.concat(key));
            },

            set(_, key, newValue: unknown): boolean {
                const jsModule = managerRef._cache.get(module.name);
                if (jsModule) {
                    const target = path.reduce(
                        // @ts-expect-error: Module linking mediator must be object or array
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        (m, key) => m[key],
                        jsModule,
                    );
                    if (typeof target !== "object") return false;
                    const descriptor = Object.getOwnPropertyDescriptor(
                        target,
                        key,
                    );
                    if (!descriptor?.writable) return false;
                    // @ts-expect-error: Unsafe assignment
                    target[key] = newValue;
                    return true;
                }
                throw new Error(
                    Errors.DynamicModuleModification(
                        module.name,
                        path.join(".") + "." + key.toString(),
                    ),
                );
            },

            construct(_, argArray: unknown[]): object {
                const jsModule = managerRef._cache.get(module.name);
                if (!jsModule) {
                    throw new Error(
                        Errors.DynamicModuleConstructorCall(
                            module.name,
                            path.join(","),
                        ),
                    );
                }

                const targetClass = path.reduce(
                    // @ts-expect-error: Module linking mediator must be object or array
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    (m, key) => m[key],
                    jsModule,
                ) as { new (...args: unknown[]): object };

                return new targetClass(...argArray);
            },

            apply(_, thisArg: unknown, argArray: unknown[]): unknown {
                const jsModule = managerRef._cache.get(module.name);
                if (!jsModule)
                    throw new Error(
                        Errors.DynamicModuleFunctionCall(
                            module.name,
                            path.join("."),
                        ),
                    );

                const target = path.reduce(
                    // @ts-expect-error: Module linking mediator must be object or array
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    (m, key) => m[key],
                    jsModule,
                );
                if (typeof target !== "function") return undefined;
                return target.call(thisArg, ...argArray);
            },
        });
    }
}
