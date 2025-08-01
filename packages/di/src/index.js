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

    SealedScope: (sealedScope, childScope) =>
        `Cannot create child scope "${childScope}" from sealed scope "${sealedScope}"`,
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
        return ref instanceof Set ? Array.from(ref.values()) : ref;
    }

    function has(type, name) {
        var id = makeEntryId(type, name);
        return entries.has(id) || aliases.has(id);
    }

    function findEntry(type, name) {
        var $id = makeEntryId(type, name);
        var binding = entries.get($id);
        return !binding || isTypeEntry(binding)
            ? binding
            : binding.values().next().value;
    }

    function findAlias(type, name) {
        var $id = makeEntryId(type, name);
        var alias = aliases.get($id);
        return !alias || typeof alias === "string"
            ? alias
            : alias.values().next().value;
    }

    function findAllEntries(type, name) {
        var typeEntry = entries.get(makeEntryId(type, name));
        if (!typeEntry) return [];

        return isTypeEntry(typeEntry)
            ? Array.of(typeEntry)
            : Array.from(typeEntry);
    }

    function forEach(delegate) {
        entries.forEach((entry) => {
            if (isTypeEntry(entry)) delegate(entry);
            else entry.forEach(delegate);
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
            if (!middleware.onBind) return;

            entryToBind = middleware.onBind(entryToBind, entry);
            if (
                !entryToBind ||
                !isTypeEntry(entryToBind) ||
                entryToBind.$id !== entry.$id ||
                entryToBind.type !== entry.type
            )
                throw new Error(
                    DIErrors.MiddlewareEntryTypeMismatch(
                        middleware.name,
                        entryToBind && entryToBind.$id,
                        entry.$id,
                    ),
                );
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
        if (typeof aliasRef !== "string") {
            for (var ref of aliasRef) compileAliasRef(ref, stack);
            return;
        }

        if (stack.includes(aliasRef)) {
            stack.push(aliasRef);
            throw new Error(DIErrors.AliasCycle(aliasRef, stack));
        }

        var ref = aliases.get(aliasRef);
        if (ref !== undefined) {
            stack.push(aliasRef);
            compileAliasRef(ref, stack);
            stack.pop();
            return;
        }

        var typeEntry = entries.get(aliasRef);
        if (typeEntry === undefined)
            throw new Error(
                DIErrors.AliasMissingRef(stack[stack.length - 1], aliasRef),
            );

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
    }

    function compileAliases() {
        if (!aliases.size) return;

        var stack = [];
        for (var [aliasId, ref] of aliases) {
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
        has,
        hasMiddleware,
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
    var $root = Symbol("root");
    var $parent = Symbol("parent");
    var $scopes = Symbol("scopes");
    var $locals = Symbol("locals");

    function createScopeObject(id, parent, options) {
        return {
            id,
            sealed: (options && options.sealed) || false,
            isolated: (options && options.isolated) || false,
            [$root]: parent && (parent[$root] || parent),
            [$parent]: parent,
            [$locals]: new Map(),
            [$scopes]: new Map(),
        };
    }

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
        var instance =
            "injector" in entry
                ? entry.factory(entry.injector(scope))
                : entry.factory(scope);

        // Call 'OnActivated' middleware
        blueprint.middlewares.forEach((middleware) => {
            if (middleware.onActivated)
                instance = middleware.onActivated(entry, instance);
        });

        // Remove the entry from the activation stack after successful creation
        activationStack.pop();

        return instance;
    }

    function getInstance(scope, entry) {
        var instance;

        // Return the directly bound instance, if any (from bindInstance)
        if (entry.instance) instance = entry.instance;
        else if (
            scope[$parent] &&
            (entry.lifecycle === "singleton" || entry.lifecycle === "lazy")
        )
            // Direct singleton access from the root
            instance = getInstance(scope[$root], entry);
        else {
            if (!scope.isolated) {
                // If scope is not isolated, search up the parent chain
                // to find an already created instance of this entry (no new instantiation)
                for (
                    var parent = scope[$parent];
                    parent && !instance;
                    parent = parent[$parent]
                ) {
                    instance = parent[$locals].get(entry);
                    // If parent is isolated, we can't go any higher.
                    if (parent.isolated) break;
                }
            }

            if (!instance) {
                // Attempt to get cached instance from current scope
                instance =
                    scope[$locals].get(entry) || activateInstance(entry, scope);

                // Cache the instance in scope locals if lifecycle is not transient
                if (entry.lifecycle !== "transient")
                    scope[$locals].set(entry, instance);
            }
        }
        blueprint.middlewares.forEach((middleware) => {
            if (middleware.onResolve)
                instance = middleware.onResolve(entry, instance);
        });
        return instance;
    }

    function onRequestMiddleware(scope, entry, type, name) {
        blueprint.middlewares.forEach((middleware) => {
            if (middleware.onRequest)
                middleware.onRequest(entry, scope, type, name);
        });
        return entry;
    }

    var scopePrototype = Object.freeze({
        get(type, name) {
            var entry = blueprint.findEntry(type, name);
            if (!entry)
                throw new Error(DIErrors.TypeBindingNotFound(type, name));
            
            onRequestMiddleware(this, entry, type, name);
            return getInstance(this, entry);
        },

        maybe(type, name) {
            var entry = blueprint.findEntry(type, name);
            if (!entry) return undefined

            onRequestMiddleware(this, entry, type, name);
            return getInstance(this, entry);
        },

        getAll(type, name) {
            return blueprint
                .findAllEntries(type, name)
                .map(onRequestMiddleware)
                .map(getInstance.bind(this, this));
        },

        scope(id, options) {
            // Walk up the scope hierarchy to find a scope with the matching ID.
            // Used to return an already existing parent scope instead of creating a duplicate.
            for (var scope = this; scope; scope = scope[$parent])
                if (scope.id === id) return scope;

            // Disallow creating child scopes from sealed scope
            if (this.sealed) throw new Error(DIErrors.SealedScope(this.id, id));

            return Object.freeze(
                Object.setPrototypeOf(
                    createScopeObject(id, this, options),
                    Object.getPrototypeOf(this),
                ),
            );
        },
    });

    var rootScope = Object.freeze(
        Object.setPrototypeOf(createScopeObject(""), scopePrototype),
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
            !rootScope[$locals].has(typeEntry)
        ) {
            rootScope[$locals].set(
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

    var hasSomeSafeFactory = false;
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

        if (verifyBinding($id, ifConflict)) return this;

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

    function bindSafeFactory(type, injector, factory, options) {
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
                injector,
                factory,
                lifecycle,
            },
            ifConflict === "append",
        );
        hasSomeSafeFactory = true;
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

    function requireTypesFromSafeFactories() {
        if (!hasSomeSafeFactory) return;

        var dryRunScope = {
            get: (type, name) => (requireType(type, name), {}),
            maybe: () => undefined,
            getAll: () => [],
        };

        blueprint.entries.forEach((entry) => {
            if ("injector" in entry)
                try {
                    // Dry-run call to collect required types from safe factories.
                    // We only care about which types are accessed via `get(...)`.
                    // Any errors are ignored, as actual resolution is not performed here.
                    entry.injector(dryRunScope);
                } catch {
                    // Intentionally ignored — we're only interested in tracking type accesses.
                }
        });
    }

    function build() {
        // Compile aliases
        blueprint.compileAliases();

        // Collect required types from safe factories
        requireTypesFromSafeFactories();

        // Required types verification
        requiredTypes.forEach(($id) => {
            if (!blueprint.entries.has($id))
                throw new Error(DIErrors.MissingRequiredTypeError($id));
        });

        return createRootContainerScope(blueprint);
    }

    // endregion PUBLIC METHODS

    return {
        has: blueprint.has,
        hasMiddleware: blueprint.hasMiddleware,
        findEntry: blueprint.findEntry,
        findAllEntries: blueprint.findAllEntries,
        getAliasOrigin: blueprint.getAliasOrigin,
        requireType,
        bindInstance,
        bindFactory,
        bindSafeFactory,
        bindAlias,
        when,
        use,
        build,
    };
}
