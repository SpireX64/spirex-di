import type {
    TTypeEntry,
    TTypeFactoryEntry,
    TTypeInstanceEntry,
} from "./types";

export function isInstanceTypeEntry<K, T>(
    entry: TTypeEntry<K, T> | null | undefined,
): entry is TTypeInstanceEntry<K, T> {
    return !!entry && "instance" in entry;
}

export function isFactoryTypeEntry<K, T>(
    entry: TTypeEntry<K, T> | null | undefined,
): entry is TTypeFactoryEntry<K, T> {
    return !!entry && "factory" in entry;
}
