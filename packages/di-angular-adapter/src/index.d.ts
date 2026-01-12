import type { IContainerMiddleware, TTypeMapBase } from "@spirex/di";

export interface IAngularAdapter {}

export type AngularAdapterTypeMap = {
    ngAdapter: IAngularAdapter;
};

export declare function AngularAdapter<
    TypeMap extends TTypeMapBase,
>(): IContainerMiddleware<TypeMap, AngularAdapterTypeMap>;
