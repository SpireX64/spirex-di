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

export function makeInstanceEntryMock<TypeMap extends TTypeMapBase>(
    key: keyof TypeMap,
    instance: TypeMap[typeof key],
): TTypeInstanceEntry<TypeMap, typeof key> {
    return {
        $id: key.toString(),
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
        $id: key.toString(),
        type: key,
        lifecycle: lifecycle ?? "singleton",
        factory,
    };
}

export function makeEntriesMap<TypeMap extends TTypeMapBase>(
    ...entries: TTypeEntry<TypeMap, keyof TypeMap>[]
): TTypeEntriesMap<TypeMap> {
    const map: TTypeEntriesMap<TypeMap> = new Map();
    entries.forEach((it) => {
        const set = map.get(it.$id);
        if (set) set.add(it);
        else
            map.set(
                it.$id,
                new Set<TTypeEntry<TypeMap, keyof TypeMap>>().add(it),
            );
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

        getProvider: jest.fn(
            <K extends keyof TypeMap>(type: K) =>
                () =>
                    instancesMap?.[type] as TypeMap[K],
        ),
    };
}
