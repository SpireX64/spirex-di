import {
    TBindingOptions,
    TTypeEntry,
    TTypeFactory,
    TTypeFactoryEntry,
    TTypeInstanceEntry,
    TTypeMapBase,
} from "./types";

export class DIContainerBuilder<TypeMap extends TTypeMapBase> {
    private readonly _types = new Map<
        keyof TypeMap,
        TTypeEntry<keyof TypeMap, TypeMap[keyof TypeMap]>
    >();

    public getTypeEntry<K extends keyof TypeMap>(
        type: K,
    ): TTypeEntry<K, TypeMap[K]> | null {
        return this._types.get(type) as TTypeEntry<K, TypeMap[K]>;
    }

    public bindInstance<K extends keyof TypeMap>(
        type: K,
        instance: TypeMap[K],
        options?: TBindingOptions,
    ): this {
        if (this._types.has(type)) {
            if (options?.ifConflict === "keep") return this;
            if (options?.ifConflict !== "replace")
                throw new Error(`Type "${type.toString()}" already registered`);
        }
        const entry: TTypeInstanceEntry<K, TypeMap[K]> = {
            type,
            instance,
        };

        this._types.set(type, entry);

        return this;
    }

    public bindFactory<K extends keyof TypeMap>(
        type: K,
        factory: TTypeFactory<TypeMap[K]>,
        options?: TBindingOptions,
    ): this {
        if (this._types.has(type)) {
            if (options?.ifConflict === "keep") return this;
            if (options?.ifConflict !== "replace")
                throw new Error(`Type "${type.toString()}" already registered`);
        }
        const entry: TTypeFactoryEntry<K, TypeMap[K]> = {
            type,
            factory,
        };
        this._types.set(type, entry);
        return this;
    }
}
