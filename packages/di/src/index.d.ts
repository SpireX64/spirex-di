/**
 * A map of string keys to types used in the DI container.
 * Each key represents a type token, and its value is the type of the instance bound to that token.
 */
type TTypeMapBase = object;

type TTypeFactory<
    TypeMap extends TTypeMapBase,
    T extends keyof TypeMap,
> = () => TypeMap[T];

interface IContainerBuilder<TypeMap extends TTypeMapBase> {
    /**
     * Binds a specific instance to a type.
     *
     * @typeParam T - A type token of the TypeMap
     * @param type - The type to bind.
     * @param instance - The instance to associate with the type.
     * @returns The current builder instance for chaining.
     */
    bindInstance<T extends keyof TypeMap>(
        type: T,
        instance: TypeMap[T],
    ): IContainerBuilder<TypeMap>;

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
