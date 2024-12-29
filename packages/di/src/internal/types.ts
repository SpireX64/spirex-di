import type { TTypeEntry, TTypeMapBase } from "../types";

export type TTypeEntriesMap<TypeMap extends TTypeMapBase> = Map<
    keyof TypeMap,
    TTypeEntry<keyof TypeMap, TypeMap[keyof TypeMap]>
>;
