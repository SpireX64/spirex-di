import type { TEntryId, TProvider, TTypeEntry, TTypeMapBase } from "../types";

export type TPhantomState<
    TypeMap extends TTypeMapBase,
    T extends keyof TypeMap,
> = {
    entry: TTypeEntry<TypeMap, T>;
    provider: TProvider<TypeMap[T]>;
    ref: TypeMap[T] | null;
};

export type TTTypeEntriesMapItem<TypeMap extends TTypeMapBase> =
    | Set<TTypeEntry<TypeMap, keyof TypeMap>>
    | TTypeEntry<TypeMap, keyof TypeMap>;

export type TTypeEntriesMap<TypeMap extends TTypeMapBase> = Map<
    TEntryId,
    TTTypeEntriesMapItem<TypeMap>
>;
