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

    function verifyBinding(type, strategy) {
        if (entries.has(type)) {
            if (strategy === "keep") return true;
            if (!strategy || strategy === "throw")
                throw new Error(Errors.BindingConflict(type));
        }
        return false;
    }

    // region Public methods

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

    // endregion Public methods

    return {
        hasEntry,
        findEntry,
        bindInstance,
        bindFactory,
        build,
    };
}
