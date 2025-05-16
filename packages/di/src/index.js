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
    AliasCycle: (aliasStack) =>
        `Alias resolution cycle detected: ${aliasStack.join(" -> ")}`,
    AliasMissingRef: (aliasId, originId) =>
        `Alias "${aliasId}" refers to non-existent type binding "${originId}".`,
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
        "$id" in mayBeTypeEntry
    );
}

export function createContainerBuilder(builderOptions) {
    /** The default lifecycle to use when a binding does not explicitly define one. */
    var defaultLifecycle =
        (builderOptions && builderOptions.lifecycle) || "singleton";

    /** The default conflict resolution strategy to use for bindings. */
    var defaultConflictResolve =
        (builderOptions && builderOptions.ifConflict) || "throw";

    /** Internal map of registered type bindings */
    var entries = new Map();

    /** Internal map of registered alias entries. */
    var aliases = new Map();

    // region INTERNAL METHODS

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
    function putEntry(entry, multibinding) {
        Object.freeze(entry);

        var existingEntry = entries.get(entry.$id);
        if (!existingEntry || !multibinding) {
            // No existing entry, or multibinding not enabled:
            // simply store the new entry (replacing any existing one).
            entries.set(entry.$id, entry);
        } else if (isTypeEntry(existingEntry)) {
            // Existing entry is a single binding:
            // convert it to a Set and add both the old and new entries.
            entries.set(entry.$id, new Set().add(existingEntry).add(entry));
        } else {
            // Existing entry is already a Set:
            // add the new entry to the existing set.
            existingEntry.add(entry);
        }
    }

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
        if (entries.has(id) || aliases.has(id)) {
            strategy ||= defaultConflictResolve;
            if (strategy === "keep") return true;
            if (!strategy || strategy === "throw")
                throw new Error(DIErrors.BindingConflict(id));
        }
        return false;
    }

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
     * @internal
     */
    function resolveEntryId(type, name, aliasId) {
        var $id;
        var aliasStack = [];
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

    // endregion INTERNAL METHODS

    // region PUBLIC METHODS

    function hasEntry(type, name) {
        return entries.has(resolveEntryId(type, name));
    }

    function findEntry(type, name) {
        var binding = entries.get(resolveEntryId(type, name));

        // Return the binding if it doesn't exist (undefined)
        // or if it's a single binding entry
        if (!binding || isTypeEntry(binding)) return binding;

        // Binding is a Set (multibinding), just return the first entry
        return binding.values().next().value;
    }

    function findAllEntries(type, name) {
        var typeEntry = entries.get(resolveEntryId(type, name));
        if (!typeEntry) return [];
        if (isTypeEntry(typeEntry)) return Array.of(typeEntry);
        return Array.from(typeEntry);
    }

    function getAlias(type, name) {
        return aliases.get(makeEntryId(type, name));
    }

    function bindInstance(type, instance, options) {
        var $id = makeEntryId(type, options && options.name);
        var ifConflict = options && options.ifConflict;
        if (verifyBinding($id, ifConflict)) return this;
        putEntry(
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
        putEntry(
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

    function bindAlias(type, originType, options) {
        var $aliasId = makeEntryId(type, options && options.name);
        if (verifyBinding($aliasId, options && options.ifConflict)) return this;

        // Check alias reference cycle
        resolveEntryId(originType, options && options.originName, $aliasId);

        aliases.set(
            $aliasId,
            makeEntryId(originType, options && options.originName),
        );
        return this;
    }

    function build() {
        // Aliases verification
        aliases.forEach(($origin, $alias, map) => {
            var realOriginId = resolveEntryId($origin);

            // Verify alias origin type binding
            if (!entries.has(realOriginId))
                throw new Error(DIErrors.AliasMissingRef($alias, realOriginId));

            // Optimize alias reference
            if (realOriginId !== $origin) map.set($alias, realOriginId);
        });

        return {};
    }

    // endregion PUBLIC METHODS

    return {
        hasEntry,
        findEntry,
        findAllEntries,
        getAlias,
        bindInstance,
        bindFactory,
        bindAlias,
        build,
    };
}
