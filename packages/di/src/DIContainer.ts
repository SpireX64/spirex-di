import type { IInstanceResolver, TTypeMapBase } from "./types";
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

    public get<Key extends keyof TypeMap>(key: Key): TypeMap[Key] {
        const entry = this._registrar.findTypeEntry(key);

        if (!entry) throw Error(Errors.TypeBindingNotFound(key.toString()));

        if (isInstanceTypeEntry(entry)) return entry.instance;

        if (entry.lifecycle === "singleton" || entry.lifecycle === "lazy") {
            const singleton = this._instances.getInstance(key);
            if (singleton) return singleton;
        }

        const instance = this._activator.createInstance(entry, this);

        if (entry.lifecycle === "lazy")
            this._instances.storeInstance(key, instance);
        return instance;
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
                storage.storeInstance(entry.type, instance);
            }
        });
        return storage;
    }

    // endregion: Private methods
}
