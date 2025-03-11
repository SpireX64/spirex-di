import { IContainerBuilderBinder, TTypeMapBase } from "../types";

export type TModuleBuilder<TypeMap extends TTypeMapBase> =
    IContainerBuilderBinder<TypeMap>;

export type TStaticBuilderDelegate<TypeMap extends TTypeMapBase> = (
    builder: TModuleBuilder<TypeMap>,
) => void;

export type TDynamicImportDelegate<T> = () => PromiseLike<T>;
export type TDynamicBuilderDelegate<TypeMap extends TTypeMapBase, JSModule> = (
    builder: TModuleBuilder<TypeMap>,
    jsModule: JSModule,
) => void;

export type TStaticDIModule<TypeMap extends TTypeMapBase> = {
    type: "static";
    name: string;
    builderDelegate: TStaticBuilderDelegate<TypeMap>;
};

export type TDynamicDIModule<TypeMap extends TTypeMapBase, JSModule> = {
    type: "dynamic";
    name: string;
    importDelegate: TDynamicImportDelegate<JSModule>;
    builderDelegate: TDynamicBuilderDelegate<TypeMap, JSModule>;
};

export type TAnyDIModule<TypeMap extends TTypeMapBase> =
    | TStaticDIModule<TypeMap>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | TDynamicDIModule<TypeMap, any>;

export type TDynamicModuleHandle<TypeMap extends TTypeMapBase, ESModule> = {
    readonly module: TDynamicDIModule<TypeMap, ESModule>;
    readonly isLoaded: boolean;
    loadAsync: () => Promise<void>;
};
