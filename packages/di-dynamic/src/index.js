export var Errors = {
    ModuleNotLoaded: (module, type) =>
        `Cannot resolve type "${type}" from dynamic module "${module}" because the module has not been loaded yet.`,
    DynamicModuleAccess: (module, path) =>
        `Cannot interact with '${module}' dynamic module member at path '${path.join(".")}' before it is loaded.`,
    MissingMiddleware: (module) =>
        `Dynamic module "${module}" cannot be included because 'DynamicModules' middleware has not been used.`,
};

var MODULE_TYPE_DYNAMIC = "dynamic";

export var DynamicModules = {
    name: "DynamicModules",
    onBind(entry) {
        if (
            entry.module &&
            entry.module.type === MODULE_TYPE_DYNAMIC &&
            entry.lifecycle === "singleton"
        ) {
            // Implicitly convert "singleton" lifecycles to "lazy" singletons
            // when the binding occurs inside a dynamic module.
            // This ensures that the container does not instantiate
            // the singleton immediately during container building.
            entry.lifecycle = "lazy";
        }
        return entry;
    },

    onRequest(entry) {
        var module = entry.module;
        if (module && module.type === MODULE_TYPE_DYNAMIC && !module.isLoaded)
            throw new Error(Errors.ModuleNotLoaded(module.id, entry.$id));
        return entry;
    },
};

/* istanbul ignore next */
function moduleStub() {}

function proxyModuleAccessor(state, accessPath) {
    var getModuleMember = (esm, path) => path.reduce((m, k) => m[k], esm);

    return new Proxy(moduleStub, {
        get(_, key) {
            var esm = state.cache;
            if (!esm) {
                if (key === Symbol.toPrimitive)
                    throw new Error(
                        Errors.DynamicModuleAccess(state.id, accessPath),
                    );
                return proxyModuleAccessor(state, accessPath.concat(key));
            }

            var isValueCall = key === "valueOf";
            var memberPath = isValueCall ? accessPath : accessPath.concat(key);

            var member = getModuleMember(esm, memberPath);
            return isValueCall ? member.valueOf.bind(member) : member;
        },

        set(_, key, value) {
            var member = getModuleMember(state.cache, accessPath);
            member[key] = value;
            return true;
        },

        construct(_, args) {
            var esm = state.cache;
            if (!esm)
                throw new Error(
                    Errors.DynamicModuleAccess(state.id, accessPath),
                );

            var Class = getModuleMember(esm, accessPath);
            return new Class(...args);
        },

        apply(_, thisRef, args) {
            var esm = state.cache;
            if (!esm)
                throw new Error(
                    Errors.DynamicModuleAccess(state.id, accessPath),
                );

            var funcMember = getModuleMember(esm, accessPath);
            return funcMember.call(thisRef, ...args);
        },
    });
}

function proxyModule(state) {
    return (
        state.cache ||
        new Proxy(moduleStub, {
            get(_, key) {
                return proxyModuleAccessor(state, [key]);
            },
        })
    );
}

export function dynamicModule(id, importDelegate) {
    return {
        create: (binderDelegate) => {
            var state = { id, cache: null, deps: null };
            return Object.freeze({
                id,
                type: MODULE_TYPE_DYNAMIC,
                get isLoaded() {
                    return state.cache != null;
                },
                loadAsync: () => {
                    if (state.cache) return Promise.resolve();

                    var promises = [importDelegate()];
                    if (state.deps) {
                        state.deps.forEach((dep) => {
                            if (!dep.isLoaded)
                                promises.push(dep.loadAsync());
                        });
                    }

                    return Promise.all(promises).then((resolved) => {
                        state.cache = resolved[0];
                    });
                },
                delegate: (binder) => {
                    if (!binder.hasMiddleware(DynamicModules))
                        throw new Error(Errors.MissingMiddleware(state.id));

                    var dynamicBinder = Object.setPrototypeOf(
                        {
                            // Override instance binding operation
                            bindInstance(key, inst, opt) {
                                return this.bindFactory(
                                    key,
                                    () => inst.valueOf(),
                                    {
                                        lifecycle: "lazy",
                                        ...opt,
                                    },
                                );
                            },
                            include: (module) => {
                                if (module.type === MODULE_TYPE_DYNAMIC) {
                                    if (!state.deps) state.deps = new Set();
                                    state.deps.add(module);
                                }
                                binder.include(module);
                                return dynamicBinder
                            },
                        },
                        binder,
                    );
                    binderDelegate(dynamicBinder, proxyModule(state));
                },
            });
        },
    };
}
