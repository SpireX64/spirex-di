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
    IContainerConditionalBuilder,
    TContainerConditionalBuilderPredicate,
    TAliasDefinition,
    TContainerBuilderDefaults,
} from "./types";
import type { TTypeEntriesMap } from "./internal/types";
import { validateLifecycle } from "./internal/validators";
import { Registrar } from "./internal/Registrar";
import { InstanceActivator } from "./internal/InstanceActivator";
import { checkIsTypeEntryMapItem, makeEntryId } from "./internal/utils";
import { Errors } from "./errors";
import type { TAnyDIModule } from "./modules/types";
import { ModulesManager } from "./modules/ModulesManager";
import { DIScope, DIContainer } from "./DIScope";
import type { TContainerMiddleware } from "./middleware";

type TTypeRequirement<TypeMap extends TTypeMapBase> = {
    type: keyof TypeMap;
    name?: string;
};

export class DIContainerBuilder<TypeMap extends TTypeMapBase>
    implements
        IContainerBuilderBinder<TypeMap>,
        IContainerBuilderExplorer<TypeMap>,
        IContainerConditionalBuilder<TypeMap>
{
    private readonly _types: TTypeEntriesMap<TypeMap> = new Map();
    private readonly _modules = new ModulesManager();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _moduleContext: TAnyDIModule<any> | undefined;

    private readonly _middlewares = new Set<TContainerMiddleware>();

    private readonly _requiredTypes = new Set<TTypeRequirement<TypeMap>>();

    private readonly _aliasesMap = new Map<string, string>();

    private readonly _defaults: TContainerBuilderDefaults | null;

    public constructor(defaults?: TContainerBuilderDefaults) {
        this._defaults = defaults ?? null;
    }

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

    public requireType<T extends keyof TypeMap>(type: T, name?: string): this {
        this._requiredTypes.add({ type, name });
        return this;
    }

    public alias(definition: TAliasDefinition<TypeMap>): this {
        this._aliasesMap.set(
            makeEntryId(definition.asType, definition.asName),
            makeEntryId(definition.type, definition.name),
        );
        return this;
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
        const ifConflict = options?.ifConflict ?? this._defaults?.ifConflict;
        if (this.validateBinding($id, ifConflict)) return this;

        this.putEntry(
            {
                $id,
                type,
                instance,
                name: options?.name,
                scope: options?.scope,
                module: this._moduleContext,
            } as TTypeInstanceEntry<TypeMap, Key>,
            ifConflict === "append",
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
        const ifConflict = options?.ifConflict ?? this._defaults?.ifConflict;
        if (this.validateBinding($id, ifConflict)) return this;

        const lifecycle: TLifecycle = validateLifecycle(options?.lifecycle)
            ? options.lifecycle
            : (this._defaults?.factoryLifecycle ?? "singleton");

        this.putEntry(
            {
                $id,
                type,
                factory,
                lifecycle,
                name: options?.name,
                scope: options?.scope,
                module: this._moduleContext,
            } as TTypeFactoryEntry<TypeMap, K>,
            ifConflict === "append",
        );
        return this;
    }

    // endregion IContainerBuilderBinder

    public when(
        condition: TContainerConditionalBuilderPredicate<TypeMap> | boolean,
        delegate: (builder: IContainerBuilderBinder<TypeMap>) => void,
    ): this {
        if (typeof condition === "function" ? condition(this) : condition)
            delegate(this);

        return this;
    }

    public use(middleware: TContainerMiddleware): this {
        this._middlewares.add(middleware);
        return this;
    }

    public addModule<ModuleTypeMap extends TTypeMapBase>(
        module: TAnyDIModule<ModuleTypeMap>,
    ): DIContainerBuilder<TypeMap & ModuleTypeMap> {
        const builder = this as unknown as DIContainerBuilder<
            TypeMap & ModuleTypeMap
        >;
        if (this._modules.has(module)) return builder;

        this._moduleContext = module;
        if (module.type === "static") {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            module.builderDelegate(builder);
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            module.builderDelegate(builder, this._modules.getESModule(module));
        }
        this._modules.add(module);
        this._moduleContext = undefined;
        return builder;
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
        this.verifyRequiredTypes();
        return new DIScope(Symbol("global"), {
            middlewares: this._middlewares,
            registrar: new Registrar(this._types, this._aliasesMap),
            activator: new InstanceActivator<TypeMap>(),
            modules: this._modules,
        });
    }

    /** @internal */
    private putEntry<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
        append: boolean,
    ): void {
        let newEntry = entry;
        this._middlewares.forEach((middleware) => {
            if (middleware.onBind) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                newEntry = middleware.onBind(newEntry, entry);
                if (entry.$id !== newEntry.$id)
                    throw new Error(
                        Errors.MiddlewareEntryTypeMismatch(
                            middleware.name ?? "",
                            newEntry.$id,
                            entry.$id,
                        ),
                    );
            }
        });

        const item = this._types.get(newEntry.$id);
        Object.freeze(newEntry); // Make 'entry' readonly struct

        if (!item || !append) this._types.set(newEntry.$id, newEntry);
        else if (checkIsTypeEntryMapItem(item)) {
            this._types.set(
                newEntry.$id,
                new Set<TTypeEntry<TypeMap, keyof TypeMap>>()
                    .add(item)
                    .add(newEntry),
            );
        } else item.add(newEntry);
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

    private verifyRequiredTypes(): void {
        this._requiredTypes.forEach((requirement) => {
            const $id = makeEntryId(requirement.type, requirement.name);
            const entry = this._types.get($id);
            if (!entry)
                throw new Error(
                    Errors.MissingRequiredTypeError(
                        requirement.type.toString(),
                        requirement.name,
                    ),
                );
        });
    }
}
