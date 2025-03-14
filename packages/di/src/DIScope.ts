import type {
    IInstanceResolver,
    TProvider,
    TScopeID,
    TTypeEntry,
    TTypeMapBase,
} from "./types";
import { InstancesStorage } from "./internal/InstancesStorage";
import { Registrar } from "./internal/Registrar";
import { Errors } from "./errors";
import {
    checkIsDisposable,
    isFactoryTypeEntry,
    isInstanceTypeEntry,
} from "./utils";
import { InstanceActivator } from "./internal/InstanceActivator";
import { makeEntryId } from "./internal/utils";
import { makePhantomInstance } from "./internal/phantom";
import { ModulesManager } from "./modules/ModulesManager";
import type { TDynamicDIModule, TDynamicModuleHandle } from "./modules/types";

export class DIScope<TypeMap extends TTypeMapBase>
    implements IInstanceResolver<TypeMap>
{
    private readonly _id: TScopeID;
    private readonly _registrar: Registrar<TypeMap>;
    private readonly _activator: InstanceActivator<TypeMap>;
    private readonly _modules: ModulesManager;
    private readonly _parentScopeRef: DIScope<TypeMap> | null = null;
    private readonly _children = new Map<TScopeID, DIScope<TypeMap>>();
    private readonly _local: InstancesStorage<TypeMap>;

    private _closed = false;

    public constructor(
        id: TScopeID,
        registrar: Registrar<TypeMap>,
        activator: InstanceActivator<TypeMap>,
        modules: ModulesManager,
        parent?: DIScope<TypeMap>,
    ) {
        this._id = id;
        this._registrar = registrar;
        this._activator = activator;
        this._modules = modules;
        this._parentScopeRef = parent ?? null;
        if (parent) {
            this._parentScopeRef = parent;
            this._local = new InstancesStorage<TypeMap>();
        } else {
            this._local = this.activateSingletons();
        }
    }

    public get id(): TScopeID {
        return this._id;
    }

    public get isClosed(): boolean {
        return this._closed;
    }

    public scope(id: TScopeID): DIScope<TypeMap> {
        if (this._closed)
            throw new Error(Errors.ParentScopeClosed(this.id, id));
        let scope = this._children.get(id);
        if (scope) return scope;
        scope = new DIScope<TypeMap>(
            id,
            this._registrar,
            this._activator,
            this._modules,
            this,
        );
        this._children.set(id, scope);
        return scope;
    }

    public close(): void {
        if (this._closed) return;
        this._closed = true;
        this.closeChildScopes();
        this.disposeLocalInstances();
    }

    // region IInstanceResolver
    public get<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): TypeMap[Key] {
        if (this._closed)
            throw new Error(
                Errors.ScopeClosed(this._id, makeEntryId(type, name)),
            );
        const entry = this._registrar.findTypeEntry(type, name);
        if (!entry) throw Error(Errors.TypeBindingNotFound(type.toString()));

        if (
            entry.module?.type === "dynamic" &&
            !this._modules.checkLoaded(entry.module)
        ) {
            throw new Error(
                Errors.DynamicModuleNotLoaded(entry.module.name, entry.$id),
            );
        }

        return this.getInstanceByEntry(entry);
    }

    public getOptional<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): TypeMap[Key] | null {
        if (this._closed)
            throw new Error(
                Errors.ScopeClosed(this._id, makeEntryId(type, name)),
            );
        const entry = this._registrar.findTypeEntry(type, name);
        if (!entry) return null;

        if (
            entry.module?.type === "dynamic" &&
            !this._modules.checkLoaded(entry.module)
        ) {
            return null;
        }

        return this.getInstanceByEntry(entry);
    }

    public getProvider<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): TProvider<TypeMap[Key]> {
        if (this._closed)
            throw new Error(
                Errors.ScopeClosed(this._id, makeEntryId(type, name)),
            );
        if (!this._registrar.hasType(type, name))
            throw Error(Errors.TypeBindingNotFound(type.toString()));
        return this.get.bind(this, type, name) as TProvider<TypeMap[Key]>;
    }

    public getPhantom<T extends keyof TypeMap>(
        type: T,
        name?: string | undefined,
    ): TypeMap[T] {
        if (this._closed)
            throw new Error(
                Errors.ScopeClosed(this._id, makeEntryId(type, name)),
            );

        const entry = this._registrar.findTypeEntry(type, name);
        if (!entry) throw Error(Errors.TypeBindingNotFound(type.toString()));
        return (
            this.getInstanceByEntry(entry, true) ||
            makePhantomInstance<TypeMap, T>(
                entry,
                this.getInstanceByEntry.bind(this, entry) as TProvider<
                    TypeMap[T]
                >,
            )
        );
    }

    public getModuleHandle<TypeMap extends TTypeMapBase>(
        module: TDynamicDIModule<TypeMap, unknown>,
    ): TDynamicModuleHandle<TypeMap, unknown> {
        return this._modules.getModuleHandle(module);
    }

    public getAll<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): readonly TypeMap[Key][] {
        if (this._closed)
            throw new Error(
                Errors.ScopeClosed(this._id, makeEntryId(type, name)),
            );
        const entries = this._registrar.findAllTypeEntries(type, name);
        const instances: TypeMap[Key][] = [];
        for (const entry of entries)
            instances.push(this.getInstanceByEntry(entry));
        return instances;
    }
    // endregion IInstanceResolver

    // region Private methods

    /** @internal */
    private getInstanceByEntry<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
        withoutActivation?: boolean,
    ): TypeMap[Key] {
        if (isInstanceTypeEntry(entry)) return entry.instance;
        if (entry.lifecycle === "transient")
            return this._activator.createInstance(entry, this);

        let instance = this._local.getInstance(entry);
        if (!instance) {
            if (this._parentScopeRef && entry.lifecycle !== "scope") {
                return this._parentScopeRef.getInstanceByEntry(entry);
            }
            if (!withoutActivation) {
                instance = this._activator.createInstance(entry, this);
                this._local.storeInstance(entry, instance);
            }
        }
        return instance as TypeMap[Key];
    }

    /** @internal */
    private activateSingletons(): InstancesStorage<TypeMap> {
        const storage = new InstancesStorage<TypeMap>();
        this._registrar.forEach((entry) => {
            if (isFactoryTypeEntry(entry) && entry.lifecycle === "singleton") {
                const instance = this._activator.createInstance(entry, this);
                storage.storeInstance(entry, instance);
            }
        });
        return storage;
    }

    /** @internal */
    private closeChildScopes(): void {
        this._children.forEach((it) => {
            it.close();
        });
        this._children.clear();
    }

    /** @internal */
    private disposeLocalInstances(): void {
        this._local.forEach((inst) => {
            checkIsDisposable(inst) && inst.dispose();
        });
        this._local.clear();
    }

    // endregion Private methods
}
