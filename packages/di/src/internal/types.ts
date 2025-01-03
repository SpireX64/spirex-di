import type { TTypeEntry, TTypeMapBase } from "../types";

export type TTypeEntriesMap<TypeMap extends TTypeMapBase> = Map<
    keyof TypeMap,
    TTypeEntry<TypeMap, keyof TypeMap>
>;
