import type { InjectionToken, FactoryProvider } from "@angular/core";
import type { IContainerMiddleware, TTypeMapBase } from "@spirex/di";

/**
 * A read-only mapping from SpireX/DI TypeMap to corresponding Angular InjectionTokens.
 * @template TypeMap - The type map of the DI container.
 */
export type TokensTypeMap<TypeMap extends TTypeMapBase> = Readonly<{
    [K in keyof TypeMap]: InjectionToken<TypeMap[K]>;
}>;

/**
 * Represents the Angular integration bridge for a SpireX/DI container.
 * Provides typed access to all InjectionTokens derived from the container and
 * exposes FactoryProviders for Angular modules or scopes.
 *
 * @template TypeMap - The type map of the DI container.
 */
export interface IAngularBridge<TypeMap extends TTypeMapBase> {
    /** Typed InjectionTokens mapped from all types in the container.*/
    readonly tokens: TokensTypeMap<TypeMap>;

    /**
     * Returns an array of Angular FactoryProviders suitable for registering
     * in the root injector (singleton providers) for the entire application.
     */
    providersForRoot(): readonly FactoryProvider[];

    /**
     * Returns an array of Angular FactoryProviders suitable for registering
     * in a scoped injector, for isolated or feature-specific lifetimes.
     * @param id — Unique scope identifier.
     */
    providersForScope(id: string): readonly FactoryProvider[];
}

/**
 * Extends a DI container's type map with the AngularBridge integration.
 * @template ContainerTypeMap - The type map of the container before bridge application.
 */
export type AngularTypeMap<ContainerTypeMap extends TTypeMapBase> = {
    AngularBridge: IAngularBridge<ContainerTypeMap>;
};

/**
 * Creates middleware for integrating a SpireX DI container with Angular DI.
 * This middleware automatically generates InjectionTokens and providers
 * for all container registrations, supporting named and multi-instance bindings.
 *
 * @template TypeMap - The type map of the container.
 * @returns A container middleware which extends the container's type map
 *          with the `AngularBridge` type.
 * @example
 * builder.use(AngularBridge());
 */
export declare function AngularBridge<
    TypeMap extends TTypeMapBase,
>(): IContainerMiddleware<TypeMap, AngularTypeMap<TypeMap>>;

/**
 * Returns a named InjectionToken corresponding to a specific registration in the container.
 * Useful for accessing named bindings in Angular.
 *
 * @template T - The type of the dependency.
 * @param token - The base InjectionToken for the type.
 * @param name - The specific name of the binding.
 * @returns An InjectionToken corresponding to the named dependency.
 *
 * @example
 * inject(named(tokens.UserService, "admin"));
 */
export declare function named<T>(
    token: InjectionToken<T>,
    name: string,
): InjectionToken<T>;

/**
 * Returns a multi-instance InjectionToken representing all bindings of a type.
 *
 * @template T - The type of the dependency.
 * @param token - The base InjectionToken for the type.
 * @param name - Optional name to filter named bindings.
 * @returns An InjectionToken representing a readonly array of all matching instances.
 *
 * @example
 * const allUsers = allOf(tokens.UserService);
 * const admins = allOf(named(tokens.UserService, "admin"));
 * const admins = allOf(tokens.UserService, "admin");
 */
export declare function allOf<T>(
    token: InjectionToken<T>,
    name?: string,
): InjectionToken<readonly T[]>;
