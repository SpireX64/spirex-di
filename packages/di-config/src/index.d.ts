import type {
    IContainerMiddleware,
    ITypesResolver,
    TTypeMapBase,
} from "@spirex/di";

/**
 * A delegate used to configure an instance after it has been created by the DI container.
 *
 * This function is invoked immediately after the instance is constructed and before it is returned
 * to the consumer. It allows you to perform additional initialization logic, such as injecting values,
 * configuring properties, or wiring up runtime state.
 *
 * @template TypeMap The type map of the DI container.
 * @template Type The type of the service instance being configured.
 * @param instance The resolved service instance.
 * @param resolver A resolver that can be used to access other services from the container.
 */
export type TConfigureMiddlewareDelegate<TypeMap extends TTypeMapBase, Type> = (
    instance: Type,
    resolver: ITypesResolver<TypeMap>,
) => void;

/**
 * A map of named delegates for configuring a service with multiple named bindings.
 *
 * This allows different configuration logic to be applied depending on the binding `name`.
 * For example, a `logger` service might have both "console" and "file" implementations,
 * each with their own configuration delegate.
 *
 * @template TypeMap The type map of the DI container.
 * @template Type The type of the service instance being configured.
 */
export type TConfigureMiddlewareNamedDelegateMap<
    TypeMap extends TTypeMapBase,
    Type,
> = Record<string, TConfigureMiddlewareDelegate<TypeMap, Type>>;

/**
 * A configuration map for the `Config` middleware.
 *
 * Each key corresponds to a service in the container's `TypeMap`. For each service, you can specify:
 * - A single delegate function to configure all instances of that service.
 * - Or a map of named delegates to configure different named bindings individually.
 *
 * @template TypeMap The type map of the DI container.
 */
export type TConfigureMiddlewareMap<TypeMap extends TTypeMapBase> = {
    [K in keyof TypeMap]?:
        | TConfigureMiddlewareDelegate<TypeMap, TypeMap[K]>
        | TConfigureMiddlewareNamedDelegateMap<TypeMap, TypeMap[K]>;
};

/**
 * Creates a middleware that configures services after they are instantiated by the container.
 *
 * It allows you to declare post-construction configuration logic in a clear and centralized way,
 * without writing custom middleware for each service.
 *
 * Typical use cases:
 * - Injecting runtime values (API keys, file paths, etc.) into services created by a module.
 * - Applying optional setup logic without modifying the original class or factory.
 * - Configuring multiple services at once in a single middleware.
 *
 * @template TypeMap The type map of the DI container.
 * @param config A configuration map that associates services with their configuration delegates.
 * @returns A container middleware that applies the provided configuration logic during service activation.
 * 
 * @example
 * builder.use(Config({
 *   service: (svc, r) => { svc.key = r.get("apiKey"); },
 *   logger: {
 *     console: logger => { logger.setLevel("debug"); },
 *     file: (logger, r) => { logger.setFile(r.get("logFilePath")); }
 *   },
 * })
 */
export declare function Config<TypeMap extends TTypeMapBase>(
    config: TConfigureMiddlewareMap<TypeMap>,
): IContainerMiddleware<TypeMap>;
