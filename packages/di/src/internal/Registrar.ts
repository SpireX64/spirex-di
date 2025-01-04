import type { TTypeEntriesMap } from "./types";
import type { TTypeEntry, TTypeMapBase } from "../types";

export class Registrar<TypeMap extends TTypeMapBase> {
    private readonly _entriesMap: TTypeEntriesMap<TypeMap> = new Map();

    public constructor(entries: TTypeEntriesMap<TypeMap>) {
        this._entriesMap = entries;
    }

    public hasType<Key extends keyof TypeMap>(key: Key): boolean {
        return this._entriesMap.has(key);
    }

    public findTypeEntry<Key extends keyof TypeMap>(
        type: Key,
    ): TTypeEntry<TypeMap, Key> | null {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return (this._entriesMap.get(type) as TTypeEntry<TypeMap, Key>) ?? null;
    }

    public forEach(
        fn: (entry: TTypeEntry<TypeMap, keyof TypeMap>) => void,
    ): void {
        this._entriesMap.forEach(fn);
    }
}
