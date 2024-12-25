import {
    TBindingOptions,
    TTypeEntry,
    TTypeFactory,
    TTypeFactoryEntry,
    TTypeInstanceEntry,
    TTypeMapBase,
} from "./types";
import { DIContainer } from "./DIContainer";

const Errors = {
    EmptyContainer:
        "Container building failed. Cannot create a container without bindings. " +
        "Please bind at least one service or value using 'bindInstance' or 'bindFactory'.",
    BindingConflict: (type: string) =>
        `Binding conflict. The type '${type}' is already bound.`,
} as const;

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
                throw new Error(Errors.BindingConflict(type.toString()));
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
                throw new Error(Errors.BindingConflict(type.toString()));
        }
        const entry: TTypeFactoryEntry<K, TypeMap[K]> = {
            type,
            factory,
        };
        this._types.set(type, entry);
        return this;
    }

    public build(): DIContainer<TypeMap> {
        if (this._types.size === 0) throw new Error(Errors.EmptyContainer);
        return new DIContainer();
    }
}
