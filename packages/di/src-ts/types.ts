import type {
    TAnyDIModule,
    TDynamicDIModule,
    TDynamicModuleHandle,
} from "./modules/types";

export type TTypeMapBase = object;

export type TProvider<T> = () => T;

export type TEntryId = string;
export type TScopeID = symbol | string;

export interface IScopeHandle {
    readonly id: TScopeID;
    readonly isClosed: boolean;
    close(): void;
}

export interface IScopeHandleResolver {
    getScopeHandle(): IScopeHandle;
}

export type TTypeFactory<
    TypeMap extends TTypeMapBase,
    Key extends keyof TypeMap,
> = (
    resolver: IInstanceResolver<TypeMap> &
        IScopeHandleResolver &
        IModuleHandleResolver,
    scopeNest: readonly TScopeID[],
) => TypeMap[Key];

export type TTypeEntryBase<
    TypeMap extends TTypeMapBase,
    Key extends keyof TypeMap,
> = {
    $id: TEntryId;
    type: Key;
    module?: TAnyDIModule<TypeMap>;
    name?: string | undefined;
    scope?: TScopeID | readonly TScopeID[] | undefined;
};

export type TTypesConflictResolve = "throw" | "keep" | "replace" | "append";

export type TLifecycle = "singleton" | "lazy" | "scope" | "transient";

export type TBindingOptions = Partial<{
    ifConflict: TTypesConflictResolve;
    name: string;
    scope?: TScopeID | readonly TScopeID[] | undefined;
}>;

export type TFactoryBindingOptions = TBindingOptions &
    Partial<{
        lifecycle: TLifecycle;
    }>;

export type TTypeInstanceEntry<
    TypeMap extends TTypeMapBase,
    Key extends keyof TypeMap,
> = TTypeEntryBase<TypeMap, Key> & {
    instance: TypeMap[Key];
    factory?: never;
};

export type TTypeFactoryEntry<
    TypeMap extends TTypeMapBase,
    Key extends keyof TypeMap,
> = TTypeEntryBase<TypeMap, Key> & {
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

export interface IModuleHandleResolver {
    getModuleHandle<TypeMap extends TTypeMapBase, ESModule>(
        module: TDynamicDIModule<TypeMap, ESModule>,
    ): TDynamicModuleHandle<TypeMap, ESModule>;
}

export interface IInstanceResolver<TypeMap extends TTypeMapBase> {
    get<T extends keyof TypeMap>(
        type: T,
        name?: string | undefined,
    ): TypeMap[T];

    getOptional<T extends keyof TypeMap>(
        type: T,
        name?: string | undefined,
    ): TypeMap[T] | null;

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

export interface IContainerTypesProvider<TypeMap extends TTypeMapBase> {
    getTypes(): { [Type in keyof TypeMap]: Type };
}

export interface IContainerExplorer<TypeMap extends TTypeMapBase> {
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

export type TAliasDefinition<TypeMap extends TTypeMapBase> = {
    type: keyof TypeMap;
    name?: string;
    asType: keyof TypeMap;
    asName?: string;
};

export type TContainerBuilderDefaults = {
    ifConflict?: TTypesConflictResolve;
    factoryLifecycle?: TLifecycle;
};

export interface IContainerBuilderBinder<TypeMap extends TTypeMapBase> {
    requireType<T extends keyof TypeMap>(type: T): this;

    alias(definition: TAliasDefinition<TypeMap>): this;

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

export type TContainerConditionalBuilderPredicate<
    TypeMap extends TTypeMapBase,
> = (explorer: IContainerExplorer<TypeMap>) => boolean;

export interface IContainerConditionalBuilder<TypeMap extends TTypeMapBase> {
    when(
        predicate: TContainerConditionalBuilderPredicate<TypeMap> | boolean,
        delegate: (builder: IContainerBuilderBinder<TypeMap>) => void,
    ): IContainerBuilderBinder<TypeMap>;
}
