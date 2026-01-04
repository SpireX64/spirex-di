import type { ComponentType, PropsWithChildren } from "react";
import type {
    IContainerScope,
    ITypesResolver,
    TScopeOptions,
    TTypeMapBase,
} from "@spirex/di";

/**
 * A function that selects one or more dependencies from the DI resolver.
 *
 * @template TypeMap The DI type map.
 * @template R The type of the resolved dependencies returned by the selector.
 * @param resolver A resolver that provides access to registered types in the DI container.
 * @returns The selected dependency or an object containing multiple dependencies.
 */
export type TInjectSelector<TypeMap extends TTypeMapBase, R> = (
    resolver: ITypesResolver<TypeMap>,
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
 * The React integration API for dependency injection.
 *
 * @template TypeMap The DI type map.
 */
export type DIReactContext<TypeMap extends TTypeMapBase> = {
    /**
     * Provides the root container scope to all child components via React context.
     */
    DIRootScope: ComponentType<PropsWithChildren<DIRootScopeProps<TypeMap>>>;

    /**
     * Creates a new nested scope within the current container.
     * Useful for isolating or sealing services for a subtree of components.
     */
    DIScope: ComponentType<PropsWithChildren<DIScopeProps<TypeMap>>>;

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
     * @returns A HOC that wraps a component and provides the selected dependencies as props.
     *
     * @example
     * const withUser = withInject(r => ({ userService: r.get("userService") }));
     * const UserProfile = withUser(({ userService }) => { ... });
     */
    withInject<R extends object>(
        selector: TInjectSelector<TypeMap, R>,
    ): <P extends R>(
        component: ComponentType<P>,
    ) => ComponentType<Omit<P, keyof R>>;
};

/**
 * Creates a new DI context instance for React.
 *
 * @template TypeMap The DI type map for the container.
 * @returns A set of React components and hooks for dependency injection.
 *
 * @example
 * type TypeMap = TypeMapOf<ReturnType<typeof createContainer>>;
 * const { DIRootScope, DIScope, useInject, withInject } = createDIContext<TypeMap>();
 */
export declare function createDIContext<
    TypeMap extends TTypeMapBase,
>(): DIReactContext<TypeMap>;
