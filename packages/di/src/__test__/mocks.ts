import type {
    IInstanceResolver,
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
): TTypeInstanceEntry<TypeMap, typeof key> {
    return {
        type: key,
        instance,
    };
}

export function makeFactoryEntryMock<TypeMap extends TTypeMapBase>(
    key: keyof TypeMap,
    factory: TTypeFactory<TypeMap, typeof key>,
    lifecycle?: TLifecycle,
): TTypeFactoryEntry<TypeMap, typeof key> {
    return {
        type: key,
        lifecycle: lifecycle ?? "singleton",
        factory,
    };
}

export function makeEntriesMap<TypeMap extends TTypeMapBase>(
    ...entries: TTypeEntry<TypeMap, keyof TypeMap>[]
): TTypeEntriesMap<TypeMap> {
    return new Map(entries.map((entry) => [entry.type, entry]));
}

export function createFakeResolver<TypeMap extends TTypeMapBase>(
    instancesMap?: Partial<TypeMap>,
): IInstanceResolver<TypeMap> {
    return {
        get<K extends keyof TypeMap>(type: K) {
            return instancesMap?.[type] as TypeMap[K];
        },
    };
}
