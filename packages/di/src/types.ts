export type TTypeMapBase = Record<string, unknown>;

export type TTypeFactory<T> = () => T;

export type TTypeEntryBase<K> = {
    type: K;
};

export type TTypesConflictResolve = "throw" | "keep" | "replace";

export type TLifecycle = "singleton" | "lazy" | "transient";

export type TBindingOptions = Partial<{
    ifConflict?: TTypesConflictResolve;
}>;

export type TFactoryBindingOptions = TBindingOptions &
    Partial<{
        lifecycle: TLifecycle;
    }>;

export type TTypeInstanceEntry<K, T> = TTypeEntryBase<K> & {
    instance: T;
    factory?: never;
};

export type TTypeFactoryEntry<K, T> = TTypeEntryBase<K> & {
    factory: TTypeFactory<T>;
    lifecycle: TLifecycle;
    instance?: never;
};

export type TTypeEntry<K, T> =
    | TTypeInstanceEntry<K, T>
    | TTypeFactoryEntry<K, T>;
