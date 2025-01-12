export type TTypeMapBase = Record<string, unknown>;

export type TProvider<T> = () => T;

export type TTypeFactory<
    TypeMap extends TTypeMapBase,
    Key extends keyof TypeMap,
> = (resolver: IInstanceResolver<TypeMap>) => TypeMap[Key];

export type TEntryId = string;
export type TScopeID = symbol | string;

export type TTypeEntryBase<K> = {
    $id: TEntryId;
    type: K;
    name?: string | undefined;
};

export type TTypesConflictResolve = "throw" | "keep" | "replace" | "append";

export type TLifecycle = "singleton" | "lazy" | "scope" | "transient";

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

export interface IDisposable {
    dispose(): void;
}

export interface IInstanceResolver<TypeMap extends TTypeMapBase> {
    get<T extends keyof TypeMap>(
        type: T,
        name?: string | undefined,
    ): TypeMap[T];

    getPhantom<T extends keyof TypeMap>(
        type: T,
        name?: string | undefined,
    ): TypeMap[T];

    getProvider<T extends keyof TypeMap>(
        type: T,
        name?: string | undefined,
    ): TProvider<TypeMap[T]>;

    getAll<T extends keyof TypeMap>(
        type: T,
        name?: string | undefined,
    ): readonly TypeMap[T][];
}

export interface IContainerBuilderExplorer<TypeMap extends TTypeMapBase> {
    hasEntry<T extends keyof TypeMap>(
        type: T,
        name?: string | undefined,
    ): boolean;

    findSomeTypeEntry<T extends keyof TypeMap>(
        type: T,
        name?: string | undefined,
    ): TTypeEntry<TypeMap, T> | null;

    findAllTypeEntries<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): readonly TTypeEntry<TypeMap, Key>[];
}

export interface IContainerBuilderBinder<TypeMap extends TTypeMapBase> {
    bindInstance<T extends keyof TypeMap>(
        type: T,
        instance: TypeMap[T],
        options?: TBindingOptions,
    ): this;

    bindFactory<K extends keyof TypeMap>(
        type: K,
        factory: TTypeFactory<TypeMap, K>,
        options?: TFactoryBindingOptions,
    ): this;
}
