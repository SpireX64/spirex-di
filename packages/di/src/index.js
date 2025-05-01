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
            var instanceBindingEntry = {
                type,
                instance,
            };

            putEntry(instanceBindingEntry);
        },

        build() {
            return {};
        },
    };
}
