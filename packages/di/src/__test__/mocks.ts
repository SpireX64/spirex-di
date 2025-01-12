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
import { Registrar } from "../internal/Registrar";
import { checkIsTypeEntryMapItem, makeEntryId } from "../internal/utils";

export function makeInstanceEntryMock<TypeMap extends TTypeMapBase>(
    key: keyof TypeMap,
    instance: TypeMap[typeof key],
    name?: string,
): TTypeInstanceEntry<TypeMap, typeof key> {
    return {
        $id: makeEntryId(key, name),
        type: key,
        instance,
        name,
    };
}

export function makeFactoryEntryMock<TypeMap extends TTypeMapBase>(
    key: keyof TypeMap,
    factory: TTypeFactory<TypeMap, typeof key>,
    lifecycle?: TLifecycle,
    name?: string,
): TTypeFactoryEntry<TypeMap, typeof key> {
    return {
        $id: makeEntryId(key, name),
        type: key,
        lifecycle: lifecycle ?? "singleton",
        factory,
        name,
    };
}

export function makeEntriesMap<TypeMap extends TTypeMapBase>(
    ...entries: TTypeEntry<TypeMap, keyof TypeMap>[]
): TTypeEntriesMap<TypeMap> {
    const map: TTypeEntriesMap<TypeMap> = new Map();
    entries.forEach((it) => {
        const item = map.get(it.$id);
        if (!item) map.set(it.$id, it);
        else if (checkIsTypeEntryMapItem(item)) {
            map.set(
                it.$id,
                new Set<TTypeEntry<TypeMap, keyof TypeMap>>().add(item).add(it),
            );
        } else item.add(it);
    });
    return map;
}

export function makeRegistrar<TypeMap extends TTypeMapBase>(
    ...entries: TTypeEntry<TypeMap, keyof TypeMap>[]
): Registrar<TypeMap> {
    return new Registrar(makeEntriesMap(...entries));
}

export function createMockResolver<TypeMap extends TTypeMapBase>(
    instancesMap?: Partial<TypeMap>,
): IInstanceResolver<TypeMap> {
    return {
        get: jest.fn(
            <K extends keyof TypeMap>(type: K) =>
                instancesMap?.[type] as TypeMap[K],
        ),

        getOptional: <T extends keyof TypeMap>(type: T): TypeMap[T] | null =>
            instancesMap?.[type] as TypeMap[T],

        getProvider: jest.fn(
            <K extends keyof TypeMap>(type: K) =>
                () =>
                    instancesMap?.[type] as TypeMap[K],
        ),

        getPhantom: <T extends keyof TypeMap>(type: T): TypeMap[T] =>
            instancesMap?.[type] as TypeMap[T],

        getAll: <Key extends keyof TypeMap>(
            type: Key,
        ): readonly TypeMap[Key][] =>
            Array.of(instancesMap?.[type] as TypeMap[Key]),
    };
}
