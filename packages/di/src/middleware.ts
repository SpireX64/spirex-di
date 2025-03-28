import type { TTypeEntry, TTypeMapBase } from "./types";
import type { DIScope } from "./DIScope";

export type TContainerMiddleware<TypeMap extends TTypeMapBase> = Partial<{
    name: string;

    onBind(
        entry: TTypeEntry<TypeMap, keyof TypeMap>,
        originEntry: TTypeEntry<TypeMap, keyof TypeMap>,
    ): TTypeEntry<TypeMap, keyof TypeMap>;

    onCreated(
        entry: TTypeEntry<TypeMap, keyof TypeMap>,
        instance: TypeMap[keyof TypeMap],
    ): TypeMap[keyof TypeMap];

    onRequest(
        entry: TTypeEntry<TypeMap, keyof TypeMap>,
        originEntry: TTypeEntry<TypeMap, keyof TypeMap>,
        scope: DIScope<TypeMap>,
    ): TTypeEntry<TypeMap, keyof TypeMap>;

    onResolve(
        instance: TypeMap[keyof TypeMap],
        entry: TTypeEntry<TypeMap, keyof TypeMap>,
        scope: DIScope<TypeMap>,
    ): TypeMap[keyof TypeMap];

    onScopeWasOpen(scope: DIScope<TypeMap>): void;

    onScopeWillClose(scope: DIScope<TypeMap>): void;
}>;
