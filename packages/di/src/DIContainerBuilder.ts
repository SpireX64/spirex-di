import type {
    IContainerBuilderBinder,
    IContainerBuilderExplorer,
    TBindingOptions,
    TEntryId,
    TFactoryBindingOptions,
    TLifecycle,
    TTypeEntry,
    TTypeFactory,
    TTypeFactoryEntry,
    TTypeInstanceEntry,
    TTypeMapBase,
    TTypesConflictResolve,
} from "./types";
import type { TTypeEntriesMap } from "./internal/types";
import { validateLifecycle } from "./internal/validators";
import { DIContainer } from "./DIContainer";
import { Registrar } from "./internal/Registrar";
import { InstanceActivator } from "./internal/InstanceActivator";
import { checkIsTypeEntryMapItem, makeEntryId } from "./internal/utils";

const Errors = {
    EmptyContainer:
        "Container building failed. Cannot create a container without bindings. " +
        "Please bind at least one service or value using 'bindInstance' or 'bindFactory'.",
    BindingConflict: (type: string) =>
        `Binding conflict. The type '${type}' is already bound.`,
} as const;

export class DIContainerBuilder<TypeMap extends TTypeMapBase>
    implements
        IContainerBuilderBinder<TypeMap>,
        IContainerBuilderExplorer<TypeMap>
{
    private readonly _types: TTypeEntriesMap<TypeMap> = new Map();

    // region IContainerBuilderExplorer

    public hasEntry<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): boolean {
        return this._types.has(makeEntryId(type, name));
    }

    public findSomeTypeEntry<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): TTypeEntry<TypeMap, Key> | null {
        const item = this._types.get(makeEntryId(type, name)) || null;
        if (!item || checkIsTypeEntryMapItem(item))
            return item as TTypeEntry<TypeMap, Key>;
        return item.values().next().value as TTypeEntry<TypeMap, Key>;
    }

    public findAllTypeEntries<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): readonly TTypeEntry<TypeMap, Key>[] {
        const item = this._types.get(makeEntryId(type, name)) || null;
        if (!item) return [];
        if (checkIsTypeEntryMapItem(item))
            return Array.of(item as TTypeEntry<TypeMap, Key>);
        return Array.from(item) as TTypeEntry<TypeMap, Key>[];
    }

    // endregion IContainerBuilderExplorer

    // region IContainerBuilderBinder

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
        if (this.validateBinding($id, options?.ifConflict)) return this;

        this.putEntry(
            {
                $id,
                type,
                instance,
                name: options?.name,
            } as TTypeInstanceEntry<TypeMap, Key>,
            options?.ifConflict === "append",
        );
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
        if (this.validateBinding($id, options?.ifConflict)) return this;

        const lifecycle: TLifecycle = validateLifecycle(options?.lifecycle)
            ? options.lifecycle
            : "singleton";

        this.putEntry(
            {
                $id,
                type,
                factory,
                lifecycle,
                name: options?.name,
            } as TTypeFactoryEntry<TypeMap, K>,
            options?.ifConflict === "append",
        );
        return this;
    }

    // endregion IContainerBuilderBinder

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

    /** @internal */
    private putEntry<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
        append: boolean,
    ): void {
        const item = this._types.get(entry.$id);
        if (!item || !append) this._types.set(entry.$id, entry);
        else {
            if (checkIsTypeEntryMapItem(item)) {
                this._types.set(
                    entry.$id,
                    new Set<TTypeEntry<TypeMap, keyof TypeMap>>()
                        .add(item)
                        .add(entry),
                );
            } else item.add(entry);
        }
    }

    /** @internal */
    private validateBinding(
        $id: TEntryId,
        strategy?: TTypesConflictResolve,
    ): boolean {
        if (this._types.has($id)) {
            if (strategy === "keep") return true;
            if (!strategy || strategy === "throw")
                throw new Error(Errors.BindingConflict($id));
        }
        return false;
    }
}
