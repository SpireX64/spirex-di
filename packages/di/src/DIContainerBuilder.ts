import type { TTypeEntry, TTypeMapBase } from "./types";

export class DIContainerBuilder<TypeMap extends TTypeMapBase> {
    private readonly _types = new Map<
        keyof TypeMap,
        TTypeEntry<keyof TypeMap, TypeMap[keyof TypeMap]>
    >();

    public bindInstance<K extends keyof TypeMap>(
        type: K,
        instance: TypeMap[K],
    ): this {
        const entry: TTypeEntry<K, TypeMap[K]> = {
            type,
            instance,
        };

        this._types.set(type, entry);

        return this;
    }

    getTypeEntry<K extends keyof TypeMap>(
        type: keyof TypeMap,
    ): TTypeEntry<K, TypeMap[K]> | null {
        return this._types.get(type) as TTypeEntry<K, TypeMap[K]>;
    }
}
