import type { 
    ComponentType,
    PropsWithChildren,
    ForwardRefExoticComponent,
    RefAttributes,
} from "react";
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
 * Used to attach a DI container scope to the React context at the application root.
 *
 * @template TypeMap The DI type map for the container.
 */
export type DIRootScopeProps<TypeMap extends TTypeMapBase> = {
    /** The root container scope. */
    root: IContainerScope<TypeMap>;
};

/**
 * React component type for the root DI scope provider.
 * Wraps {@link DIRootScopeProps} with `PropsWithChildren`.
 *
 * @template TypeMap The DI type map for the container. Defaults to {@link AnyTypeMap}.
 * @since 1.2.0
 */
export type DIRootScopeComponentType<TypeMap extends TTypeMapBase = AnyTypeMap> = ComponentType<PropsWithChildren<DIRootScopeProps<TypeMap>>>

/**
 * Props for a nested DI scope provider.
 * Allows creating isolated or sealed scopes inside the component tree.
 *
 * @template TypeMap The DI type map for the container.
 */
export type DIScopeProps<TypeMap extends TTypeMapBase> = {
    /** String identifier of the new DI scope */
    id: string
} & TScopeOptions;

/**
 * React component type for a nested DI scope provider.
 * Wraps {@link DIScopeProps} with `PropsWithChildren`.
 *
 * @template TypeMap The DI type map for the container. Defaults to {@link AnyTypeMap}.
 * @since 1.2.0
 */
export type DIScopeComponent<TypeMap extends TTypeMapBase = AnyTypeMap> = ComponentType<PropsWithChildren<DIScopeProps<TypeMap>>>;


// ----- STRICT TYPED --------

/**
 * The React integration API for dependency injection.
 *
 * @template TypeMap The DI type map.
 */
export type DIReact<TypeMap extends TTypeMapBase> = {
    /**
     * Provides the root container scope to all child components via React context.
     */
    DIRootScope: DIRootScopeComponentType<TypeMap>;

    /**
     * Creates a new nested scope within the current container.
     * Useful for isolating or sealing services for a subtree of components.
     */
    DIScope: DIScopeComponent<TypeMap>;

    /**
     * A React hook for retrieving dependencies from the DI container.
     *
     * @param selector A selector function that picks one or more dependencies from the container.
     * @returns The dependencies selected by the selector.
     *
     * @example
     * const { userService } = useInject(r => ({
     *   userService: r.get("userService")
     * }));
     */
    useInject<R>(selector: TInjectSelector<TypeMap, R>): R;

    /**
     * React hook to retrieve a single dependency from the current DI scope.
     *
     * This is a shorthand form of `useInject(r => r.get(type, name))`.
     *
     * @typeParam T - The key of the type in the container's TypeMap.
     * @param type - The identifier (key) of the dependency to resolve.
     * @param name - Optional named binding for the dependency.
     * @returns The resolved instance of the dependency from the container.
     *
     * @example
     * ```tsx
     * // Resolves a dependency by its key
     * const service = useInject("myService");
     *
     * // Resolves a named dependency
     * const fooService = useInject("myService", "foo");
     * ```
     */
    useInject<T extends keyof TypeMap>(type: T, name?: string): TypeMap[T];

    /**
     * A higher-order component (HOC) for injecting dependencies into a component.
     *
     * @param selector A selector function that picks one or more dependencies from the container.
     * @param scope Optional scope definition.
     * @returns A HOC that wraps a component and provides the selected dependencies as props.
     *
     * @example
     * const withUser = withInject(r => ({ userService: r.get("userService") }));
     * const UserProfile = withUser(({ userService }) => { ... });
     */
    withInject<R extends object>(
        selector: TInjectSelector<TypeMap, R>,
        scope?: DIScopeProps<TypeMap>,
    ): <P extends R>(
        component: ComponentType<P>,
    ) => ForwardRefExoticComponent<Omit<P, keyof R> & RefAttributes<unknown>>;
};

/**
 * Standalone type for the `useInject` hook, extracted from {@link DIReact}.
 * Use to type-cast the dynamically typed `useInject` export with a specific TypeMap.
 *
 * @template TypeMap The DI type map. Defaults to {@link AnyTypeMap}.
 * @since 1.2.0
 *
 * @example
 * ```ts
 * import { useInject } from "@spirex/di-react";
 * import type { TUseInject } from "@spirex/di-react";
 *
 * type LocalTypeMap = TypeMapOf<typeof ModuleA> & TypeMapOf<typeof ModuleB>;
 * const useTypedInject = useInject as TUseInject<LocalTypeMap>;
 * ```
 */
export type TUseInject<TypeMap extends TTypeMapBase = AnyTypeMap> = DIReact<TypeMap>["useInject"]

/**
 * Standalone type for the `withInject` HOC, extracted from {@link DIReact}.
 * Use to type-cast the dynamically typed `withInject` export with a specific TypeMap.
 *
 * @template TypeMap The DI type map. Defaults to {@link AnyTypeMap}.
 * @since 1.2.0
 *
 * @example
 * ```ts
 * import { withInject } from "@spirex/di-react";
 * import type { TWithInject } from "@spirex/di-react";
 *
 * type LocalTypeMap = TypeMapOf<typeof ModuleA> & TypeMapOf<typeof ModuleB>;
 * const withTypedInject = withInject as TWithInject<LocalTypeMap>;
 * ```
 */
export type TWithInject<TypeMap extends TTypeMapBase = AnyTypeMap> = DIReact<TypeMap>["withInject"]


/**
 * Resolves strict typed DI tools for React.
 *
 * @template TypeMap The DI type map for the container.
 * @returns A set of React components and hooks for dependency injection.
 * @since 1.2.0
 *
 * @example
 * type TypeMap = TypeMapOf<ReturnType<typeof createContainer>>;
 * const { DIRootScope, DIScope, useInject, withInject } = getDIReact<TypeMap>();
 */
export declare function getDIReact<
    TypeMap extends TTypeMapBase,
>(): DIReact<TypeMap>;

/**
 * Resolves a DI tools for React.
 *
 * @deprecated Use {@link getDIReact} instead (since 1.2.0)
 * @template TypeMap The DI type map for the container.
 * @returns A set of React components and hooks for dependency injection.
 * 
 */
export declare function createDIContext<
    TypeMap extends TTypeMapBase,
>(): DIReact<TypeMap>;



// ------ DYNAMIC TYPED ----------

/**
 * Dynamically typed React hook for resolving dependencies from the DI container.
 * Can be narrowed to a specific TypeMap via type cast: `useInject as TUseInject<MyTypeMap>`.
 * @since 1.2.0
 */
export declare const useInject: TUseInject;

/**
 * Dynamically typed higher-order component for injecting dependencies into component props.
 * Can be narrowed to a specific TypeMap via type cast: `withInject as TWithInject<MyTypeMap>`.
 * @since 1.2.0
 */
export declare const withInject: TWithInject;

/**
 * Dynamically typed root DI scope provider component.
 * Attaches a DI container scope to the React context at the application root.
 * @since 1.2.0
 */
export declare const DIRootScope: DIRootScopeComponentType;

/**
 * Dynamically typed nested DI scope provider component.
 * Creates a child scope within the current container for a subtree of components.
 * @since 1.2.0
 */
export declare const DIScope: DIScopeComponent;
