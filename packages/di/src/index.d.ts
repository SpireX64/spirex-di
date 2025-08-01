/**
 * A map of string keys to types used in the DI container.
 * Each key represents a type token, and its value is the type of the instance bound to that token.
 */
type TTypeMapBase = object;

/**
 * Defines the lifecycle for a binding in the container.
 *
 * - `"singleton"` — The instance is created eagerly with the container and exists as a single shared instance.
 * - `"lazy"` — The instance is created on first resolution and cached; only one instance exists.
 * - `"scope"` — The instance is unique per scope and is disposed with it.
 * - `"transient"` — A new instance is created on each resolution.
 */
type TLifecycle = "singleton" | "lazy" | "scope" | "transient";

/**
 * A factory function that produces an instance of a type from the container.
 *
 * @typeParam TypeMap - A mapping of tokens to their corresponding instance types.
 * @typeParam T - A specific token key from the TypeMap.
 *
 * @param resolver - A helper object used to resolve other dependencies from the container.
 *                   It provides access to the container's entries, allowing factories to
 *                   request other services when constructing a new instance.
 *
 * @returns An instance of the type associated with the token `T`.
 */
type TTypeFactory<TypeMap extends TTypeMapBase, T extends keyof TypeMap> = (
    resolver: ITypesResolver<TypeMap>,
) => TypeMap[T];

/**
 * Injector function type.
 * Receives a resolver which can resolve dependencies from the container,
 * and returns any value representing dependencies to be passed into the factory.
 *
 * This value can be an object, array, primitive, or any custom structure,
 * depending on what the factory expects.
 *
 * @template TypeMap - Map of all types in the container.
 * @template R - The type of the dependencies returned by the injector.
 * @param resolver - Resolver instance to retrieve dependencies.
 * @returns {R} - Dependencies of any type passed to the factory.
 */
type TTypeInjector<TypeMap extends TTypeMapBase, R> = (
    resolver: ITypesResolver<TypeMap>,
) => R;

/**
 * Safe factory function type.
 * Receives a dependencies object and returns a constructed instance.
 *
 * @template Deps - Type of the dependencies object.
 * @template R - The return type, the created instance.
 * @param {Deps} deps - The dependencies object injected by the injector.
 * @returns {R} - The created instance.
 */
type TTypeSafeFactory<Deps, R> = (deps: Deps) => R;

/**
 * Strategy to apply when a binding for a given type already exists.
 *
 * - `"throw"`: Throws an error.
 * - `"keep"`: Keeps the existing binding and skips the new one.
 * - `"replace"`: Replaces the existing binding with the new one.
 * - `"append"`: Adds the new binding alongside the existing one(s)
 */
type TTypesBindingResolveStrategy = "throw" | "keep" | "replace" | "append";

/** Configuration options for creating a new scope. */
type TScopeOptions = {
    /** 
     * Prevents this scope from creating any child scopes.
     * Attempting to create a child scope will throw an error.
     */
    sealed?: boolean;

    /**
     * Detaches this scope from its parent chain.
     * Instances will not be shared or inherited from parent scopes.
     */
    isolated?: boolean;
};

/**
 * Options to control how the binding should behave during registration.
 */
type TBindingOptions = {
    /** Defines the strategy to apply when a binding conflict occurs */
    ifConflict?: TTypesBindingResolveStrategy;

    /** Optional name qualifier */
    name?: string | undefined;
};

/** Options for configuring a factory-based binding. */
type TFactoryBindingOptions = TBindingOptions & {
    /** Determines how and when the instance is created and cached. */
    lifecycle?: TLifecycle;
};

/** Options for configuring an alias binding. */
type TAliasBindingOptions = TBindingOptions & {
    /**
     * Name qualifier of the origin binding that this alias points to.
     * Useful when aliasing named bindings.
     */
    originName?: string | undefined;
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

    /** Lifecycle of the binding */
    readonly lifecycle: keyof TLifecycle;
};

/**
 * Entry type for a safe factory binding
 *
 * @template TypeMap - Map of all types in the container.
 * @template T - Key of the bound type.
 * @template Deps - Type of the dependencies object injected into the factory.
 */
type TSafeFactoryEntry<
    TypeMap extends TTypeMapBase,
    T extends keyof TypeMap,
    Deps,
> = TTypeEntryBase<TypeMap, T> & {
    /** Injector function that defines dependencies. */
    readonly injector: TTypeInjector<TypeMap, Deps>;

    /** Factory function creating the instance from dependencies. */
    readonly factory: TTypeSafeFactory<Deps, TypeMap[T]>;

    /** Lifecycle of the binding */
    readonly lifecycle: keyof TLifecycle;

    /** Always `undefined` to indicate it's not an instance entry. */
    readonly instance: undefined;
};

/** A type entry, either an instance entry or a factory entry */
type TTypeEntry<TypeMap extends TTypeMapBase, T extends keyof TypeMap> =
    | TInstanceTypeEntry<TypeMap, T>
    | TFactoryTypeEntry<TypeMap, T>
    | TSafeFactoryEntry<TypeMap, T, {}>;

/**
 * A generic type map used for middleware to operate independently of specific container type mappings.
 *
 * This allows writing reusable and shareable middleware components
 * that can be applied across different container configurations
 */
type AnyTypeMap = Record<string, any>;

/**
 * A middleware function that called when the middleware
 * is added into the container builder.
 * 
 * This is executed immediately and only once per `.use()` call.
 * 
 * @param builder The container builder where the middleware is being registered.
 */
type TContainerBuilderMiddlewareOnUse = (
    builder: IContainerBuilder<AnyTypeMap>,
) => void

/**
 * A middleware function that intercepts type binding during container building.
 * Can be used to transform or validate the entry.
 *
 * @param entry - The current type entry that is about to be added to the container.
 * @param originEntry - The original type entry as it was initially defined, before any middleware modifications.
 * @returns The final type entry to be registered in the container.
 */
type TContainerBuilderMiddlewareOnBind = (
    entry: TTypeEntry<AnyTypeMap, keyof AnyTypeMap>,
    originEntry: TTypeEntry<AnyTypeMap, keyof AnyTypeMap>,
) => TTypeEntry<AnyTypeMap, keyof AnyTypeMap>;

/**
 * A middleware function that triggered whenever a instance is requested from the container.
 * 
 * This allows intercepting or rejecting requests before instance resolution begins.
 * Can be useful for access control, logging, instrumentation, or short-circuiting logic.
 * 
 * @param entry - The resolved binding entry for the requested type.
 * @param scope - The current scope from which the request originated.
 * @param type - The originally requested type key (may differ from `entry.key` if aliases are used).
 * @param name - Optional name if the request was made using a named binding.
 * 
 * @throws { Error } Can throw error to reject request. 
 * 
 * @returns If the hook throws, the request will be aborted.
 */
type TContainerMiddlewareOnRequest = (
    entry: TTypeEntry<AnyTypeMap, keyof AnyTypeMap>,
    scope: IContainerScope<AnyTypeMap>,
    type: keyof AnyTypeMap,
    name: string | undefined,
) => void | never;

/**
 * A middleware function that triggered after an instance is created,
 * but before it is returned to the requester.
 * 
 * @note
 * - This hook is **not** called if the instance is reused.
 * - Returning `null` or `undefined` is discouraged — always return a valid object
 * 
 * @param entry    - The original type entry (binding) used to create the instance.
 * @param instance - The freshly created instance before returning to the requester.
 *                   It is guaranteed to be a non-null object/value.
 * @param scope    - The current container scope in which the instance was created.
 *                   Can be used to resolve other services or inspect the context.
 *
 * @returns The instance to be returned. Can be the original or a modified one.
 */
type TContainerMiddlewareOnActivated = (
    entry: TTypeEntry<AnyTypeMap, keyof AnyTypeMap>,
    instance: {}, // Any value, but not null/undefined
    scope: IContainerScope<AnyTypeMap>,
) => {};

type TContainerMiddlewareOnResolve = (
    entry: TTypeEntry<AnyTypeMap, keyof AnyTypeMap>,
    instance: {}, // Any value, but not null/undefined
) => {};

/**
 * Container middleware.
 *
 * Middleware allows intercepting and extending DI behavior.
 */
interface IContainerMiddleware {
    /** Optional name used to identify the middleware in code or error messages. */
    name?: string;

    onUse?: TContainerBuilderMiddlewareOnUse;

    /** Triggered when a new type entry is being bound */
    onBind?: TContainerBuilderMiddlewareOnBind;

    /** Triggered whenever a instance is requested from the container. */
    onRequest?: TContainerMiddlewareOnRequest;

    onActivated?: TContainerMiddlewareOnActivated;

    onResolve?: TContainerMiddlewareOnResolve;
}

/**
 * Provides type binding methods.
 *
 * @template TypeMap - The type map that defines all valid type keys and their corresponding types.
 */
interface ITypeEntryBinder<TypeMap extends TTypeMapBase> {
    /**
     * Binds a concrete instance to a type.
     *
     * @typeParam T - A key of the type map representing the type token to bind.
     * @param type - The type to bind.
     * @param instance - The instance to associate with the type.
     * @param options Optional params that control how the binding behaves.
     *
     * @throws {Error} If a binding already exists and the conflict strategy is set to `"throw"`
     *
     * @returns The current binder instance for chaining.
     */
    bindInstance<T extends keyof TypeMap>(
        type: T,
        instance: TypeMap[T],
        options?: TBindingOptions,
    ): this;

    /**
     * Binds a factory function to a type.
     * The factory will be used to create the instance when the container resolves the given type.
     *
     * @typeParam T - A key of the type map representing the type token to bind.
     * @param type - The type key to bind the factory to.
     * @param factory - A factory function that returns an instance of the type.
     * @param options Optional params that control how the binding behaves.
     *
     * @throws {Error} If a binding already exists and the conflict strategy is set to `"throw"`
     *
     * @returns The current binder instance for chaining.
     */
    bindFactory<T extends keyof TypeMap>(
        type: T,
        factory: TTypeFactory<TypeMap, T>,
        options?: TFactoryBindingOptions,
    ): this;

    /**
     * Binds a factory to a type with explicit dependency injection.
     *
     * Allows defining an injector function that describes dependencies to resolve,
     * and a factory function that creates the instance from these dependencies.
     *
     * @template T - A key of the type map representing the type token to bind.
     * @template Deps - The dependencies object type resolved by the injector.
     *
     * @param type - The type key to bind the factory to.
     * @param injector - Injector function that receives resolver and returns dependencies object.
     * @param factory - Factory function that creates instance from dependencies.
     * @param [options] - Optional params that control how the binding behaves.
     *
     * @throws {Error} If a binding already exists and the conflict strategy is set to `"throw"`
     *
     * @returns {this} The current binder instance for chaining.
     */
    bindSafeFactory<T extends keyof TypeMap, Deps>(
        type: T,
        injector: TTypeInjector<TypeMap, Deps>,
        factory: TTypeSafeFactory<Deps, TypeMap[T]>,
        options?: TFactoryBindingOptions,
    );

    /**
     * Binds an alias to an existing binding or another alias.
     *
     * @template TAlias - The type key for the alias.
     * @template TOrigin - The type key for the origin binding.
     *
     * @param type - The key for the alias type (must be declared in the container's type map).
     * @param originType - The key of the existing binding to alias (must be compatible with alias type).
     * @param options - Optional options for the alias binding.
     *
     * @throws {Error} if an alias cycle is detected
     * @throws {Error} if binding or alias with the same type and name already exists
     *
     * @returns The current binder instance for chaining.
     */
    bindAlias<TAlias extends keyof TypeMap, TOrigin extends keyof TypeMap>(
        type: TAlias,
        originType: TypeMap[TOrigin] extends TypeMap[TAlias] ? TOrigin : never,
        options?: TAliasBindingOptions,
    ): this;
}

/**
 * An interface that provides access to the container's type resolution mechanism.
 *
 * @typeParam TypeMap - A mapping of tokens to their corresponding instance types.
 */
interface ITypesResolver<TypeMap extends TTypeMapBase> {
    /**
     * Retrieves an instance associated with the given type token and optional name.
     *
     * @typeParam T - A specific token key from the TypeMap.
     * @param type - The token representing the type to resolve.
     * @param name - (Optional) The name of the specific binding to retrieve.
     *
     * @returns An instance of the requested type.
     *
     * @throws {Error} If the requested type or named binding does not exist in the container.
     * @throws {Error} If a circular dependency is detected while resolving the instance.
     */
    get<T extends keyof TypeMap>(type: T, name?: string): TypeMap[T];

    /**
     * Attempts to resolve a type from the container, but does not throw
     * if the binding is missing. Returns `undefined` instead.
     *
     * @typeParam T - A specific token key from the TypeMap.
     * @param type - The token representing the type to resolve.
     * @param name -  (Optional) The name of the specific binding to retrieve.
     * @returns An instance of the requested type, or `undefined` if not found.
     */
    maybe<T extends keyof TypeMap>(type: T, name?: string): T | undefined;

    getAll<T extends keyof TypeMap>(
        type: T,
        name?: string,
    ): ReadonlyArray<TypeMap[T]>;
}

/**
 * A delegate function that receives a type binding interface
 * to register type bindings.
 *
 * @template TypeMap - The type map that defines all valid type keys and their corresponding types.
 * @param binder - An interface providing methods for binding types.
 */
type TBinderDelegate<TypeMap extends TTypeMapBase> = (
    binder: ITypeEntryBinder<TypeMap>,
) => void;

interface IContainerScope<TypeMap extends TTypeMapBase>
    extends ITypesResolver<TypeMap> {
    readonly id: string;

    /**
     * Creates (or retrieves) a child scope by its unique identifier.
     *
     * If a scope with the same `id` already exists in the parent hierarchy, it will be returned.
     * Otherwise, a new scope is created and registered as a child of the current one.
     * 
     * @param id - Unique identifier for the scope.
     * @param options - Optional scope configuration.
     * 
     * @returns The newly created or existing scope instance.
     * 
     * @throws {Error} If the current scope is sealed and an attempt is made to create a new child scope.
     */
    scope(id: string, options?: TScopeOptions): IContainerScope<TypeMap>;
}

interface IContainerBuilder<TypeMap extends TTypeMapBase>
    extends ITypeEntryBinder<TypeMap> {
    /**
     * Conditionally applies bindings based on the provided boolean condition.
     * @param condition - The condition to evaluate.
     * @param delegate - A function that declares bindings when the condition is true.
     * @returns The container builder instance for chaining.
     */
    when(
        condition: boolean,
        delegate: TBinderDelegate<TypeMap>,
    ): IContainerBuilder<TypeMap>;

    /**
     * Declares that the specified type binding is required during container building.
     * This ensures that a binding for the given type (and optionally name) exists when building container.
     * If the binding is missing, an error will be thrown during the build phase.
     *
     * @param type - The type key to require a binding for.
     * @param name - Optional name of the binding if using named bindings.
     *
     * @throws {Error} If the required binding is not present when building container.
     *
     * @returns The container builder instance for chaining.
     */
    requireType(type: keyof TypeMap, name?: string): IContainerBuilder<TypeMap>;

    /**
     * Checks whether the given middleware is already registered in the container builder.
     *
     * @param middleware - The middleware instance to check.
     * @returns `true` if the middleware is already registered; otherwise, `false`.
     */
    hasMiddleware(middleware: IContainerMiddleware): boolean;

    /**
     * Checks whether a binding exists for the given type and optional name.
     *
     * @param type - The type key to check.
     * @param name - Optional name qualifier.
     * @returns `true` if the type binding is already registered; otherwise, `false`.
     */
    has(type: string, name?: string): boolean;

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
     * Returns all type binding entries matching the specified type and optional name.
     *
     * This method retrieves both single and multi-bindings associated with the given type and name.
     * If no matching entries are found, an empty array is returned.
     *
     * @param type - The type for which to retrieve binding entries.
     * @param name - Optional name qualifier of the binding, if named bindings are used.
     * @returns An array of all matching binding entries. Returns an empty array if none are found.
     */
    findAllEntries(
        type: keyof TypeMap,
        name?: string,
    ): Readonly<TTypeEntry<TypeMap, typeof type>>[];

    /**
     * Returns the origin type reference that an alias points to, if any.
     * @param type - The alias type key.
     * @param name - Optional alias name (for named bindings).
     *
     * @returns The origin type reference(s), or undefined if no alias is registered.
     */
    getAliasOrigin(
        type: keyof TypeMap,
        name?: string,
    ): string | readonly string[] | undefined;

    /**
     * Registers a middleware instance.
     * Middleware allows intercepting and extending DI behavior.
     *
     * @param middleware - The middleware instance to register.
     * @returns The container builder instance for chaining.
     */
    use(middleware: IContainerMiddleware): IContainerBuilder<TypeMap>;

    /**
     * Finalizes the bindings and builds a container instance.
     *
     * @returns The built DI container.
     */
    build(): IContainerScope<TypeMap>;
}

/** Global options for the container builder. */
type TContainerBuilderOptions = {
    /** Default lifecycle for bindings (if not specified in individual bindings). */
    lifecycle?: TLifecycle;

    /** Default conflict resolution strategy when a binding for the same type already exists. */
    ifConflict?: TTypesBindingResolveStrategy;
};

/**
 * Creates a new dependency injection container builder.
 *
 * @typeParam TypeMap - A mapping of tokens to their corresponding instance types.
 * @param builderOptions - Optional builder settings.
 * @returns A new container builder used to configure and build the DI container.
 */
export declare function createContainerBuilder<TypeMap extends TTypeMapBase>(
    builderOptions?: TContainerBuilderOptions,
): IContainerBuilder<TypeMap>;
