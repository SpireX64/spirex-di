import type { IInstanceResolver, TTypeMapBase } from "./types";
import type { TTypeEntriesMap } from "./internal/types";
import { InstancesStorage } from "./internal/InstancesStorage";
import { isFactoryTypeEntry, isInstanceTypeEntry } from "./utils";

const Errors = {
    TypeBindingNotFound: (type: string) => `Type binding ${type} not found.`,
} as const;

export class DIContainer<TypeMap extends TTypeMapBase>
    implements IInstanceResolver<TypeMap>
{
    private readonly _instances = new InstancesStorage<TypeMap>();

    private readonly _entriesMap: Readonly<TTypeEntriesMap<TypeMap>>;

    public constructor(entriesMap: Readonly<TTypeEntriesMap<TypeMap>>) {
        this._entriesMap = entriesMap;
        this.prepareSingletons();
    }

    public get<Key extends keyof TypeMap>(key: Key): TypeMap[Key] {
        const entry = this._entriesMap.get(key);

        if (!entry) throw Error(Errors.TypeBindingNotFound(key.toString()));

        if (isInstanceTypeEntry(entry)) {
            return entry.instance as TypeMap[Key];
        }

        if (entry.lifecycle === "singleton" || entry.lifecycle === "lazy") {
            const singleton = this._instances.getInstance(key);
            if (singleton) return singleton;
        }

        const instance = entry.factory(this) as TypeMap[Key];

        if (entry.lifecycle === "lazy")
            this._instances.storeInstance(key, instance);
        return instance;
    }

    // region: Private methods

    /** @internal */
    private prepareSingletons(): void {
        this._entriesMap.forEach((entry) => {
            if (isFactoryTypeEntry(entry) && entry.lifecycle === "singleton") {
                this._instances.storeInstance(entry.type, entry.factory(this));
            }
        });
    }

    // endregion: Private methods
}
