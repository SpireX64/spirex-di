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

    AliasCycle: (aliasStack) =>
        `Alias resolution cycle detected: ${aliasStack.join(" -> ")}`,

    AliasMissingRef: (aliasId, originId) =>
        `Alias "${aliasId}" refers to non-existent type binding "${originId}".`,

    MiddlewareEntryTypeMismatch: (middlewareName, newEntryId, originEntryId) =>
        `Middleware "${middlewareName || "unnamed"}" altered the entry type: Expected '${originEntryId}', but received '${newEntryId}`,

    TypeBindingNotFound: (type, name) =>
        `Type binding ${type}${name ? ` with name "${name}` : ""} not found.`,
});

/** A char used to separate the type and name in the unique ID of a binding */
var ID_SEP = "$";

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
    /**
     * Resolves the final target entry ID for a given type and optional name,
     * following any alias chains.
     *
     * @param type - The type key to resolve.
     * @param name - Optional binding name.
     * @param aliasId - Optional starting alias ID.
     * @return The resolved binding entry ID, or undefined if not found.
     *
     * @throws {DIErrors.AliasCycle} when an alias cycle is detected
     */
    function resolveEntryId(type, name, aliasId) {
        var $id,
            aliasStack = [];
        if (aliasId) aliasStack.push(aliasId);
        for (
            var $alias = makeEntryId(type, name);
            $alias;
            $alias = aliases.get($alias)
        ) {
            var isCycle = aliasStack.includes($alias);
            aliasStack.push($alias);
            if (isCycle) throw new Error(DIErrors.AliasCycle(aliasStack));
            $id = $alias;
        }
        return $id;
    }

    function hasMiddleware(middleware) {
        return middlewares.has(middleware);
    }

    function addMiddleware(middleware) {
        middlewares.add(middleware);
    }

    function getAliasOrigin(type, name) {
        return aliases.get(makeEntryId(type, name));
    }

    function hasEntry(type, name) {
        return entries.has(resolveEntryId(type, name));
    }

    function findEntry(type, name) {
        var $id = resolveEntryId(type, name);
        var binding = entries.get($id);
        if (!binding || isTypeEntry(binding)) return binding;
        return binding.values().next().value;
    }

    function findAllEntries(type, name) {
        var typeEntry = entries.get(resolveEntryId(type, name));
        if (!typeEntry) return [];
        if (isTypeEntry(typeEntry)) return Array.of(typeEntry);
        return Array.from(typeEntry);
    }

    function addAlias(aliasId, originType, originName) {
        resolveEntryId(originType, originName, aliasId);
        aliases.set(aliasId, makeEntryId(originType, originName));
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
     * @param entry - entry The type binding entry to store.
     * @param multibinding - Allows multiple entries under the same type. Otherwise, the new entry replaces the existing one.
     *
     * @internal
     */
    function addTypeEntry(entry, multibinding) {
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

        var existingEntry = entries.get(entryToBind.$id);
        if (!existingEntry || !multibinding) {
            // No existing entry, or multibinding not enabled:
            // simply store the new entry (replacing any existing one).
            entries.set(entryToBind.$id, entryToBind);
        } else if (isTypeEntry(existingEntry)) {
            // Existing entry is a single binding:
            // convert it to a Set and add both the old and new entries.
            entries.set(
                entryToBind.$id,
                new Set().add(existingEntry).add(entryToBind),
            );
        } else {
            // Existing entry is already a Set:
            // add the new entry to the existing set.
            existingEntry.add(entryToBind);
        }
    }

    function verifyAliases() {
        aliases.forEach(($origin, $alias, map) => {
            var realOriginId = resolveEntryId($origin);

            // Verify alias origin type binding
            if (!entries.has(realOriginId))
                throw new Error(DIErrors.AliasMissingRef($alias, realOriginId));

            // Optimize alias reference
            if (realOriginId !== $origin) map.set($alias, realOriginId);
        });
    }

    // endregion: PUBLIC METHODS

    return {
        entries,
        aliases,
        middlewares,
        hasMiddleware,
        hasEntry,
        findEntry,
        findAllEntries,
        addMiddleware,
        getAliasOrigin,
        addAlias,
        addTypeEntry,
        verifyAliases,
    };
}

function createRootContainerScope(blueprint) {
    const scopePrototype = {
        get(type, name) {
            var entry = blueprint.findEntry(type, name);
            if (!entry)
                throw new Error(DIErrors.TypeBindingNotFound(type, name));
            if (entry.instance) return entry.instance;
            return entry.factory(this);
        },
    };

    return Object.setPrototypeOf({ id: "" }, scopePrototype);
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
     * @returns `true` if the binding should be skipped; `false` if it can proceed.
     *
     * @throws {DIErrors.BindingConflict} If a binding conflict exists and the strategy is `"throw"` or undefined.
     * @internal
     */
    function verifyBinding(id, strategy) {
        if (blueprint.entries.has(id) || blueprint.aliases.has(id)) {
            strategy ||= defaultConflictResolve;
            if (strategy === "keep") return true;
            if (!strategy || strategy === "throw")
                throw new Error(DIErrors.BindingConflict(id));
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
        if (verifyBinding($id, ifConflict)) return this;
        blueprint.addTypeEntry(
            {
                $id,
                type,
                name: options && options.name,
                factory,
                lifecycle: (options && options.lifecycle) || defaultLifecycle,
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
        if (verifyBinding($aliasId, options && options.ifConflict)) return this;
        blueprint.addAlias($aliasId, originType, options && options.originName);
        return this;
    }

    function use(middleware) {
        blueprint.addMiddleware(middleware);
        return this;
    }

    function build() {
        // Aliases verification
        blueprint.verifyAliases();

        // Required types verification
        requiredTypes.forEach(($id) => {
            if (!blueprint.entries.has($id) && !blueprint.aliases.has($id))
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
