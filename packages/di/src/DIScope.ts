import {
    IInstanceResolver,
    IModuleHandleResolver,
    IScopeHandle,
    IScopeHandleResolver,
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
import type { TContainerMiddleware } from "./middleware";

export type TDIScopeTransfers<TypeMap extends TTypeMapBase> = {
    middlewares: ReadonlySet<TContainerMiddleware<TypeMap>>;
    registrar: Registrar<TypeMap>;
    activator: InstanceActivator<TypeMap>;
    modules: ModulesManager;
};

export class DIScope<TypeMap extends TTypeMapBase>
    implements
        IInstanceResolver<TypeMap>,
        IScopeHandleResolver,
        IModuleHandleResolver
{
    private readonly _id: TScopeID;
    private readonly _registrar: Registrar<TypeMap>;
    private readonly _activator: InstanceActivator<TypeMap>;
    private readonly _middlewares: ReadonlySet<TContainerMiddleware<TypeMap>>;
    private readonly _modules: ModulesManager;
    private readonly _parentScopeRef: DIScope<TypeMap> | null = null;
    private readonly _children = new Map<TScopeID, DIScope<TypeMap>>();
    private readonly _local: InstancesStorage<TypeMap>;

    private _closed = false;

    public constructor(
        id: TScopeID,
        transfers: TDIScopeTransfers<TypeMap>,
        parent?: DIScope<TypeMap>,
    ) {
        this._id = id;
        this._registrar = transfers.registrar;
        this._activator = transfers.activator;
        this._middlewares = transfers.middlewares;
        this._modules = transfers.modules;
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
            {
                registrar: this._registrar,
                activator: this._activator,
                middlewares: this._middlewares,
                modules: this._modules,
            },
            this,
        );
        this._children.set(id, scope);
        this._middlewares.forEach((middleware) =>
            middleware.onScopeWasOpen?.(scope),
        );
        return scope;
    }

    public close(): void {
        if (this._closed) return;
        this._middlewares.forEach((middleware) =>
            middleware.onScopeWillClose?.(this),
        );
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
        let entry = this._registrar.findTypeEntry(type, name);
        if (!entry) throw Error(Errors.TypeBindingNotFound(type.toString()));

        if (
            entry.module?.type === "dynamic" &&
            !this._modules.checkLoaded(entry.module)
        ) {
            throw new Error(
                Errors.DynamicModuleNotLoaded(entry.module.name, entry.$id),
            );
        }

        entry = this.entryOnRequestMiddleware(entry);
        this.verifyIsEntryRestriction(entry);
        return this.entryOnResolveMiddleware(
            this.getInstanceByEntry(entry),
            entry,
        );
    }

    public getOptional<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): TypeMap[Key] | null {
        if (this._closed)
            throw new Error(
                Errors.ScopeClosed(this._id, makeEntryId(type, name)),
            );
        let entry = this._registrar.findTypeEntry(type, name);
        if (!entry) return null;

        entry = this.entryOnRequestMiddleware(entry);

        if (
            entry.module?.type === "dynamic" &&
            !this._modules.checkLoaded(entry.module)
        ) {
            return null;
        }

        if (!this.verifyIsEntryRestriction(entry, true)) return null;

        return this.entryOnResolveMiddleware(
            this.getInstanceByEntry(entry),
            entry,
        );
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

        let entry = this._registrar.findTypeEntry(type, name);
        if (!entry) throw Error(Errors.TypeBindingNotFound(type.toString()));

        entry = this.entryOnRequestMiddleware(entry);
        this.verifyIsEntryRestriction(entry);
        return (
            this.entryOnResolveMiddleware(
                this.getInstanceByEntry(entry, true),
                entry,
            ) ||
            makePhantomInstance<TypeMap, T>(entry, () =>
                this.entryOnResolveMiddleware(
                    this.getInstanceByEntry(entry, true),
                    entry,
                ),
            )
        );
    }

    public getModuleHandle<TypeMap extends TTypeMapBase, ESModule>(
        module: TDynamicDIModule<TypeMap, ESModule>,
    ): TDynamicModuleHandle<TypeMap, ESModule> {
        return this._modules.getModuleHandle(module);
    }

    public getScopeHandle(): IScopeHandle {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const scope = this;
        return Object.freeze({
            id: scope.id,
            close: scope.close.bind(scope),
            get isClosed(): boolean {
                return scope.isClosed;
            },
        });
    }

    public getAll<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): readonly TypeMap[Key][] {
        if (this._closed)
            throw new Error(
                Errors.ScopeClosed(this._id, makeEntryId(type, name)),
            );
        return this._registrar
            .findAllTypeEntries(type, name)
            .filter((it) => this.verifyIsEntryRestriction(it, true))
            .map((it) =>
                this.entryOnResolveMiddleware(
                    this.getInstanceByEntry(this.entryOnRequestMiddleware(it)),
                    it,
                ),
            );
    }
    // endregion IInstanceResolver

    // region Private methods

    /** @internal */
    private getInstanceByEntry<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
        withoutActivation?: boolean,
    ): TypeMap[Key] {
        if (isInstanceTypeEntry(entry)) return entry.instance;
        if (entry.lifecycle === "transient") {
            let instance = this._activator.createInstance(entry, this);
            this._middlewares.forEach((middleware) => {
                if (middleware.onCreated)
                    instance = middleware.onCreated(
                        entry,
                        instance,
                    ) as TypeMap[Key];
            });
            return instance;
        }

        let instance = this._local.getInstance(entry);
        if (!instance) {
            if (this._parentScopeRef && entry.lifecycle !== "scope") {
                return this._parentScopeRef.getInstanceByEntry(entry);
            }
            if (!withoutActivation) {
                instance = this._activator.createInstance(entry, this);
                this._middlewares.forEach((middleware) => {
                    if (middleware.onCreated)
                        instance = middleware.onCreated(
                            entry,
                            instance as TypeMap[Key],
                        ) as TypeMap[Key];
                });
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

    private verifyIsEntryRestriction<
        TypeMap extends TTypeMapBase,
        Type extends keyof TypeMap,
    >(entry: TTypeEntry<TypeMap, Type>, noThrow = false): boolean {
        if (!entry.scope || (Array.isArray(entry.scope) && !entry.scope.length))
            return true;

        const scopeFold: TScopeID[] = [this._id];
        for (
            let scopeRef = this._parentScopeRef;
            scopeRef != null;
            scopeRef = scopeRef._parentScopeRef
        ) {
            scopeFold.push(scopeRef._id);
        }

        const isAllowed = Array.isArray(entry.scope)
            ? entry.scope.some((it: TScopeID) => scopeFold.includes(it))
            : scopeFold.includes(entry.scope as TScopeID);

        if (isAllowed) return true;
        if (noThrow) return false;

        throw new Error(
            Errors.ScopeRestrictionError(
                entry.$id,
                entry.scope as TScopeID,
                scopeFold,
            ),
        );
    }

    private entryOnRequestMiddleware<Type extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Type>,
    ): TTypeEntry<TypeMap, Type> {
        let newEntry = entry;
        this._middlewares.forEach((middleware) => {
            if (middleware.onRequest) {
                newEntry = middleware.onRequest(newEntry, entry, this);
                if (newEntry.$id !== entry.$id)
                    throw new Error(
                        Errors.MiddlewareEntryTypeMismatch(
                            middleware.name ?? "",
                            newEntry.$id,
                            entry.$id,
                        ),
                    );
            }
        });
        return newEntry;
    }

    private entryOnResolveMiddleware<Type extends keyof TypeMap>(
        instance: TypeMap[Type],
        entry: TTypeEntry<TypeMap, Type>,
    ): TypeMap[Type] {
        if (instance == null) return instance;
        this._middlewares.forEach((middleware) => {
            if (middleware.onResolve) {
                instance = middleware.onResolve(
                    instance,
                    entry,
                    this,
                ) as TypeMap[Type];
            }
        });
        return instance;
    }

    // endregion Private methods
}
