export function createContainerBuilder() {
    /** The registry of type bindings */
    var entries = new Map();

    /** Adds a type entry in the registry */
    function putEntry(entry) {
        entries.set(entry.type, entry);
    }

    // region Public methods

    function hasEntry(entry) {
        return entries.has(entry);
    }

    function bindInstance(type, instance) {
        var instanceEntry = {
            type,
            instance,
            factory: undefined,
        };

        putEntry(instanceEntry);
        return this;
    }

    function bindFactory(type, factory) {
        var factoryEntry = {
            type,
            instance: undefined,
            factory,
        };

        putEntry(factoryEntry);
        return this;
    }

    function build() {
        return {};
    }

    // endregion Public methods

    return {
        hasEntry,
        bindInstance,
        bindFactory,
        build,
    };
}
