var Errors = {
    BindingConflict: (type) =>
        `Binding conflict. The type '${type}' is already bound.`,
};

export function createContainerBuilder() {
    /** The registry of type bindings */
    var entries = new Map();

    /** Adds a type entry in the registry */
    function putEntry(entry) {
        entries.set(entry.type, entry);
    }

    function verifyBinding(type) {
        if (entries.has(type)) {
            throw new Error(Errors.BindingConflict(type));
        }
    }

    // region Public methods

    function hasEntry(entry) {
        return entries.has(entry);
    }

    function findEntry(type) {
        return entries.get(type);
    }

    function bindInstance(type, instance) {
        var instanceEntry = {
            type,
            instance,
        };

        verifyBinding(type);
        putEntry(Object.freeze(instanceEntry));
        return this;
    }

    function bindFactory(type, factory) {
        var factoryEntry = {
            type,
            factory,
        };

        verifyBinding(type);
        putEntry(Object.freeze(factoryEntry));
        return this;
    }

    function build() {
        return {};
    }

    // endregion Public methods

    return {
        hasEntry,
        findEntry,
        bindInstance,
        bindFactory,
        build,
    };
}
