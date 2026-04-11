import type { Component, ParentProps } from "solid-js";
import type {
    IContainerScope,
    IScopeContext,
    ITypesResolver,
    TScopeOptions,
    TTypeMapBase,
    AnyTypeMap,
} from "@spirex/di";

/**
 * A function that selects one or more dependencies from the DI resolver.
 *
 * @template TypeMap The DI type map.
 * @template R The type of the resolved dependencies returned by the selector.
 * @param resolver A resolver that provides access to registered types in the DI container.
 * @param scopeContext The context representing the current scope and resolution path.
 * @returns The selected dependency or an object containing multiple dependencies.
 */
export type TInjectSelector<TypeMap extends TTypeMapBase, R> = (
    resolver: ITypesResolver<TypeMap>,
    scopeContext: IScopeContext,
) => R;

/**
 * Props for the root DI scope provider.
 * Used to attach a DI container scope to the Solid context at the application root.
 *
 * @template TypeMap The DI type map for the container.
 */
export type DIRootScopeProps<TypeMap extends TTypeMapBase> = {
    /** The root container scope. */
    root: IContainerScope<TypeMap>;
};

/**
 * Solid component type for the root DI scope provider.
 *
 * @template TypeMap The DI type map for the container. Defaults to {@link AnyTypeMap}.
 */
export type DIRootScopeComponentType<TypeMap extends TTypeMapBase = AnyTypeMap> = Component<
    ParentProps<DIRootScopeProps<TypeMap>>
>;

/**
 * Props for a nested DI scope provider.
 *
 * @template TypeMap The DI type map for the container.
 */
export type DIScopeProps<TypeMap extends TTypeMapBase> = {
    /** String identifier of the new DI scope */
    id: string;
} & TScopeOptions;

/**
 * Solid component type for a nested DI scope provider.
 *
 * @template TypeMap The DI type map for the container. Defaults to {@link AnyTypeMap}.
 */
export type DIScopeComponent<TypeMap extends TTypeMapBase = AnyTypeMap> = Component<
    ParentProps<DIScopeProps<TypeMap>>
>;

/**
 * The Solid integration API for dependency injection.
 *
 * @template TypeMap The DI type map.
 */
export type DISolid<TypeMap extends TTypeMapBase> = {
    /**
     * Provides the root container scope to all child components via Solid context.
     */
    DIRootScope: DIRootScopeComponentType<TypeMap>;

    /**
     * Creates a new nested scope within the current container.
     */
    DIScope: DIScopeComponent<TypeMap>;

    /**
     * Hook for retrieving dependencies from the DI container via a selector.
     */
    useInject<R>(selector: TInjectSelector<TypeMap, R>): R;

    /**
     * Hook to retrieve a single dependency by type key (shorthand for `useInject(r => r.get(type, name))`).
     */
    useInject<T extends keyof TypeMap>(type: T, name?: string): TypeMap[T];
};

/**
 * Standalone type for the `useInject` hook. Narrow with a cast: `useInject as TUseInject<MyTypeMap>`.
 *
 * @template TypeMap The DI type map. Defaults to {@link AnyTypeMap}.
 */
export type TUseInject<TypeMap extends TTypeMapBase = AnyTypeMap> = DISolid<TypeMap>["useInject"];

/**
 * Returns strictly typed DI tools for Solid.
 *
 * @template TypeMap The DI type map for the container.
 *
 * @example
 * type TypeMap = TypeMapOf<ReturnType<typeof createContainer>>;
 * const { DIRootScope, DIScope, useInject } = getDISolid<TypeMap>();
 */
export declare function getDISolid<TypeMap extends TTypeMapBase>(): DISolid<TypeMap>;

/**
 * Dynamically typed hook for resolving dependencies. Narrow with {@link TUseInject}.
 */
export declare const useInject: TUseInject;

/**
 * Root DI scope provider — attaches the container scope at the app root.
 */
export declare const DIRootScope: DIRootScopeComponentType;

/**
 * Nested DI scope provider for a subtree.
 */
export declare const DIScope: DIScopeComponent;
