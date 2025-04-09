import type { TTypeEntriesMap } from "./types";
import type { TEntryId, TTypeEntry, TTypeMapBase } from "../types";
import { checkIsTypeEntryMapItem, makeEntryId } from "./utils";

export class Registrar<TypeMap extends TTypeMapBase> {
    private readonly _entriesMap: TTypeEntriesMap<TypeMap>;
    private readonly _aliasesMap: ReadonlyMap<TEntryId, TEntryId> | undefined;

    public constructor(
        entries: TTypeEntriesMap<TypeMap>,
        aliasesMap?: ReadonlyMap<TEntryId, TEntryId>,
    ) {
        this._entriesMap = entries;
        this._aliasesMap = aliasesMap;
    }

    public getAliases(): ReadonlyMap<TEntryId, TEntryId> | undefined {
        return this._aliasesMap;
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
        let $id = makeEntryId(type, name);
        $id = this._aliasesMap?.get($id) ?? $id;

        const item = this._entriesMap.get($id) || null;
        if (!item || checkIsTypeEntryMapItem(item))
            return item as TTypeEntry<TypeMap, Key>;
        return item.values().next().value as TTypeEntry<TypeMap, Key>;
    }

    public findAllTypeEntries<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): readonly TTypeEntry<TypeMap, Key>[] {
        let $id = makeEntryId(type, name);
        $id = this._aliasesMap?.get($id) ?? $id;

        const item = this._entriesMap.get($id);
        if (!item) return [];
        if (checkIsTypeEntryMapItem(item))
            return Array.of(item as TTypeEntry<TypeMap, Key>);
        return Array.from(item) as TTypeEntry<TypeMap, Key>[];
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
