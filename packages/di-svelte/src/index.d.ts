import type {
    AnyTypeMap,
    IContainerScope,
    IScopeContext,
    ITypesResolver,
    TScopeOptions,
    TTypeMapBase,
} from "@spirex/di";

/**
 * Selects dependencies from the DI resolver for the current Svelte subtree.
 *
 * @template TypeMap The DI type map.
 * @template R The return type of the selector.
 */
export type TInjectSelector<TypeMap extends TTypeMapBase, R> = (
    resolver: ITypesResolver<TypeMap>,
    scopeContext: IScopeContext,
) => R;

/**
 * Svelte integration API: imperative `setContext` helpers and `useInject`.
 *
 * @template TypeMap The DI type map.
 */
export type DISvelte<TypeMap extends TTypeMapBase> = {
    /**
     * Sets the current container scope for this component subtree (overwrites parent DI context for descendants).
     */
    setDIRootScope(scope: IContainerScope<TypeMap>): void;

    /**
     * Creates a child scope from the current one and sets it as context for descendants.
     * Disposes the child scope when the component is destroyed.
     */
    setDIScope(id: string, options?: TScopeOptions): void;

    useInject<R>(selector: TInjectSelector<TypeMap, R>): R;
    useInject<T extends keyof TypeMap>(type: T, name?: string): TypeMap[T];
};

/**
 * Narrow `useInject` to a merged TypeMap in multi-package apps.
 *
 * @example
 * ```ts
 * import { useInject } from "@spirex/di-svelte";
 * import type { TUseInject } from "@spirex/di-svelte";
 * type AppMap = TypeMapOf<typeof containerA> & TypeMapOf<typeof containerB>;
 * const inject = useInject as TUseInject<AppMap>;
 * ```
 */
export type TUseInject<TypeMap extends TTypeMapBase = AnyTypeMap> =
    DISvelte<TypeMap>["useInject"];

/**
 * Returns the same function references as direct imports; use for strict typing of `TypeMap`.
 */
export declare function getDISvelte<
    TypeMap extends TTypeMapBase,
>(): DISvelte<TypeMap>;

export declare const setDIRootScope: <TypeMap extends TTypeMapBase>(
    scope: IContainerScope<TypeMap>,
) => void;

export declare const setDIScope: <TypeMap extends TTypeMapBase>(
    id: string,
    options?: TScopeOptions,
) => void;

export declare const useInject: TUseInject;
