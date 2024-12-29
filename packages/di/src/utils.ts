import type { TTypeEntry, TTypeInstanceEntry } from "./types";

export function isInstanceTypeEntry<K, T>(
    entry: TTypeEntry<K, T>,
): entry is TTypeInstanceEntry<K, T> {
    return "instance" in entry;
}
