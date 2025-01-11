import type { TTypeEntriesMap } from "./types";
import type { TTypeEntry, TTypeMapBase } from "../types";
import { makeEntryId } from "./utils";

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
        const $id = makeEntryId(type, name);
        return (
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            (this._entriesMap.get($id)?.values().next().value as TTypeEntry<
                TypeMap,
                Key
            >) ?? null
        );
    }

    public forEach(
        fn: (entry: TTypeEntry<TypeMap, keyof TypeMap>) => void,
    ): void {
        this._entriesMap.forEach((set) => {
            set.forEach(fn);
        });
    }
}
