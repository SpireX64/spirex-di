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
import { isFactoryTypeEntry, isInstanceTypeEntry } from "./utils";
import { InstanceActivator } from "./internal/InstanceActivator";

export class DIScope<TypeMap extends TTypeMapBase>
    implements IInstanceResolver<TypeMap>
{
    private readonly _id: TScopeID;
    private readonly _registrar: Registrar<TypeMap>;
    private readonly _activator: InstanceActivator<TypeMap>;
    private readonly _parentScopeRef: DIScope<TypeMap> | null = null;
    private readonly _local: InstancesStorage<TypeMap>;

    public constructor(
        id: TScopeID,
        registrar: Registrar<TypeMap>,
        activator: InstanceActivator<TypeMap>,
        parent?: DIScope<TypeMap>,
    ) {
        this._id = id;
        this._registrar = registrar;
        this._activator = activator;
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

    // region IInstanceResolver
    public get<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): TypeMap[Key] {
        const entry = this._registrar.findTypeEntry(type, name);
        if (!entry) throw Error(Errors.TypeBindingNotFound(type.toString()));
        return this.getInstanceByEntry(entry);
    }

    public getProvider<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): TProvider<TypeMap[Key]> {
        if (!this._registrar.hasType(type, name))
            throw Error(Errors.TypeBindingNotFound(type.toString()));
        return this.get.bind(this, type, name) as TProvider<TypeMap[Key]>;
    }

    public getAll<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): readonly TypeMap[Key][] {
        const entries = this._registrar.findAllTypeEntries(type, name);
        const instances: TypeMap[Key][] = [];
        for (const entry of entries)
            instances.push(this.getInstanceByEntry(entry));
        return instances;
    }
    // endregion IInstanceResolver

    // region Private methods

    private getInstanceByEntry<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
    ): TypeMap[Key] {
        if (isInstanceTypeEntry(entry)) return entry.instance;
        if (entry.lifecycle === "transient")
            return this._activator.createInstance(entry, this);

        let instance = this._local.getInstance(entry);
        if (!instance) {
            if (this._parentScopeRef && entry.lifecycle !== "scope") {
                return this._parentScopeRef.getInstanceByEntry(entry);
            }
            instance = this._activator.createInstance(entry, this);
            this._local.storeInstance(entry, instance);
        }
        return instance;
    }

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

    // endregion Private methods
}
