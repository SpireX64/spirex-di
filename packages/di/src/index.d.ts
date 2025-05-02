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

/**
 * Strategy to apply when a binding for a given type already exists.
 *
 * - `"throw"`: Throws an error.
 * - `"keep"`: Keeps the existing binding and skips the new one.
 * - `"replace"`: Replaces the existing binding with the new one.
 */
type TTypesBindingResolveStrategy = "throw" | "keep" | "replace";

/**
 * Options to control how the binding should behave during registration.
 */
type TBindingOptions = {
    /** Defines the strategy to apply when a binding conflict occurs */
    ifConflict?: TTypesBindingResolveStrategy;

    /** Optional name qualifier */
    name?: string | undefined;
};

/**
 * Base structure for a type entry in the container registry.
 *
 * @typeParam TypeMap - The mapping of type tokens to their corresponding instance types.
 * @typeParam T - A key from the type map representing the registered type.
 */
type TTypeEntryBase<TypeMap extends TTypeMapBase, T extends keyof TypeMap> = {
    /**
     * A unique identifier for the binding entry.
     * This ID is used internally to distinguish between different bindings of the same type.
     * */
    readonly $id: string;
    /**
     * The type token (key) for the binding entry.
     * Represents the service or type that is being bound in the container.
     * */
    readonly type: T;

    /**
     * An optional name for the binding entry, used for named bindings.
     * If provided, this value helps to distinguish between different bindings of the same type.
     * If the binding does not have a name, this field will be `undefined`.
     */
    readonly name: string | undefined;
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
     * Binds a concrete instance to a type.
     *
     * @typeParam T - A key of the type map representing the type token to bind.
     * @param type - The type to bind.
     * @param instance - The instance to associate with the type.
     * @param options Optional params that control how the binding behaves.
     *
     * @throws If a binding already exists and the conflict strategy is set to `"throw"`
     *
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
     * @param options Optional params that control how the binding behaves.
     *
     * @throws If a binding already exists and the conflict strategy is set to `"throw"`
     *
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
     * @param name - Optional name qualifier.
     *
     * @returns A type entry if found, or `undefined` if not bound.
     */
    findEntry(
        type: keyof TypeMap,
        name?: string,
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
