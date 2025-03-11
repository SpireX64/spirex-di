import type {
    TAnyDIModule,
    TDynamicDIModule,
    TDynamicModuleHandle,
} from "./types";
import type { TTypeMapBase } from "../types";
import { Errors } from "../errors";

function stub() {
    throw new Error(Errors.DynamicModuleStubAccess);
}

export class ModulesManager {
    private readonly _modules = new Set<TAnyDIModule<never>>();
    private readonly _handles = new Map<
        string,
        TDynamicModuleHandle<never, unknown>
    >();
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

    public checkLoaded<TypeMap extends TTypeMapBase, ESModule>(
        diModule: TDynamicDIModule<TypeMap, ESModule>,
    ): boolean {
        return this._cache.has(diModule.name);
    }

    public async loadModuleAsync<TypeMap extends TTypeMapBase, ESModule>(
        diModule: TDynamicDIModule<TypeMap, ESModule>,
    ): Promise<void> {
        if (!this._modules.has(diModule))
            throw new Error(Errors.ModuleNotAvailable(diModule.name));
        if (this._cache.has(diModule.name)) return;
        const jsModule = await diModule.importDelegate();
        this._cache.set(diModule.name, jsModule);
    }

    public getModuleHandle<TypeMap extends TTypeMapBase, ESModule>(
        diModule: TDynamicDIModule<TypeMap, ESModule>,
    ): TDynamicModuleHandle<TypeMap, ESModule> {
        if (!this._modules.has(diModule))
            throw new Error(Errors.ModuleNotAvailable(diModule.name));

        if (this._handles.has(diModule.name))
            return this._handles.get(diModule.name) as TDynamicModuleHandle<
                TypeMap,
                ESModule
            >;

        const handle: TDynamicModuleHandle<TypeMap, ESModule> = {
            module: diModule,
            isLoaded: false,
            // @ts-expect-error: safe cast
            loadAsync: this.loadModuleAsync.bind(this, diModule),
        };

        Object.defineProperty(handle, "isLoaded", {
            // @ts-expect-error: safe cast
            get: this.checkLoaded.bind(this, diModule),
        });
        // @ts-expect-error: safe cast
        this._handles.set(diModule.name, handle);
        return handle;
    }

    public getESModule<TypeMap extends TTypeMapBase, ESModule>(
        diModule: TDynamicDIModule<TypeMap, ESModule>,
    ): ESModule {
        if (this._cache.has(diModule.name))
            return this._cache.get(diModule.name) as ESModule;

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
                const esModule = managerRef._cache.get(diModule.name);
                if (esModule) {
                    const esModuleType = typeof esModule;
                    if (esModuleType !== "object")
                        throw new TypeError(
                            Errors.NonObjectPropertySet(
                                member.toString(),
                                esModuleType,
                            ),
                        );
                    // @ts-expect-error: Unsafe assignment
                    esModule[member] = newValue;
                    return true;
                }
                throw new Error(
                    Errors.DynamicModuleModification(
                        diModule.name,
                        member.toString(),
                    ),
                );
            },
        }) as ESModule;
    }

    private dynamicAccessor<TypeMap extends TTypeMapBase, ESModule>(
        module: TDynamicDIModule<TypeMap, ESModule>,
        path: readonly (string | symbol)[],
    ) {
        // Make closure access to manager by module accessor
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const managerRef = this;
        return new Proxy(stub, {
            get(_, key): unknown {
                const esModule = managerRef._cache.get(module.name);
                if (esModule) {
                    const propPath =
                        key === "valueOf" ? path : path.concat(key);
                    // @ts-expect-error: Module linking mediator must be object or array
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    const prop = propPath.reduce((m, key) => m[key], esModule);
                    if (key === "valueOf") return prop.valueOf.bind(prop);
                    else return prop;
                }
                return managerRef.dynamicAccessor(module, path.concat(key));
            },

            set(_, key, newValue: unknown): boolean {
                const esModule = managerRef._cache.get(module.name);
                if (esModule) {
                    const target = path.reduce(
                        // @ts-expect-error: Module linking mediator must be object or array
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        (m, key) => m[key],
                        esModule,
                    );
                    const targetType = typeof target;
                    if (targetType !== "object")
                        throw new TypeError(
                            Errors.NonObjectPropertySet(
                                key.toString(),
                                targetType,
                            ),
                        );
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
                // @ts-expect-error: Unsafe function call
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                return target.call(thisArg, ...argArray);
            },
        });
    }
}
