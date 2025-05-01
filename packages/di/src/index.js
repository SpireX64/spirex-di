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
 * throw new Error(Errors.BindingConflict('MyService'));
 */
var Errors = Object.freeze({
    BindingConflict: (type) =>
        `Binding conflict. The type '${type}' is already bound.`,
});

export function createContainerBuilder() {
    /** The registry of type bindings */
    var entries = new Map();

    // region INTERNAL METHODS

    /**
     * Adds a type entry in the registry
     * @internal
     */
    function putEntry(entry) {
        entries.set(entry.type, entry);
    }

    /**
     * Verifies whether a binding for the given type already exists in the container,
     * and applies the specified conflict resolution strategy.
     *
     * - If the strategy is `"keep"`, the function returns `true` to indicate that the binding should be skipped.
     * - If the strategy is `"throw"` or not provided, and a conflict exists, an error is thrown.
     * - If no conflict exists, returns `false` to allow the binding to proceed.
     *
     * @param type The type token to check for existing bindings.
     * @param strategy The strategy to use if a binding already exists.
     * @returns `true` if the binding should be skipped; `false` if it can proceed.
     *
     * @throws {Error} If a binding conflict exists and the strategy is `"throw"` or undefined.
     * @internal
     */
    function verifyBinding(type, strategy) {
        if (entries.has(type)) {
            if (strategy === "keep") return true;
            if (!strategy || strategy === "throw")
                throw new Error(Errors.BindingConflict(type));
        }
        return false;
    }

    // endregion INTERNAL METHODS

    // region PUBLIC METHODS

    function hasEntry(entry) {
        return entries.has(entry);
    }

    function findEntry(type) {
        return entries.get(type);
    }

    function bindInstance(type, instance, options) {
        var instanceEntry = {
            type,
            instance,
        };

        if (verifyBinding(type, options && options.ifConflict)) return this;
        putEntry(Object.freeze(instanceEntry));
        return this;
    }

    function bindFactory(type, factory, options) {
        var factoryEntry = {
            type,
            factory,
        };

        if (verifyBinding(type, options && options.ifConflict)) return this;
        putEntry(Object.freeze(factoryEntry));
        return this;
    }

    function build() {
        return {};
    }

    // endregion PUBLIC METHODS

    return {
        hasEntry,
        findEntry,
        bindInstance,
        bindFactory,
        build,
    };
}
