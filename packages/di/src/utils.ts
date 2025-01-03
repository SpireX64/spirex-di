import type {
    TTypeEntry,
    TTypeFactoryEntry,
    TTypeInstanceEntry,
    TTypeMapBase,
} from "./types";

export function isInstanceTypeEntry<
    TypeMap extends TTypeMapBase,
    Key extends keyof TypeMap,
>(
    entry: TTypeEntry<TypeMap, Key> | null | undefined,
): entry is TTypeInstanceEntry<TypeMap, Key> {
    return !!entry && "instance" in entry;
}

export function isFactoryTypeEntry<
    TypeMap extends TTypeMapBase,
    Key extends keyof TypeMap,
>(
    entry: TTypeEntry<TypeMap, Key> | null | undefined,
): entry is TTypeFactoryEntry<TypeMap, Key> {
    return !!entry && "factory" in entry;
}
