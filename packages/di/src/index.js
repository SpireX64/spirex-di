export function createContainerBuilder() {
    /** The registry of type bindings */
    var entries = new Map();

    /** Adds a type entry in the registry */
    function putEntry(entry) {
        entries.set(entry.type, entry);
    }

    return {
        hasEntry(type) {
            return entries.has(type);
        },

        bindInstance(type, instance) {
            var instanceEntry = {
                type,
                instance,
                factory: undefined,
            };

            putEntry(instanceEntry);
            return this;
        },

        bindFactory(type, factory) {
            var factoryEntry = {
                type,
                instance: undefined,
                factory,
            };

            putEntry(factoryEntry);
            return this;
        },

        build() {
            return {};
        },
    };
}
