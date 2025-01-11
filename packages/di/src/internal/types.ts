import { TEntryId, TTypeEntry, TTypeMapBase } from "../types";

export type TTTypeEntriesMapItem<TypeMap extends TTypeMapBase> =
    | Set<TTypeEntry<TypeMap, keyof TypeMap>>
    | TTypeEntry<TypeMap, keyof TypeMap>;

export type TTypeEntriesMap<TypeMap extends TTypeMapBase> = Map<
    TEntryId,
    TTTypeEntriesMapItem<TypeMap>
>;
