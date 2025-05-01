import type {
    IDisposable,
    TLifecycle,
    TScopeID,
    TTypeEntry,
    TTypeFactoryEntry,
    TTypeInstanceEntry,
    TTypeMapBase,
} from "./types";
import { PHANTOM_SYMBOL } from "./internal/phantom";

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

export function checkIsPhantomInstance(obj: object): boolean {
    return PHANTOM_SYMBOL in obj;
}

export function unwrapPhantom<T>(phObj: T): T {
    if (!phObj || typeof phObj !== "object" || !checkIsPhantomInstance(phObj))
        return phObj;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return phObj[PHANTOM_SYMBOL] as T;
}

export function scopeIdToString(
    scopeId: TScopeID | readonly TScopeID[],
): string {
    if (Array.isArray(scopeId))
        return scopeId
            .map((it: TScopeID) => scopeIdToString(it))
            .reverse()
            .join("/");
    else if (typeof scopeId == "string") return scopeId;
    else return (scopeId as symbol).description ?? String(scopeId);
}
