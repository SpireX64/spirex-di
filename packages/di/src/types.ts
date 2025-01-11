export type TTypeMapBase = Record<string, unknown>;

export type TProvider<T> = () => T;

export type TTypeFactory<
    TypeMap extends TTypeMapBase,
    Key extends keyof TypeMap,
> = (resolver: IInstanceResolver<TypeMap>) => TypeMap[Key];

export type TEntryId = string;

export type TTypeEntryBase<K> = {
    $id: TEntryId;
    type: K;
    name?: string | undefined;
};

export type TTypesConflictResolve = "throw" | "keep" | "replace" | "append";

export type TLifecycle = "singleton" | "lazy" | "transient";

export type TBindingOptions = Partial<{
    ifConflict: TTypesConflictResolve;
    name: string;
}>;

export type TFactoryBindingOptions = TBindingOptions &
    Partial<{
        lifecycle: TLifecycle;
    }>;

export type TTypeInstanceEntry<
    TypeMap extends TTypeMapBase,
    Key extends keyof TypeMap,
> = TTypeEntryBase<Key> & {
    instance: TypeMap[Key];
    factory?: never;
};

export type TTypeFactoryEntry<
    TypeMap extends TTypeMapBase,
    Key extends keyof TypeMap,
> = TTypeEntryBase<Key> & {
    factory: TTypeFactory<TypeMap, Key>;
    lifecycle: TLifecycle;
    instance?: never;
};

export type TTypeEntry<
    TypeMap extends TTypeMapBase,
    Key extends keyof TypeMap,
> = TTypeInstanceEntry<TypeMap, Key> | TTypeFactoryEntry<TypeMap, Key>;

export interface IInstanceResolver<TypeMap extends TTypeMapBase> {
    get<Key extends keyof TypeMap>(type: Key): TypeMap[Key];
    getProvider<Key extends keyof TypeMap>(type: Key): TProvider<TypeMap[Key]>;
}
