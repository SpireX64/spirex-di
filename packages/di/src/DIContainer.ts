import type {
    IInstanceResolver,
    TProvider,
    TScopeID,
    TTypeEntry,
    TTypeMapBase,
} from "./types";
import { DIScope } from "./DIScope";
import { Registrar } from "./internal/Registrar";
import { InstancesStorage } from "./internal/InstancesStorage";
import { InstanceActivator } from "./internal/InstanceActivator";
import { isFactoryTypeEntry, isInstanceTypeEntry } from "./utils";

const Errors = {
    TypeBindingNotFound: (type: string) => `Type binding ${type} not found.`,
} as const;

export class DIContainer<TypeMap extends TTypeMapBase>
    implements IInstanceResolver<TypeMap>
{
    private readonly _instances: InstancesStorage<TypeMap>;
    private readonly _registrar: Registrar<TypeMap>;
    private readonly _activator: InstanceActivator<TypeMap>;

    public constructor(
        registrar: Registrar<TypeMap>,
        activator: InstanceActivator<TypeMap>,
    ) {
        this._registrar = registrar;
        this._activator = activator;
        this._instances = this.activateSingletons(registrar);
    }

    public scope(id: TScopeID): DIScope {
        return new DIScope(id);
    }

    public get<Key extends keyof TypeMap>(
        key: Key,
        name?: string | undefined,
    ): TypeMap[Key] {
        const entry = this._registrar.findTypeEntry(key, name);

        if (!entry) throw Error(Errors.TypeBindingNotFound(key.toString()));

        return this.getInstanceByEntry(entry);
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

    public getProvider<Key extends keyof TypeMap>(
        type: Key,
    ): TProvider<TypeMap[Key]> {
        return this.get.bind(this, type) as TProvider<TypeMap[Key]>;
    }

    // region: Private methods

    /** @internal */
    private activateSingletons(
        registrar: Registrar<TypeMap>,
    ): InstancesStorage<TypeMap> {
        const storage = new InstancesStorage<TypeMap>();
        registrar.forEach((entry) => {
            if (isFactoryTypeEntry(entry) && entry.lifecycle === "singleton") {
                const instance = this._activator.createInstance(entry, this);
                storage.storeInstance(entry, instance);
            }
        });
        return storage;
    }

    /** @internal */
    private getInstanceByEntry<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
    ): TypeMap[Key] {
        if (isInstanceTypeEntry(entry)) return entry.instance;

        if (entry.lifecycle !== "transient") {
            const singleton = this._instances.getInstance(entry);
            if (singleton) return singleton as TypeMap[Key];
        }

        const instance = this._activator.createInstance(entry, this);

        if (entry.lifecycle === "lazy")
            this._instances.storeInstance(entry, instance);
        return instance;
    }

    // endregion: Private methods
}
