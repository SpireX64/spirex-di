import type { TTypeEntry, TTypeMapBase } from "./types";
import type { DIScope } from "./DIScope";

export type TContainerMiddleware<TypeMap extends TTypeMapBase> = Partial<{
    name: string;

    onBind<Entry extends TTypeEntry<TypeMap, keyof TypeMap>>(
        entry: Entry,
        originEntry: Entry,
    ): Entry;

    onCreated<Entry extends TTypeEntry<TypeMap, keyof TypeMap>>(
        entry: Entry,
        instance: TypeMap[keyof TypeMap],
    ): TypeMap[keyof TypeMap];

    onRequest<Entry extends TTypeEntry<TypeMap, keyof TypeMap>>(
        entry: Entry,
        originEntry: Entry,
        scope: DIScope<TypeMap>,
    ): Entry;

    onResolve<Entry extends TTypeEntry<TypeMap, keyof TypeMap>>(
        instance: TypeMap[keyof TypeMap],
        entry: Entry,
        scope: DIScope<TypeMap>,
    ): TypeMap[keyof TypeMap];

    onScopeWasOpen(scope: DIScope<TypeMap>): void;

    onScopeWillClose(scope: DIScope<TypeMap>): void;
}>;
