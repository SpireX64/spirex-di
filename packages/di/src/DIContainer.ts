import type { TTypeMapBase } from "./types";
import type { TTypeEntriesMap } from "./internal/types";
import { isFactoryTypeEntry, isInstanceTypeEntry } from "./utils";

const Errors = {
    TypeBindingNotFound: (type: string) => `Type binding ${type} not found.`,
} as const;

export class DIContainer<TypeMap extends TTypeMapBase> {
    private readonly _entriesMap: Readonly<TTypeEntriesMap<TypeMap>>;
    private readonly _singletons = new Map<
        keyof TypeMap,
        TypeMap[keyof TypeMap]
    >();

    public constructor(private entriesMap: Readonly<TTypeEntriesMap<TypeMap>>) {
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
            const cachedInstance = this._singletons.get(key);
            if (cachedInstance) return cachedInstance as TypeMap[Key];
        }

        const instance = entry.factory() as TypeMap[Key];

        if (entry.lifecycle === "lazy") this._singletons.set(key, instance);
        return instance;
    }

    // region: Private methods

    /** @internal */
    private prepareSingletons(): void {
        this._entriesMap.forEach((entry) => {
            if (isFactoryTypeEntry(entry) && entry.lifecycle === "singleton") {
                this._singletons.set(entry.type, entry.factory());
            }
        });
    }

    // endregion: Private methods
}
