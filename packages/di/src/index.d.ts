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

type TTypeEntryBase<TypeMap extends TTypeMapBase, T extends keyof TypeMap> = {
    type: T;
};

type TInstanceTypeEntry<
    TypeMap extends TTypeMapBase,
    T extends keyof TypeMap,
> = TTypeEntryBase<TypeMap, T> & {
    instance: TypeMap[T];
    factory: undefined;
};

type TFactoryTypeEntry<
    TypeMap extends TTypeMapBase,
    T extends keyof TypeMap,
> = TTypeEntryBase<TypeMap, T> & {
    factory: TTypeFactory<TypeMap, T>;
    instance: undefined;
};

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
    ): IContainerBuilder<TypeMap>;

    /**
     * Binds a factory function to a type.
     * The factory will be used to create the instance when the container resolves the given type.
     *
     * @typeParam T - A key of the type map representing the type token to bind.
     * @param type The type key to bind the factory to.
     * @param factory A factory function that returns an instance of the type.
     * @returns The current builder instance for chaining.
     */
    bindFactory<T extends keyof TypeMap>(
        type: T,
        factory: TTypeFactory<TypeMap, T>,
    ): IContainerBuilder<TypeMap>;

    /**
     * Checks whether a binding exists for the given type and optional name.
     *
     * @param type The type key to check.
     * @param name Optional name qualifier.
     * @returns The current builder instance for chaining.
     */
    hasEntry(type: string, name?: string): IContainerBuilder<TypeMap>;

    findEntry(
        type: keyof TypeMap,
    ): TTypeEntry<TypeMap, typeof type> | undefined;

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
