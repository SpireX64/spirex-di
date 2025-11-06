import type { TTypeMapBase, IContainerScope, TScopeOptions, ITypesResolver } from "@spirex/di";
import type { SvelteComponentTyped } from "svelte";

export type DIRootScopeComponentProps<TypeMap extends TTypeMapBase> = {
    root: IContainerScope<TypeMap>;
};
export type DIRootScopeComponent<TypeMap extends TTypeMapBase> =
    SvelteComponentTyped<DIRootScopeComponentProps<TypeMap>>;

export type DIScopeComponentProps = {
    name: string
} & TScopeOptions

export type DIScopeComponent =
    SvelteComponentTyped<DIScopeComponentProps>

export type TInjectSelector<TypeMap extends TTypeMapBase, R> =
    (resolver: ITypesResolver<TypeMap>) => R

export type SvelteDIContext<TypeMap extends TTypeMapBase> = {
    DIRootScope: DIRootScopeComponent<TypeMap>;
    DIScope: DIScopeComponent;
    setDIRootScope(scope: IContainerScope<TypeMap>): void
    setDIScope(name: string, options?: TScopeOptions): void
    useInject<R>(selector: TInjectSelector<TypeMap, R>): R
    useInject<T extends keyof TypeMap>(type: T, name?: string): TypeMap[T]
};

export declare function createDIContext<
    TypeMap extends TTypeMapBase,
>(): SvelteDIContext<TypeMap>;
