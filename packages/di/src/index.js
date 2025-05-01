export function createContainerBuilder() {
    var entries = new Map();

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
