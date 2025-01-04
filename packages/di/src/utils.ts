import type {
    TLifecycle,
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

const lifecycleLevelMap: Record<TLifecycle, number> = {
    transient: 0,
    lazy: 1,
    singleton: 2,
};

export function compareLifecycles(lhv: TLifecycle, rhv: TLifecycle): number {
    return lifecycleLevelMap[lhv] - lifecycleLevelMap[rhv];
}
