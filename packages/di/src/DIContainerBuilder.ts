import type {
    TBindingOptions,
    TFactoryBindingOptions,
    TLifecycle,
    TTypeEntry,
    TTypeFactory,
    TTypeFactoryEntry,
    TTypeInstanceEntry,
    TTypeMapBase,
} from "./types";
import type { TTypeEntriesMap } from "./internal/types";
import { validateLifecycle } from "./internal/validators";
import { DIContainer } from "./DIContainer";
import { Registrar } from "./internal/Registrar";

const Errors = {
    EmptyContainer:
        "Container building failed. Cannot create a container without bindings. " +
        "Please bind at least one service or value using 'bindInstance' or 'bindFactory'.",
    BindingConflict: (type: string) =>
        `Binding conflict. The type '${type}' is already bound.`,
} as const;

export class DIContainerBuilder<TypeMap extends TTypeMapBase> {
    private readonly _types: TTypeEntriesMap<TypeMap> = new Map();

    public getTypeEntry<Key extends keyof TypeMap>(
        type: Key,
    ): TTypeEntry<TypeMap, Key> | null {
        return this._types.get(type) as TTypeEntry<TypeMap, Key>;
    }

    /**
     * Binds an existing instance to a specified type.
     *
     * This method registers an instance that will be returned when the specified type is resolved.
     * @param type - The type to bind the instance to.
     * @param instance - The instance to associate with the specified type.
     * @param options - Options for binding.
     *
     * @throws {Error} If a binding conflict occurs with 'throw' option.
     *
     * @returns The current builder instance reference for method chaining.
     */
    public bindInstance<Key extends keyof TypeMap>(
        type: Key,
        instance: TypeMap[Key],
        options?: TBindingOptions,
    ): this {
        if (this._types.has(type)) {
            if (options?.ifConflict === "keep") return this;
            if (options?.ifConflict !== "replace")
                throw new Error(Errors.BindingConflict(type.toString()));
        }
        const entry: TTypeInstanceEntry<TypeMap, Key> = { type, instance };
        this._types.set(type, entry);
        return this;
    }

    /**
     * Binds a factory function to a specified type.
     *
     * The factory function is used to create an instance of the specified type when it is resolved.
     * @param type - The type to bind the factory to.
     * @param factory - The factory function to create instances of the specified type.
     * @param options - Options for binding.
     *
     * @throws {Error} If a binding conflict occurs with 'throw' option.
     *
     * @returns The current builder instance reference for method chaining.
     */
    public bindFactory<K extends keyof TypeMap>(
        type: K,
        factory: TTypeFactory<TypeMap, K>,
        options?: TFactoryBindingOptions,
    ): this {
        if (this._types.has(type)) {
            if (options?.ifConflict === "keep") return this;
            if (options?.ifConflict !== "replace")
                throw new Error(Errors.BindingConflict(type.toString()));
        }

        const lifecycle: TLifecycle = validateLifecycle(options?.lifecycle)
            ? options.lifecycle
            : "singleton";

        const entry: TTypeFactoryEntry<TypeMap, K> = {
            type,
            factory,
            lifecycle,
        };
        this._types.set(type, entry);
        return this;
    }

    /**
     * Finalizes configuration and creates an immutable container.
     *
     * This method ensures all bindings are properly registered and no invalid configurations remain.
     * The resulting container is immutable, preventing further modifications to bindings or services.
     * @throws {Error} If the builder has no bindings, to prevent the creation of an unusable container.
     *
     * @returns An immutable container instance ready for dependency resolution
     */
    public build(): DIContainer<TypeMap> {
        if (this._types.size === 0) throw new Error(Errors.EmptyContainer);
        const registrar = new Registrar(this._types);
        return new DIContainer(registrar);
    }
}
