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

export function createContainerBuilder(builderOptions) {
    var defaultLifecycle =
        (builderOptions && builderOptions.lifecycle) || "singleton";
    var defaultConflictResolve =
        (builderOptions && builderOptions.ifConflict) || "throw";

    /** The registry of type bindings */
    var entries = new Map();

    /** The map of type alias bindings */
    var aliases = new Map();

    // region INTERNAL METHODS

    /**
     * Adds a type entry in the registry
     * @internal
     */
    function putEntry(entry) {
        entries.set(entry.$id, Object.freeze(entry));
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
     * @throws {Error} If a binding conflict exists and the strategy is `"throw"` or undefined.
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
        return entries.get(resolveEntryId(type, name));
    }

    function bindInstance(type, instance, options) {
        var $id = makeEntryId(type, options && options.name);
        if (verifyBinding($id, options && options.ifConflict)) return this;
        putEntry({
            $id,
            type,
            name: options && options.name,
            instance,
        });
        return this;
    }

    function bindFactory(type, factory, options) {
        var $id = makeEntryId(type, options && options.name);
        if (verifyBinding($id, options && options.ifConflict)) return this;
        putEntry({
            $id,
            type,
            name: options && options.name,
            factory,
            lifecycle: (options && options.lifecycle) || defaultLifecycle,
        });
        return this;
    }

    function bindAlias(type, originType, options) {
        var $aliasId = makeEntryId(type, options && options.name);
        if (verifyBinding($aliasId, options && options.ifConflict)) return this;

        // Alias chain optimisation
        var $originId = resolveEntryId(
            originType,
            options && options.originName,
            $aliasId,
        );

        aliases.set($aliasId, $originId);
        return this;
    }

    function build() {
        // Aliases verification
        aliases.forEach(($origin, $alias, map) => {
            var realOriginId = resolveEntryId($origin);

            // Verify alias origin type binding
            var originEntry = entries.get(realOriginId);
            if (!originEntry)
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
        bindInstance,
        bindFactory,
        bindAlias,
        build,
    };
}
