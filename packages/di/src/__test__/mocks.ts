import type {
    TLifecycle,
    TTypeEntry,
    TTypeFactory,
    TTypeFactoryEntry,
    TTypeInstanceEntry,
    TTypeMapBase,
} from "../types";
import type { TTypeEntriesMap } from "../internal/types";

export function makeInstanceEntryMock<TypeMap extends TTypeMapBase>(
    key: keyof TypeMap,
    instance: TypeMap[typeof key],
): TTypeInstanceEntry<typeof key, TypeMap[typeof key]> {
    return {
        type: key,
        instance,
    };
}

export function makeFactoryEntryMock<TypeMap extends TTypeMapBase>(
    key: keyof TypeMap,
    factory: TTypeFactory<TypeMap[typeof key]>,
    lifecycle?: TLifecycle,
): TTypeFactoryEntry<typeof key, TypeMap[typeof key]> {
    return {
        type: key,
        lifecycle: lifecycle ?? "singleton",
        factory,
    };
}

export function makeEntriesMap<TypeMap extends TTypeMapBase>(
    ...entries: TTypeEntry<keyof TypeMap, TypeMap[keyof TypeMap]>[]
): TTypeEntriesMap<TypeMap> {
    return new Map(entries.map((entry) => [entry.type, entry]));
}
