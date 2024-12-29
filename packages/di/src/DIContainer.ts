import type { TTypeMapBase } from "./types";
import type { TTypeEntriesMap } from "./internal/types";
import { isInstanceTypeEntry } from "./utils";

const Errors = {
    TypeBindingNotFound: (type: string) => `Type binding ${type} not found.`,
} as const;

export class DIContainer<TypeMap extends TTypeMapBase> {
    private readonly _entriesMap: Readonly<TTypeEntriesMap<TypeMap>>;

    public constructor(private entriesMap: Readonly<TTypeEntriesMap<TypeMap>>) {
        this._entriesMap = entriesMap;
    }

    public get<Key extends keyof TypeMap>(key: Key): TypeMap[Key] {
        const entry = this._entriesMap.get(key);

        if (!entry) throw Error(Errors.TypeBindingNotFound(key.toString()));

        if (isInstanceTypeEntry(entry)) {
            return entry.instance as TypeMap[Key];
        }

        return entry.factory() as TypeMap[Key];
    }
}
