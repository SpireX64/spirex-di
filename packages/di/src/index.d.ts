/**
 * A map of string keys to types used in the DI container.
 * Each key represents a type token, and its value is the type of the instance bound to that token.
 */
type TTypeMapBase = object;

/**
 * A factory function that produces an instance of a type from the container.
 *
 * @typeParam TypeMap - A mapping of tokens to their corresponding instance types.
 * @typeParam T - A specific token key from the TypeMap.
 *
 * @returns An instance of the type associated with the token `T`.
 */
type TTypeFactory<
    TypeMap extends TTypeMapBase,
    T extends keyof TypeMap,
> = () => TypeMap[T];

type TTypesBindingResolveStrategy = "throw" | "keep";

type TBindingOptions = {
    ifConflict?: TTypesBindingResolveStrategy;
};

/**
 * Base structure for a type entry in the container registry.
 *
 * @typeParam TypeMap - The mapping of type tokens to their corresponding instance types.
 * @typeParam T - A key from the type map representing the registered type.
 */
type TTypeEntryBase<TypeMap extends TTypeMapBase, T extends keyof TypeMap> = {
    /** The type token associated with the entry. */
    readonly type: T;
};

/**
 * Represents a type entry that holds a concrete instance.
 *
 * @typeParam TypeMap - The mapping of type tokens to their corresponding instance types.
 * @typeParam T - A key from the type map representing the registered type.
 */
type TInstanceTypeEntry<
    TypeMap extends TTypeMapBase,
    T extends keyof TypeMap,
> = TTypeEntryBase<TypeMap, T> & {
    /** The instance bound to the type token. */
    readonly instance: TypeMap[T];

    /** Always `undefined` to indicate it's not a factory entry. */
    readonly factory: undefined;
};

/**
 * Represents a type entry that holds a type factory function.
 *
 * @typeParam TypeMap - The mapping of type tokens to their corresponding instance types.
 * @typeParam T - A key from the type map representing the registered type.
 */
type TFactoryTypeEntry<
    TypeMap extends TTypeMapBase,
    T extends keyof TypeMap,
> = TTypeEntryBase<TypeMap, T> & {
    /** The factory function that produces the instance of type. */
    readonly factory: TTypeFactory<TypeMap, T>;

    /** Always `undefined` to indicate it's not an instance entry. */
    readonly instance: undefined;
};

/** A type entry, either an instance entry or a factory entry */
type TTypeEntry<TypeMap extends TTypeMapBase, T extends keyof TypeMap> =
    | TInstanceTypeEntry<TypeMap, T>
    | TFactoryTypeEntry<TypeMap, T>;

interface IContainerBuilder<TypeMap extends TTypeMapBase> {
    /**
     * Binds a specific instance to a type.
     *
     * @typeParam T - A key of the type map representing the type token to bind.
     * @param type - The type to bind.
     * @param instance - The instance to associate with the type.
     * @returns The current builder instance for chaining.
     */
    bindInstance<T extends keyof TypeMap>(
        type: T,
        instance: TypeMap[T],
        options?: TBindingOptions,
    ): IContainerBuilder<TypeMap>;

    /**
     * Binds a factory function to a type.
     * The factory will be used to create the instance when the container resolves the given type.
     *
     * @typeParam T - A key of the type map representing the type token to bind.
     * @param type - The type key to bind the factory to.
     * @param factory - A factory function that returns an instance of the type.
     * @returns The current builder instance for chaining.
     */
    bindFactory<T extends keyof TypeMap>(
        type: T,
        factory: TTypeFactory<TypeMap, T>,
        options?: TBindingOptions,
    ): IContainerBuilder<TypeMap>;

    /**
     * Checks whether a binding exists for the given type and optional name.
     *
     * @param type - The type key to check.
     * @param name - Optional name qualifier.
     * @returns The current builder instance for chaining.
     */
    hasEntry(type: string, name?: string): IContainerBuilder<TypeMap>;

    /**
     * Finds a registered entry (instance or factory) by its type token.
     * The returned entry is frozen and can't to be mutated.
     * @param type - The type token to search for.
     *
     * @returns A type entry if found, or `undefined` if not bound.
     */
    findEntry(
        type: keyof TypeMap,
    ): Readonly<TTypeEntry<TypeMap, typeof type>> | undefined;

    /**
     * Finalizes the bindings and builds a container instance.
     *
     * @returns The built DI container.
     */
    build(): object;
}

/**
 * Creates a new dependency injection container builder.
 *
 * @typeParam TypeMap - A mapping of tokens to their corresponding instance types.
 * @returns A new container builder instance.
 */
export declare function createContainerBuilder<
    TypeMap extends TTypeMapBase,
>(): IContainerBuilder<TypeMap>;
