export function Config(config) {
    return {
        name: Config.name + "[" + Object.keys(config).join(",") + "]",
        onActivated: (entry, instance, scope) => {
            if (entry.type in config) {
                var entryConfig = config[entry.type];
                if (typeof entryConfig === "object") {
                    entryConfig = entryConfig[entry.name || ""];
                }
                if (typeof entryConfig === "function")
                    entryConfig(instance, scope);
            }
            return instance;
        },
    };
}
