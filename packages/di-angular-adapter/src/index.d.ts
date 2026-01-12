import type { InjectionToken } from "@angular/core";
import type { IContainerMiddleware, TTypeMapBase } from "@spirex/di";

export type TokensTypeMap<TypeMap extends TTypeMapBase> = Readonly<{
    [K in keyof TypeMap]: InjectionToken<TypeMap[K]>;
}>;

export interface IAngularAdapter<TypeMap extends TTypeMapBase> {
    readonly tokens: TokensTypeMap<TypeMap>;
}

export type AngularAdapterTypeMap<ContainerTypeMap extends TTypeMapBase> = {
    angularAdapter: IAngularAdapter<ContainerTypeMap>;
};

export declare function AngularAdapter<
    TypeMap extends TTypeMapBase,
>(): IContainerMiddleware<TypeMap, AngularAdapterTypeMap<TypeMap>>;
