type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * A map of string keys to types used in the DI container.
 * Each key represents a type token, and its value is the type of the instance bound to that token.
 */
export type TTypeMapBase = object;

/**
 * A type-safe readonly mapping of container type keys to themselves.
 *
 * Acts like an enum of registered service keys:
 * each key maps to its own string literal.
 */
export type TTypesEnum<TypeMap extends TTypeMapBase> = Readonly<{
    [T in keyof TypeMap]: T;
}>;

/**
 * Defines the lifecycle for a binding in the container.
 *
 * - `"singleton"` — The instance is created eagerly with the container and exists as a single shared instance.
 * - `"lazy"` — The instance is created on first resolution and cached; only one instance exists.
 * - `"scope"` — The instance is unique per scope and is disposed with it.
 * - `"transient"` — A new instance is created on each resolution.
 */
export type TLifecycle = "singleton" | "lazy" | "scope" | "transient";

/**
 * Metadata object for a binding entry.
 * Can contain arbitrary key-value pairs to provide additional information
 * about the binding, such as platform targeting, environment, tags, etc.
 *
 * This metadata is not used by the DI itself,
 * but can be leveraged by middleware or user code.
 */
export type TTypeEntryMetaData = Record<string, unknown>;

export type TProvider<T> = () => T;

/**
 * A factory function that produces an instance of a type from the container.
 *
 * @typeParam TypeMap - A mapping of tokens to their corresponding instance types.
 * @typeParam T - A specific token key from the TypeMap.
 *
 * @param resolver - A helper object used to resolve other dependencies from the container.
 *                   It provides access to the container's entries, allowing factories to
 *                   request other services when constructing a new instance.
 * @param context  - The context representing the current scope and resolution path.
 *
 * @returns An instance of the type associated with the token `T`.
 */
export type TTypeFactory<
    TypeMap extends TTypeMapBase,
    T extends keyof TypeMap,
> = (resolver: ITypesResolver<TypeMap>, context: IScopeContext) => TypeMap[T];

/**
 * Injector function type.
 * Receives a resolver which can resolve dependencies from the container,
 * and returns any value representing dependencies to be passed into the factory.
 *
 * This value can be an object, array, primitive, or any custom structure,
 * depending on what the factory expects.
 *
 * @template TypeMap - Map of all types in the container.
 * @template R       - The type of the dependencies returned by the injector.
 * @param resolver   - Resolver instance to retrieve dependencies.
 * @param context    - The context representing the current scope and resolution path.
 *
 * @returns {R} - Dependencies of any type passed to the factory.
 */
export type TTypeInjector<TypeMap extends TTypeMapBase, R> = (
    resolver: ITypesResolver<TypeMap>,
    context: IScopeContext,
) => R;

/**
 * Safe factory function type.
 * Receives a dependencies object and returns a constructed instance.
 *
 * @template Deps     - Type of the dependencies object.
 * @template R        - The return type, the created instance.
 * @param {Deps} deps - The dependencies object injected by the injector.
 * @param context     - The context representing the current scope and resolution path.
 *
 * @returns {R} - The created instance.
 */
export type TTypeSafeFactory<Deps, R> = (
    deps: Deps,
    context: IScopeContext,
) => R;

/**
 * Strategy to apply when a binding for a given type already exists.
 *
 * - `"throw"`: Throws an error.
 * - `"keep"`: Keeps the existing binding and skips the new one.
 * - `"replace"`: Replaces the existing binding with the new one.
 * - `"append"`: Adds the new binding alongside the existing one(s)
 */
export type TTypesBindingResolveStrategy =
    | "throw"
    | "keep"
    | "replace"
    | "append";

/** Configuration options for creating a new scope. */
export type TScopeOptions = {
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
export type TBindingOptions = {
    /** Defines the strategy to apply when a binding conflict occurs */
    ifConflict?: TTypesBindingResolveStrategy;

    /** Optional name qualifier */
    name?: string | undefined;
};

/** Binding options specific to a type implementation. */
export type TTypeBindingOptions = TBindingOptions & {
    /**
     * Optional metadata for the binding.
     * Can be used to store custom data
     * such as platform targeting, environment, tags, etc.
     */
    meta?: TTypeEntryMetaData | undefined;

    /**
     * List of scope IDs where this type is allowed to be resolved or instantiated.
     * If defined, the instance will only be created or accessed within the specified scopes.
     */
    allowedScopes?: string[] | undefined;
};

/** Options for configuring a factory-based binding. */
export type TFactoryBindingOptions = TTypeBindingOptions & {
    /** Determines how and when the instance is created and cached. */
    lifecycle?: TLifecycle;
};

/** Options for configuring an alias binding. */
export type TAliasBindingOptions = TBindingOptions & {
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
export type TTypeEntryBase<
    TypeMap extends TTypeMapBase,
    T extends keyof TypeMap,
> = {
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

    /**
     * The module that owns this binding, if any.
     * For bindings not associated with any module, this value will be `undefined`.
     */
    readonly module: DIModule<TypeMap> | undefined;

    /**
     * Optional metadata associated with this entry.
     * Useful for middleware or runtime inspection.
     */
    readonly meta?: TTypeEntryMetaData;

    /**
     * List of scope IDs where this type is allowed to be resolved or instantiated.
     * If defined, the instance will only be created or accessed within the specified scopes.
     */
    readonly allowedScopes: string[] | undefined;
};

/**
 * Represents a type entry that holds a concrete instance.
 *
 * @typeParam TypeMap - The mapping of type tokens to their corresponding instance types.
 * @typeParam T - A key from the type map representing the registered type.
 */
export type TInstanceTypeEntry<
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
export type TFactoryTypeEntry<
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
export type TSafeFactoryEntry<
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
export type TTypeEntry<TypeMap extends TTypeMapBase, T extends keyof TypeMap> =
    | TInstanceTypeEntry<TypeMap, T>
    | TFactoryTypeEntry<TypeMap, T>
    | TSafeFactoryEntry<TypeMap, T, {}>;

/**
 * A generic type map used for middleware to operate independently of specific container type mappings.
 *
 * This allows writing reusable and shareable middleware components
 * that can be applied across different container configurations
 */
export type AnyTypeMap = Record<string, any>;

/**
 * Interface for disposable resources that require explicit cleanup.
 *
 * Implement this interface to allow objects to release resources such as
 * file handles, database connections, or internal state when they are no longer needed.
 */
export interface IDisposable {
    /**
     * Releases any held resources and performs necessary cleanup.
     * After calling `dispose()`, the object is considered inactive
     * and should not be used again.
     */
    dispose(): void;
}

export type TInjectIntoDelegate<TypeMap extends TTypeMapBase> = (
    resolver: ITypesResolver<TypeMap>,
) => void;

/**
 * A middleware function that called when the middleware
 * is added into the container builder.
 *
 * This is executed immediately and only once per `.use()` call.
 *
 * @param builder The container builder where the middleware is being registered.
 */
export type TContainerBuilderMiddlewareOnUse = (
    builder: IContainerBuilder<AnyTypeMap>,
) => void;

/**
 * A middleware function that intercepts type binding during container building.
 * Can be used to transform or validate the entry.
 *
 * @param entry - The current type entry that is about to be added to the container.
 * @param originEntry - The original type entry as it was initially defined, before any middleware modifications.
 * @returns The final type entry to be registered in the container.
 */
export type TContainerBuilderMiddlewareOnBind = (
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
export type TContainerMiddlewareOnRequest = (
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
export type TContainerMiddlewareOnActivated = (
    entry: TTypeEntry<AnyTypeMap, keyof AnyTypeMap>,
    instance: {},
    scope: IContainerScope<AnyTypeMap>,
) => {};

/**
 * A middleware function that triggered **after** the instance has been fully resolved.
 *
 * This is the final stage before the instance is returned to the caller.
 *
 * @param entry    - The entry that was used to resolve the instance.
 *                   Contains metadata about the factory or value binding.
 * @param instance - The resolved instance after activation.
 *                   Guaranteed to be a non-null, non-undefined value.
 * @param scope    - The scope in which the resolution took place.
 *                   Can be used to resolve other dependencies if needed.
 *
 * @returns The final instance to be returned to the user.
 */
export type TContainerMiddlewareOnResolve = (
    entry: TTypeEntry<AnyTypeMap, keyof AnyTypeMap>,
    instance: {},
    scope: IContainerScope<AnyTypeMap>,
) => {};

/**
 * A middleware hook that is called during scope lifecycle events.
 *
 * It receives the scope instance that is currently being opened or disposed.
 * Can be used to track, instrument, or extend the behavior of scope management.
 *
 * @param scope - The scope instance that is being handled.
 */
export type TContainerMiddlewareOnScope = (
    scope: IContainerScope<AnyTypeMap>,
) => void;

/**
 * Container middleware.
 *
 * Middleware allows intercepting and extending DI behavior.
 */
export interface IContainerMiddleware {
    /** Optional name used to identify the middleware in code or error messages. */
    name?: string;

    /** Triggered when this middleware is added into the container builder */
    onUse?: TContainerBuilderMiddlewareOnUse;

    /** Triggered when a new type entry is being bound */
    onBind?: TContainerBuilderMiddlewareOnBind;

    /** Triggered whenever a instance is requested from the container. */
    onRequest?: TContainerMiddlewareOnRequest;

    /** Triggered after an instance is created, but before it is returned to the requester */
    onActivated?: TContainerMiddlewareOnActivated;

    /** Triggered after the instance has been fully resolved */
    onResolve?: TContainerMiddlewareOnResolve;

    /**
     * Called when a new child scope is opened.
     *
     * This hook runs immediately after the child scope is created,
     * and before any instances are resolved within it.
     */
    onScopeOpen?: TContainerMiddlewareOnScope;

    /**
     * Called when a scope is about to be disposed.
     *
     * This hook is invoked after all child scopes have been disposed,
     * but before the current scope disposes its own instances and is marked as closed.
     * This hook is also called for the root scope when it is disposed.
     */
    onScopeDispose?: TContainerMiddlewareOnScope;
}

/**
 * Provides type binding methods.
 *
 * @template TypeMap - The type map that defines all valid type keys and their corresponding types.
 */
export interface ITypeEntryBinder<TypeMap extends TTypeMapBase> {
    /**
     * Declares that the specified type binding is required.
     * This ensures that a binding for the given type (and optionally name) exists when building container.
     * If the binding is missing, an error will be thrown during the build phase.
     *
     * @param type - The type key to require a binding for.
     * @param name - Optional name of the binding if using named bindings.
     *
     * @throws {Error} If the required binding is not present when building container.
     *
     * @returns The builder instance for chaining.
     */
    requireType(type: keyof TypeMap, name?: string): this;

    /**
     * Conditionally applies bindings based on the provided boolean condition.
     * @param condition - The condition to evaluate.
     * @param delegate - A function that declares bindings when the condition is true.
     * @returns The container builder instance for chaining.
     */
    when(condition: boolean, delegate: TBinderDelegate<TypeMap>): this;

    /**
     * Injects dependencies from the container into an external object or service.
     *
     * Use this method for **one-off or third-party instances** that cannot be
     * constructed directly via the container. Each call should target a single
     * external object or service.
     *
     * @param delegate - A function that receives the container resolver and
     *                   performs the injection into the external object.
     * @returns The container builder instance for chaining.
     */
    injectInto(delegate: TInjectIntoDelegate<TypeMap>): this;

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
        options?: TTypeBindingOptions,
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
 * A specialized type entry binder used inside module definitions.
 * @template TypeMap The type map being built by the current module.
 */
export interface IModuleTypeEntryBinder<TypeMap extends TTypeMapBase>
    extends ITypeEntryBinder<TypeMap> {
    /**
     * Includes another module into this module.
     *
     * This allows the current module to use types from the imported module internally
     * without exposing them as part of its public type map.
     *
     * @template ModuleTypeMap The type map provided by the imported module.
     * @param module The module to import.
     * @returns The same binder with an updated type map for internal resolution.
     */
    include<ModuleTypeMap extends TTypeMapBase>(
        module: DIModule<ModuleTypeMap>,
    ): IModuleTypeEntryBinder<
        TypeMap extends ModuleTypeMap
            ? TypeMap
            : Prettify<TypeMap & ModuleTypeMap>
    >;
}

/**
 * Represents union of all supported DI modules kinds.
 * @template TypeMap The map of types this module provides.
 */
export type DIModule<TypeMap extends TTypeMapBase> = {
    /** The unique identifier of the module (useful for debugging and logs) */
    readonly id: string;

    /** The kind of module */
    readonly type: string;

    /** The function that registers types into the container. */
    readonly delegate: DIModuleDelegate<TypeMap>;
};

/**
 * A delegate function that defines all bindings provided by a static module.
 *
 * @template TypeMap The map of types this module will provide.
 * @param binder The binder used to register module types
 */
export type DIModuleDelegate<TypeMap extends TTypeMapBase> = (
    binder: IModuleTypeEntryBinder<TypeMap>,
) => void;

/**
 * Static DI module.
 * @template TypeMap The map of types this module provides.
 */
export type DIStaticModule<TypeMap extends TTypeMapBase> = DIModule<TypeMap> & {
    /** The kind of module — always "static" */
    readonly type: "static";
};

/**
 * An interface that provides access to the container's type resolution mechanism.
 *
 * @typeParam TypeMap - A mapping of tokens to their corresponding instance types.
 */
export interface ITypesResolver<TypeMap extends TTypeMapBase> {
    /**
     * A readonly dictionary of all registered type keys in the container.
     *
     * This property provides a type-safe way to access service keys.
     * Each key points to itself, effectively behaving like an enum of type names.
     *
     * @example
     * // Check if a type exists
     * if ('MyType' in r.types) { ... }
     *
     * @example
     * // Type-safe access via enum
     * r.get(r.types.MyType)
     *
     */
    readonly types: TTypesEnum<TypeMap>;

    /**
     * Retrieves an instance associated with the given type token and optional name.
     *
     * @typeParam T - A specific token key from the TypeMap.
     * @param type - The token representing the type to resolve.
     * @param [name] - (Optional) The name of the specific binding to retrieve.
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
     * @param [name] -  (Optional) The name of the specific binding to retrieve.
     * @returns An instance of the requested type, or `undefined` if not found.
     */
    maybe<T extends keyof TypeMap>(
        type: T,
        name?: string,
    ): TypeMap[T] | undefined;

    /**
     * Retrieves all instances registered for the given type and name.
     *
     * Does not throws when no bindings are found
     * and instead returns an empty array.
     *
     * @param type - The type key to resolve instances for.
     * @param [name] - (Optional) The name of the specific binding to retrieve.
     */
    getAll<T extends keyof TypeMap>(
        type: T,
        name?: string,
    ): ReadonlyArray<TypeMap[T]>;

    /**
     * Creates a provider function that returns the resolved instance of the given type.
     *
     * This allows deferred/lazy resolution of a dependency, preserving the correct scope context.
     * If no binding is found for the provided type and name, an error is thrown.
     *
     * @param type - The token representing the type to resolve.
     * @param [name] - (Optional) The name of the specific binding to retrieve.
     *
     * @returns A function that resolves the instance when called.
     *
     * @throws {Error} If no binding is found for the given type and name.
     * @throws {Error} If a circular dependency is detected while resolving the instance.
     */
    providerOf<T extends keyof TypeMap>(
        type: T,
        name?: string,
    ): TProvider<TypeMap[T]>;

    /**
     * Returns a phantom instance of the given type.
     *
     * A phantom is a lazy stub that looks and behaves like a real instance
     * but does not trigger its creation until it is actually used.
     *
     * If the instance was already created earlier, it will return
     * the real instance immediately.
     *
     * This method is intended for **objects** (classes, services, complex values).
     * Using it with primitive types (number, string, boolean, etc.) may lead to unexpected results.
     *
     * @param type - The token representing the type to resolve.
     * @param name - (Optional) The name of the specific binding to retrieve.
     * @returns The phantom instance of the requested type.
     */
    phantomOf<T extends keyof TypeMap>(type: T, name?: string): TypeMap[T];
}

/**
 * A delegate function that receives a type binding interface
 * to register type bindings.
 *
 * @template TypeMap - The type map that defines all valid type keys and their corresponding types.
 * @param binder - An interface providing methods for binding types.
 */
export type TBinderDelegate<TypeMap extends TTypeMapBase> = (
    binder: ITypeEntryBinder<TypeMap>,
) => void;

/**
 * The context representing the current scope and resolution path.
 * Provides information about the current scope and its hierarchy.
 * Its useful for conditional instance creation or resolving dependencies differently
 * depending on where in the scope tree the resolution occurs
 * Also, it allows disposing the scope without exposing any internal instances.
 */
export interface IScopeContext extends IDisposable {
    /** Current scope ID */
    readonly current: string;

    /** Scope hierarchy */
    readonly path: readonly string[];

    /**
     * Closes the current scope and cleans up all local instances.
     *
     * After calling dispose, the scope is considered closed and further
     * operations using this context may throw errors or be invalid.
     */
    dispose(): void;
}

export interface IContainerScope<TypeMap extends TTypeMapBase>
    extends ITypesResolver<TypeMap>,
        IDisposable {
    /** Scope unique ID */
    readonly id: string;

    /** Scope hierarchy */
    readonly path: readonly string[];

    /**
     * Indicates whether the scope has been disposed.
     *
     * Once a scope is disposed, it is considered closed and can no longer be used
     * to resolve instances or create child scopes.
     */
    readonly isDisposed: boolean;

    /**
     * Checks if the current scope has a direct child scope with the specified ID.
     *
     * @param id - The ID of the child scope to check for.
     * @returns `true` if a child scope with the given ID exists
     */
    hasChildScope(id: string): boolean;

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

    /**
     * Alias for the {@link dispose} method to support the `using` statement.
     *
     * This method is called automatically when the scope is used with the
     * `using` statement for deterministic disposal of resources.
     */
    [Symbol.dispose](): void;
}

export interface IContainerBuilder<TypeMap extends TTypeMapBase>
    extends ITypeEntryBinder<TypeMap> {
    /**
     * Checks whether the given middleware is already registered in the container builder.
     *
     * @param middleware - The middleware instance to check.
     * @returns `true` if the middleware is already registered; otherwise, `false`.
     */
    hasMiddleware(middleware: IContainerMiddleware): boolean;

    /**
     * Checks whether the specified module has been included in the container builder,
     * either directly or through another included module.
     *
     * @param module - The module to check.
     * @returns `true` if the module is present in the builder's configuration, `false` otherwise.
     */
    hasModule(module: DIModule<any>): boolean;

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
     * Includes a DI module to the container builder.
     *
     * After attaching the module, all types registered by the module become available
     * for resolution inside factories and other modules.
     *
     * @template ModuleTypeMap The type map provided by the module.
     * @param module The module object that defines bindings to register in the container.
     * @returns The current container builder extended with the module's type map.
     */
    include<ModuleTypeMap extends TTypeMapBase>(
        module: DIModule<ModuleTypeMap>,
    ): IContainerBuilder<
        TypeMap extends ModuleTypeMap
            ? TypeMap
            : Prettify<TypeMap & ModuleTypeMap>
    >;

    /**
     * Finalizes the bindings and builds a container instance.
     *
     * @returns The built DI container.
     */
    build(): IContainerScope<TypeMap>;
}

/** Global options for the container builder. */
export type TContainerBuilderOptions = {
    /** Default lifecycle for bindings (if not specified in individual bindings). */
    lifecycle?: TLifecycle;

    /** Default conflict resolution strategy when a binding for the same type already exists. */
    ifConflict?: TTypesBindingResolveStrategy;
};

export type TModuleDeclaration = {
    /**
     * Finalizes a static module definition using the provided delegate.
     *
     * @template TypeMap The type map representing the types the module provides.
     * @param delegate The function that defines bindings for the module.
     * @returns The static module definition.
     */
    create<TypeMap extends TTypeMapBase>(
        delegate: DIModuleDelegate<TypeMap>,
    ): DIStaticModule<TypeMap>;
};

/**
 * Creates a static module declaration.
 *
 * This function is the entry point for declaring a reusable DI module.
 * It returns a declaration object with a `create()` method that accepts a delegate function.
 * The delegate is where the module registers its internal bindings.
 *
 * @param moduleId A unique identifier of the module.
 * @returns A declaration object with a `create()` method for defining the module.
 */
export declare function staticModule(moduleId: string): TModuleDeclaration;

/**
 * Represents the constructor arguments for a class that uses dependency injection.
 * @template TypeMap - A mapping of type keys to actual types.
 * @template InjectTuple - A tuple of keys from `TypeMap` representing the order of injections.
 */
export type TInjectableClassCtorArgs<
    TypeMap extends TTypeMapBase,
    InjectTuple extends readonly (keyof TypeMap)[],
> = {
    [K in keyof InjectTuple]: InjectTuple[K] extends keyof TypeMap
        ? TypeMap[InjectTuple[K]]
        : never;
};

/**
 * Represents a class that can be instantiated via a dependency injection container.
 * 
 * The class must have a static `inject` property listing the keys of dependencies from `TypeMap`.
 * The constructor arguments correspond to the types defined by `InjectTuple`.
 * 
 * @template TypeMap - A mapping of type keys to actual types.
 * @template InjectTuple - A tuple of keys from `TypeMap` specifying the injection order.
 * @template R - A type that class produces.
 */
export type TInjectableClass<
    TypeMap extends TTypeMapBase,
    InjectTuple extends readonly (keyof TypeMap)[],
    R,
> = {
    new (
        ...args: TInjectableClassCtorArgs<TypeMap, InjectTuple>
    ): R;
    readonly inject: InjectTuple;
} | (new () => R)

/**
 * A factory function that converts a class into a container-friendly factory.
 *
 * This function wraps a class constructor so it can be registered in a DI container.
 * It automatically resolves constructor arguments from the container according to the
 * class's `inject` property.
 *
 * @template TypeMap - A mapping of type keys to actual types.
 * @template ClassKey - The key in `TypeMap` corresponding to the type this factory produces.
 * @template InjectTuple - A tuple of keys from `TypeMap` specifying the injection order.
 *
 * @param Class - A class with a static `inject` property or a no-argument class.
 * @returns A type-safe factory for the DI container binding.
 */
export declare function factoryOf<
    TypeMap extends TTypeMapBase,
    ClassKey extends keyof TypeMap,
    InjectTuple extends readonly (keyof TypeMap)[],
>(
    Class: TInjectableClass<TypeMap, InjectTuple, TypeMap[ClassKey]>
): TTypeFactory<TypeMap, ClassKey>;

/**
 * Creates a new dependency injection container builder.
 *
 * @typeParam TypeMap - A mapping of tokens to their corresponding instance types.
 * @param builderOptions - Optional builder settings.
 * @returns A new container builder used to configure and build the DI container.
 */
export declare function diBuilder<TypeMap extends TTypeMapBase>(
    builderOptions?: TContainerBuilderOptions,
): IContainerBuilder<TypeMap>;

/**
 * Extracts the `TypeMap` from various DI-related objects.
 *
 * This utility type infers the underlying `TypeMap` that
 * defines the mapping of type keys to their corresponding types.
 *
 * @example
 * type ModuleTypeMap = TypeMapOf<typeof module>;
 */
export type TypeMapOf<T> = T extends
    | IContainerScope<infer TypeMap>
    | DIModule<infer TypeMap>
    | IContainerBuilder<infer TypeMap>
    | ITypeEntryBinder<infer TypeMap>
    | ITypesResolver<infer TypeMap>
    | TTypeEntry<infer TypeMap, any>
    ? TypeMap
    : never;
