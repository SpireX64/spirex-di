/** A char used to separate the type and name in the unique ID of a binding */
var ID_SEP = "$";

function chainToString(chain, key) {
    var sep = " -> ";
    return chain.length > 2
        ? chain.map((it) => (it === key ? `[${it}]` : it)).join(sep)
        : key + sep + key;
}

/**
 * A centralized dictionary of all error messages.
 *
 * This object provides reusable and consistent error messages for common failure scenarios
 * Many messages are defined as functions to allow dynamic insertion of context-specific details
 * (e.g. type names or scope paths).
 *
 * All values are frozen to ensure immutability and prevent accidental modification at runtime.
 *
 * @example
 * throw new Error(DIErrors.BindingConflict('MyService'));
 */
export var DIErrors = Object.freeze({
    BindingConflict: (type) =>
        `Binding conflict. The type '${type}' is already bound.`,

    MissingRequiredTypeError: (type) => `Required type "${type}" is not bound.`,

    AliasCycle: (alias, aliasChain) =>
        `Alias resolution cycle detected: ${chainToString(aliasChain, alias)}`,

    AliasMissingRef: (aliasId, originId) =>
        `Alias "${aliasId}" refers to non-existent type binding "${originId}".`,

    MiddlewareEntryTypeMismatch: (middlewareName, newEntryId, originEntryId) =>
        `Middleware "${middlewareName || "unnamed"}" altered the entry type: Expected '${originEntryId}', but received '${newEntryId}`,

    TypeBindingNotFound: (type, name) =>
        `Type binding ${type}${name ? ` with name "${name}` : ""} not found.`,

    DependenciesCycle: (entryType, chain) =>
        `Activation failed: A cyclic dependency was detected while resolving type '${entryType}' (Activation chain: ${chainToString(chain, entryType)})`,

    MixedLifecycleBindings: (type, lifecycleA, lifecycleB) =>
        `Mixed lifecycle bindings detected for type "${type}": ${lifecycleA}, ${lifecycleB}`,
});

/**
 * Creates a unique identifier string for a binding entry based on its type and optional name.
 *
 * The ID is used internally to distinguish bindings, including support for named bindings.
 * This ID is stored in the `$id` field of a binding entry and is used as the internal key.
 *
 * @param type - The type token of the binding.
 * @param name - Optional name for the binding (used for named bindings).
 * @return A unique string identifier for the binding.
 */
function makeEntryId(type, name) {
    return !!name ? type + ID_SEP + name : type;
}

function isTypeEntry(mayBeTypeEntry) {
    return (
        mayBeTypeEntry &&
        typeof mayBeTypeEntry === "object" &&
        "$id" in mayBeTypeEntry &&
        "type" in mayBeTypeEntry
    );
}

function createContainerBlueprint() {
    /** Map of registered type bindings */
    var entries = new Map();
    /** Map of registered alias entries. */
    var aliases = new Map();
    /** Set of registered container middlewares. */
    var middlewares = new Set();

    // region: PUBLIC METHODS
    function hasMiddleware(middleware) {
        return middlewares.has(middleware);
    }

    function addMiddleware(middleware) {
        middlewares.add(middleware);
    }

    function getAliasOrigin(type, name) {
        var id = makeEntryId(type, name);
        var ref = aliases.get(id);
        if (typeof ref === "object") return Array.from(ref.values());
        if (!ref) {
            var entry = entries.get(id);
            if (isTypeEntry(entry)) return entry.$id;
            else if (entry) return entry.values().next().value.$id;
        }
        return ref;
    }

    function has(type, name) {
        var id = makeEntryId(type, name);
        return entries.has(id) || aliases.has(id);
    }

    function findEntry(type, name) {
        var $id = makeEntryId(type, name);
        var binding = entries.get($id);
        if (!binding || isTypeEntry(binding)) return binding;
        return binding.values().next().value;
    }

    function findAlias(type, name) {
        var $id = makeEntryId(type, name);
        var alias = aliases.get($id);
        if (!alias || typeof alias === "string") return alias;
        return alias.values().next().value;
    }

    function findAllEntries(type, name) {
        var typeEntry = entries.get(makeEntryId(type, name));
        if (!typeEntry) return [];
        if (isTypeEntry(typeEntry)) return Array.of(typeEntry);
        return Array.from(typeEntry);
    }

    function forEach(delegate) {
        entries.forEach((entry) => {
            if (isTypeEntry(entry)) {
                delegate(entry);
            } else {
                entry.forEach(delegate);
            }
        });
    }

    function addAlias(aliasId, originType, originName, multibinding) {
        var originId = makeEntryId(originType, originName);
        var existingAlias = aliases.get(aliasId);
        if (!existingAlias || !multibinding) {
            // No exist alias, or multibinding not enabled:
            // simply store the new alias by replacing any existing one
            aliases.set(aliasId, originId);
        } else if (typeof existingAlias === "string") {
            // Existing alias is a single reference
            // convert it to a Set and put both references into
            aliases.set(aliasId, new Set().add(existingAlias).add(originId));
        } else {
            // Existing alias already targeting to many references
            // add new entry to the existing Set
            existingAlias.add(originId);
        }
    }

    /**
     * Adds a type entry in the registry.
     * All entries are frozen to ensure immutability.
     *
     * When `multibinding` is `false` or not set, the entry replaces any existing entry with the same `$id`.
     * When `multibinding` is `true` and an entry with the same `$id` already exists:
     * - If the existing entry is a single binding, it will be converted into a `Set` containing both the old and new entries.
     * - If the existing entry is already a `Set` (i.e. multibinding), the new entry is added to the set.
     *
     * @param id - unique entry identifier
     * @param entry - entry The type binding entry to store.
     * @param multibinding - Allows multiple entries under the same type. Otherwise, the new entry replaces the existing one.
     *
     * @internal
     */
    function addTypeEntry(id, entry, multibinding) {
        var entryToBind = entry;
        middlewares.forEach((middleware) => {
            if (middleware.onBind) {
                entryToBind = middleware.onBind(entryToBind, entry);
                if (
                    !entryToBind ||
                    !isTypeEntry(entryToBind) ||
                    entryToBind.$id !== entry.$id ||
                    entryToBind.type !== entry.type
                ) {
                    throw new Error(
                        DIErrors.MiddlewareEntryTypeMismatch(
                            middleware.name,
                            entryToBind && entryToBind.$id,
                            entry.$id,
                        ),
                    );
                }
            }
        });

        Object.freeze(entryToBind);

        var existingEntry = entries.get(id);
        if (!existingEntry || !multibinding) {
            // No existing entry, or multibinding not enabled:
            // simply store the new entry (replacing any existing one).
            entries.set(id, entryToBind);
        } else if (isTypeEntry(existingEntry)) {
            // Existing entry is a single binding:
            // convert it to a Set and add both the old and new entries.
            entries.set(id, new Set().add(existingEntry).add(entryToBind));
        } else {
            // Existing entry is already a Set:
            // add the new entry to the existing set.
            existingEntry.add(entryToBind);
        }
    }

    function compileAliasRef(aliasRef, stack) {
        if (typeof aliasRef === "string") {
            if (stack.includes(aliasRef)) {
                stack.push(aliasRef);
                throw new Error(DIErrors.AliasCycle(aliasRef, stack));
            }

            var ref = aliases.get(aliasRef);
            if (ref !== undefined) {
                stack.push(aliasRef);
                compileAliasRef(ref, stack);
                stack.pop();
            } else {
                var typeEntry = entries.get(aliasRef);
                if (typeEntry !== undefined) {
                    stack.push(aliasRef);
                    for (var aliasId of stack) {
                        if (isTypeEntry(typeEntry)) {
                            addTypeEntry(aliasId, typeEntry, true);
                        } else {
                            for (var entry of typeEntry) {
                                addTypeEntry(aliasId, entry, true);
                            }
                        }
                    }

                    stack.pop();
                } else
                    throw new Error(
                        DIErrors.AliasMissingRef(
                            stack[stack.length - 1],
                            aliasRef,
                        ),
                    );
            }
        } else if (aliasRef instanceof Set) {
            for (var ref of aliasRef) compileAliasRef(ref, stack);
        } else {
            throw new Error(
                DIErrors.AliasMissingRef(stack[stack.length - 1], aliasRef),
            );
        }
    }

    function compileAliases() {
        var stack = [];

        for (var [aliasId, ref] of aliases) {
            if (entries.has(aliasId)) continue;
            stack.push(aliasId);
            compileAliasRef(ref, stack);
            stack.pop();
        }

        aliases.clear();
    }

    // endregion: PUBLIC METHODS

    return {
        entries,
        aliases,
        middlewares,
        hasMiddleware,
        hasEntry,
        findEntry,
        findAlias,
        findAllEntries,
        forEach,
        addMiddleware,
        getAliasOrigin,
        addAlias,
        addTypeEntry,
        compileAliases,
    };
}

function createRootContainerScope(blueprint) {
    // The activation stack is used to track the chain of type activations
    // to detect circular dependencies during instance creation
    var activationStack = [];

    /**
     * Activates (creates) an instance for a given type entry.
     *
     * Tracks the current activation path using a stack to detect and prevent circular dependencies.
     *
     * @param entry - The type entry to activate. Must contain a factory function and optional cached instance.
     * @param scope - The current container scope, used to resolve dependencies during factory execution.
     *
     * @return The created instance associated with the entry.
     */
    function activateInstance(entry, scope) {
        // Check for circular dependency by verifying if the entry is already being activated
        var hasDependencyCycle = activationStack.includes(entry);

        // Push the current entry to the activation stack
        activationStack.push(entry);

        if (hasDependencyCycle) {
            // If a cycle is detected, throw a detailed error
            var error = new Error(
                DIErrors.DependenciesCycle(
                    entry.$id,
                    activationStack.map((it) => it.$id),
                ),
            );

            // Clear the activation stack to avoid residual state
            activationStack.length = 0;
            throw error;
        }

        // Call the factory to create the instance, passing the current scope as resolver
        var instance = entry.factory(scope);

        // Remove the entry from the activation stack after successful creation
        activationStack.pop();

        return instance;
    }

    function getInstance(scope, entry) {
        // Return the directly bound instance, if any (from bindInstance)
        if (entry.instance) return entry.instance;

        // Attempt to get cached instance from current scope
        var instance =
            scope.locals.get(entry) || activateInstance(entry, scope);

        // Cache the instance in scope locals if lifecycle is not transient
        if (entry.lifecycle !== "transient") scope.locals.set(entry, instance);

        return instance;
    }

    var scopePrototype = {
        get(type, name) {
            var entry = blueprint.findEntry(type, name);
            if (!entry)
                throw new Error(DIErrors.TypeBindingNotFound(type, name));
            return getInstance(this, entry);
        },

        maybe(type, name) {
            var entry = blueprint.findEntry(type, name);
            if (entry) return getInstance(this, entry);
            return undefined;
        },

        getAll(type, name) {
            return blueprint
                .findAllEntries(type, name)
                .map(getInstance.bind(this, this));
        },
    };

    var rootScope = Object.setPrototypeOf(
        { id: "", locals: new Map() },
        scopePrototype,
    );

    // Singletons activation
    blueprint.forEach((typeEntry) => {
        if (
            // Instance is not defined
            typeEntry.instance === undefined &&
            // Has factory function
            typeEntry.factory &&
            // It is singleton binding
            typeEntry.lifecycle === "singleton" &&
            // Not activated yet
            !rootScope.locals.has(typeEntry)
        ) {
            rootScope.locals.set(
                typeEntry,
                activateInstance(typeEntry, rootScope),
            );
        }
    });

    return rootScope;
}

export function createContainerBuilder(builderOptions) {
    /** The default lifecycle to use when a binding does not explicitly define one. */
    var defaultLifecycle =
        (builderOptions && builderOptions.lifecycle) || "singleton";

    /** The default conflict resolution strategy to use for bindings. */
    var defaultConflictResolve =
        (builderOptions && builderOptions.ifConflict) || "throw";

    var blueprint = createContainerBlueprint();

    var requiredTypes = new Set();

    // region INTERNAL METHODS

    /**
     * Verifies whether a binding for the given type already exists in the container,
     * and applies the specified conflict resolution strategy.
     *
     * - If the strategy is `"keep"`, the function returns `true` to indicate that the binding should be skipped.
     * - If the strategy is `"throw"` or not provided, and a conflict exists, an error is thrown.
     * - If no conflict exists, returns `false` to allow the binding to proceed.
     *
     * @param id The unique type identifier to check for existing bindings.
     * @param strategy The strategy to use if a binding already exists.
     * @param lifecycle (Optional) factory binding lifecycle
     * @returns `true` if the binding should be skipped; `false` if it can proceed.
     *
     * @throws {DIErrors.BindingConflict} If a binding conflict exists and the strategy is `"throw"` or undefined.
     * @internal
     */
    function verifyBinding(id, strategy, lifecycle) {
        var isAlias = false;
        var existEntry = blueprint.findEntry(id);
        if (!existEntry) {
            existEntry = blueprint.findAlias(id);
            isAlias = true;
        }

        if (existEntry) {
            strategy ||= defaultConflictResolve;
            if (strategy === "keep") return true;
            if (!strategy || strategy === "throw")
                throw new Error(DIErrors.BindingConflict(id));

            // Check lifecycle consistency
            // Only applies when appending to an existing binding
            // Skip if either binding is an instance (have no lifecycle)
            if (
                !isAlias &&
                strategy === "append" &&
                lifecycle &&
                existEntry.lifecycle &&
                existEntry.lifecycle !== lifecycle
            ) {
                throw new Error(
                    DIErrors.MixedLifecycleBindings(
                        id,
                        existEntry.lifecycle,
                        lifecycle,
                    ),
                );
            }
        }
        return false;
    }

    // endregion INTERNAL METHODS

    // region PUBLIC METHODS

    function requireType(type, name) {
        requiredTypes.add(makeEntryId(type, name));
        return this;
    }

    function bindInstance(type, instance, options) {
        var $id = makeEntryId(type, options && options.name);
        var ifConflict = options && options.ifConflict;
        if (verifyBinding($id, ifConflict, 'singleton')) return this;
        blueprint.addTypeEntry(
            $id,
            {
                $id,
                type,
                name: options && options.name,
                instance,
            },
            ifConflict === "append",
        );
        return this;
    }

    function bindFactory(type, factory, options) {
        var $id = makeEntryId(type, options && options.name);
        var ifConflict = options && options.ifConflict;
        var lifecycle = (options && options.lifecycle) || defaultLifecycle;
        if (verifyBinding($id, ifConflict, lifecycle)) return this;
        blueprint.addTypeEntry(
            $id,
            {
                $id,
                type,
                name: options && options.name,
                factory,
                lifecycle,
            },
            ifConflict === "append",
        );
        return this;
    }

    function when(condition, delegate) {
        if (condition) delegate(this);
        return this;
    }

    function bindAlias(type, originType, options) {
        var $aliasId = makeEntryId(type, options && options.name);
        var ifConflict = options && options.ifConflict;
        if (verifyBinding($aliasId, ifConflict)) return this;
        blueprint.addAlias(
            $aliasId,
            originType,
            options && options.originName,
            ifConflict === "append",
        );
        return this;
    }

    function use(middleware) {
        blueprint.addMiddleware(middleware);
        return this;
    }

    function build() {
        // Compile aliases
        blueprint.compileAliases();

        // Required types verification
        requiredTypes.forEach(($id) => {
            if (!blueprint.entries.has($id))
                throw new Error(DIErrors.MissingRequiredTypeError($id));
        });

        return createRootContainerScope(blueprint);
    }

    // endregion PUBLIC METHODS

    return {
        hasMiddleware: blueprint.hasMiddleware,
        hasEntry: blueprint.hasEntry,
        findEntry: blueprint.findEntry,
        findAllEntries: blueprint.findAllEntries,
        getAliasOrigin: blueprint.getAliasOrigin,
        requireType,
        bindInstance,
        bindFactory,
        bindAlias,
        when,
        use,
        build,
    };
}
