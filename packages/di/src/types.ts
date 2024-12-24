export type TTypeMapBase = Record<string, unknown>;

export type TTypeFactory<T> = () => T;

export type TTypeEntryBase<K> = {
    type: K;
};

export type TTypesConflictResolve = "throw" | "keep";

export type TBindingOptions = {
    ifConflict?: TTypesConflictResolve;
};

export type TTypeInstanceEntry<K, T> = TTypeEntryBase<K> & {
    instance: T;
    factory?: never;
};

export type TTypeFactoryEntry<K, T> = TTypeEntryBase<K> & {
    factory: TTypeFactory<T>;
    instance?: never;
};

export type TTypeEntry<K, T> =
    | TTypeInstanceEntry<K, T>
    | TTypeFactoryEntry<K, T>;
