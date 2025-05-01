import type { TEntryId, TTypeEntry, TTypeMapBase } from "../types";
import type { TTTypeEntriesMapItem } from "./types";

export const ID_SEP = "$";

export function makeEntryId(
    type: string | symbol | number,
    name?: string | undefined,
): TEntryId {
    return name ? type.toString() + ID_SEP + name : type.toString();
}

export function checkIsTypeEntryMapItem<TypeMap extends TTypeMapBase>(
    item: TTTypeEntriesMapItem<TypeMap>,
): item is TTypeEntry<TypeMap, keyof TypeMap> {
    return "$id" in item;
}
