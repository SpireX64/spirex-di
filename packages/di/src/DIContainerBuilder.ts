import type {
    TBindingOptions,
    TEntryId,
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
import { InstanceActivator } from "./internal/InstanceActivator";
import { makeEntryId } from "./internal/utils";

const Errors = {
    EmptyContainer:
        "Container building failed. Cannot create a container without bindings. " +
        "Please bind at least one service or value using 'bindInstance' or 'bindFactory'.",
    BindingConflict: (type: string) =>
        `Binding conflict. The type '${type}' is already bound.`,
} as const;

export class DIContainerBuilder<TypeMap extends TTypeMapBase> {
    private readonly _types: TTypeEntriesMap<TypeMap> = new Map();

    public findTypeEntry<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): TTypeEntry<TypeMap, Key> | null {
        return (
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            (this._types.get(makeEntryId(type, name))?.values().next()
                .value as TTypeEntry<TypeMap, Key>) ?? null
        );
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
        const $id: TEntryId = makeEntryId(type, options?.name);

        if (this._types.has($id)) {
            if (options?.ifConflict === "keep") return this;
            if (options?.ifConflict !== "replace")
                throw new Error(Errors.BindingConflict(type.toString()));
        }

        this.putEntry({
            $id,
            type,
            instance,
            name: options?.name,
        } as TTypeInstanceEntry<TypeMap, Key>);
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
        const $id: TEntryId = makeEntryId(type, options?.name);
        if (this._types.has($id)) {
            if (options?.ifConflict === "keep") return this;
            if (options?.ifConflict !== "replace")
                throw new Error(Errors.BindingConflict(type.toString()));
        }

        const lifecycle: TLifecycle = validateLifecycle(options?.lifecycle)
            ? options.lifecycle
            : "singleton";

        this.putEntry({
            $id,
            type,
            factory,
            lifecycle,
            name: options?.name,
        } as TTypeFactoryEntry<TypeMap, K>);
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
        return new DIContainer(
            new Registrar(this._types),
            new InstanceActivator<TypeMap>(),
        );
    }

    private putEntry<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
        single = true,
    ): void {
        const entrySet = this._types.get(entry.$id);
        if (entrySet) {
            if (single) entrySet.clear();
            entrySet.add(entry);
        } else {
            this._types.set(
                entry.$id,
                new Set<TTypeEntry<TypeMap, keyof TypeMap>>().add(entry),
            );
        }
    }
}
