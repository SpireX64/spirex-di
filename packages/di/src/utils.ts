import type {
    IDisposable,
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

const lifecycleLevelMap: Readonly<Record<TLifecycle, number>> = Object.freeze({
    transient: 0,
    scope: 1,
    lazy: 2,
    singleton: 3,
});

export function compareLifecycles(lhv: TLifecycle, rhv: TLifecycle): number {
    return lifecycleLevelMap[lhv] - lifecycleLevelMap[rhv];
}

export function checkIsDisposable(obj: unknown): obj is IDisposable {
    return (
        !!obj &&
        typeof obj === "object" &&
        "dispose" in obj &&
        typeof obj.dispose === "function"
    );
}
