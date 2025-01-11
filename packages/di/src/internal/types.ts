import { TEntryId, TTypeEntry, TTypeMapBase } from "../types";

export type TTypeEntriesMap<TypeMap extends TTypeMapBase> = Map<
    TEntryId,
    Set<TTypeEntry<TypeMap, keyof TypeMap>>
>;
