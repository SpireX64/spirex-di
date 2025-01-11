import type { TTypeEntriesMap } from "./types";
import type { TTypeEntry, TTypeMapBase } from "../types";
import { checkIsTypeEntryMapItem, makeEntryId } from "./utils";

export class Registrar<TypeMap extends TTypeMapBase> {
    private readonly _entriesMap: TTypeEntriesMap<TypeMap>;

    public constructor(entries: TTypeEntriesMap<TypeMap>) {
        this._entriesMap = entries;
    }

    public hasType<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): boolean {
        return this._entriesMap.has(makeEntryId(type, name));
    }

    public findTypeEntry<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): TTypeEntry<TypeMap, Key> | null {
        const item = this._entriesMap.get(makeEntryId(type, name)) || null;
        if (!item || checkIsTypeEntryMapItem(item))
            return item as TTypeEntry<TypeMap, Key>;
        return item.values().next().value as TTypeEntry<TypeMap, Key>;
    }

    public forEach(
        fn: (entry: TTypeEntry<TypeMap, keyof TypeMap>) => void,
    ): void {
        this._entriesMap.forEach((item) => {
            if (checkIsTypeEntryMapItem(item)) fn(item);
            else item.forEach(fn);
        });
    }
}
