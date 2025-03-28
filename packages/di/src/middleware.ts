import type { TTypeEntry } from "./types";
import type { DIScope } from "./DIScope";

export type TGenericTypeMap = Record<string, unknown>;
export type TContainerMiddleware = Partial<{
    name: string;

    onBind(
        entry: TTypeEntry<TGenericTypeMap, keyof TGenericTypeMap>,
        originEntry: TTypeEntry<TGenericTypeMap, keyof TGenericTypeMap>,
    ): TTypeEntry<TGenericTypeMap, keyof TGenericTypeMap>;

    onCreated(
        entry: TTypeEntry<TGenericTypeMap, keyof TGenericTypeMap>,
        instance: TGenericTypeMap[keyof TGenericTypeMap],
    ): TGenericTypeMap[keyof TGenericTypeMap];

    onRequest(
        entry: TTypeEntry<TGenericTypeMap, keyof TGenericTypeMap>,
        originEntry: TTypeEntry<TGenericTypeMap, keyof TGenericTypeMap>,
        scope: DIScope<TGenericTypeMap>,
    ): TTypeEntry<TGenericTypeMap, keyof TGenericTypeMap>;

    onResolve(
        instance: TGenericTypeMap[keyof TGenericTypeMap],
        entry: TTypeEntry<TGenericTypeMap, keyof TGenericTypeMap>,
        scope: DIScope<TGenericTypeMap>,
    ): TGenericTypeMap[keyof TGenericTypeMap];

    onScopeWasOpen(scope: DIScope<TGenericTypeMap>): void;

    onScopeWillClose(scope: DIScope<TGenericTypeMap>): void;
}>;
