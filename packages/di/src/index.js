/** A char used to separate the type and name in the unique ID of a binding */
var ID_SEP = "$";
var STRATEGY_APPEND = "append";
var LC_SINGLETON = "singleton";

var hasSymbolDispose = typeof Symbol.dispose === "symbol";

// #region Shortcuts

/**
 * Returns last array element
 * @param {Array<T>} array
 * @returns {T | undefined}
 */
var len = (x) => x.length
var lastOf = (array) => array[len(array) - 1];
var listContains = (array, element) => array.includes(element);
var readOnly = Object.freeze;
var isArray = Array.isArray;
var isFunc = (x) => typeof x === "function";
var isStr = (x) => typeof x === "string";

// #endregion

// #region Utilities

/**
 * @template T
 * @param {Set<T>} set
 * @param {(item: T) => boolean} predicate
 * @returns {T | undefined}
 */
var findInSet = (set, predicate) => {
    for (var item of set) {
        if (predicate(item)) return item;
    }
};

/**
 * @template K
 * @template T
 * @param {Map<K, T | Set<T>>} mapSet
 * @param {(item: T, key: K) => boolean} predicate
 * @returns {T | undefined}
 */
var findInMapSet = (mapSet, predicate) => {
    var result;
    for (var [key, valueOrSet] of mapSet.entries()) {
        var predicateWithKey = (value) => predicate(value, key);
        if (valueOrSet instanceof Set) {
            result = findInSet(valueOrSet, predicateWithKey);
        } else if (predicateWithKey(valueOrSet)) result = valueOrSet;
        if (result) return result;
    }
};

function chainToString(chain, key) {
    var sep = " -> ";
    if (!len(chain)) return key;
    if (len(chain) <= 2) return key + sep + key;
    return chain.map((it) => (it === key ? `[${it}]` : it)).join(sep);
}

/**
 * Creates a unique identifier string for a binding entry based on its type and optional name.
 *
 * The ID is used internally to distinguish bindings, including support for named bindings.
 * This ID is stored in the `$id` field of a binding entry and is used as the internal key.
 *
 * @param {string} type - The type token of the binding.
 * @param {string | undefined} [name] - Optional name for the binding (used for named bindings).
 * @return A unique string identifier for the binding.
 */
var makeEntryId = (type, name) => (name ? type + ID_SEP + name : type);

/**
 * Split identifier on key and name
 * @param {string} id
 * @returns {{type: string, name?: string}}
 */
var splitEntryId = (id) => {
    id = id.split(ID_SEP);
    return { type: id[0], name: id[1] };
};

var isTypeEntry = (mayBeTypeEntry) =>
    typeof mayBeTypeEntry === "object" &&
    "$id" in mayBeTypeEntry &&
    "type" in mayBeTypeEntry;

// #endregion

// #region Errors

var ErrorBindingConflict = (type) =>
    `Binding exists: '${type}'`;
var ErrorMissingRequiredType = (type) =>
    `Missing binding: "${type}"`;
var ErrorUndefinedInstance = (type) =>
    `Undefined bind: "${type}"`;
var ErrorResolveInternalType = (module, entryType, chain) =>
    `Type "${entryType}" is not accessible outside "${module}" module (${chainToString(chain, entryType)})`;
var ErrorAliasCycle = (alias, aliasChain) =>
    `Alias cycle: ${chainToString(aliasChain, alias)}`;
var ErrorAliasMissingRef = (aliasId, originId) =>
    `Alias "${aliasId}" refers to missing binding "${originId}"`;
var ErrorMiddlewareEntryTypeMismatch = (
    middlewareName,
    newEntryId,
    originEntryId,
) =>
    `Middleware "${middlewareName || "unnamed"}" changed entry type: expected '${originEntryId}', got '${newEntryId}'`;
var ErrorTypeBindingNotFound = (type, name) =>
    `Binding not found: ${type}${name ? `("${name}")` : ""}`;
var ErrorDependenciesCycle = (entryType, chain) =>
    `Dependency cycle: '${entryType}' (${chainToString(chain, entryType)})`;
var ErrorMixedLifecycleBindings = (type, lifecycleA, lifecycleB) =>
    `Lifecycle conflict: "${type}" ${lifecycleA}/${lifecycleB}`;
var ErrorSealedScope = (sealedScope, childScope) =>
    `Cannot create "${childScope}" from sealed scope "${sealedScope}"`;
var ErrorScopeViolation = (scope, type) =>
    `Type "${type}" not accessible in scope "${scope}"`;
var ErrorInstanceAccessAfterDispose = (type, scopeId, scopeHierarchy) =>
    `Cannot resolve '${type}' from disposed scope "${chainToString(scopeHierarchy, scopeId)}""`;
var ErrorChildScopeCreationAfterDispose = (
    childScopeId,
    scopeId,
    scopeHierarchy,
) =>
    `Scope disposed: "${childScopeId}" @ "${chainToString(scopeHierarchy, scopeId)}"`;

// #endregion

/* istanbul ignore next */
function phantomProxy(provider) {
    var state = { $: null };
    var getRef = (s) => s.$ || (s.$ = provider());
    return new Proxy(state, {
        get: (s, k) => getRef(s)[k],
        set: (s, k, v) => ((getRef(s)[k] = v), true),
        has: (s, k) => k in getRef(s),
        ownKeys: (s) => Object.getOwnPropertyNames(getRef(s)),
        getOwnPropertyDescriptor: (s, k) =>
            Object.getOwnPropertyDescriptor(getRef(s), k),
    });
}

function createContainerBlueprint() {
    /** Map of registered type bindings */
    var entries = new Map();
    /** Map of registered alias entries. */
    var aliases = new Map();
    /** Set of registered container middlewares. */
    var mws = new Set();
    /** Set of included modules. */
    var modules = new Set();
    /** Container type enumeration cache. */
    var typesEnum = null;

    function types() {
        if (!typesEnum)
            typesEnum = readOnly(
                Object.fromEntries([...entries.keys()].map((k) => [k, k])),
            );

        return typesEnum;
    }

    function hasMod(module) {
        return !!findInSet(modules, (m) => m.id === module.id);
    }

    function addMod(module) {
        modules.add(module);
    }

    function hasMw(middleware) {
        return !!findInSet(
            mws,
            (m) =>
                m === middleware ||
                (middleware.name && m.name === middleware.name),
        );
    }

    function addMw(middleware) {
        mws.add(middleware);
    }

    function callMw(hookName, resultArgIndex, ...args) {
        var result = args[resultArgIndex];
        for (var mv of mws) {
            var hook = mv[hookName];
            if (isFunc(hook)) {
                result = hook(...args);
                if (resultArgIndex >= 0) args[resultArgIndex] = result;
            }
        }
        return result;
    }

    function getAO(type, name) {
        var ref = aliases.get(makeEntryId(type, name));
        return ref instanceof Set ? Array.from(ref.values()) : ref;
    }

    function has(type, name) {
        var id = makeEntryId(type, name);
        return entries.has(id) || aliases.has(id);
    }

    /** Find first entry with given type and name */
    function findE(type, name) {
        var binding = entries.get(makeEntryId(type, name));
        return !binding || isTypeEntry(binding)
            ? binding
            : binding.values().next().value;
    }

    function findAlias(type, name) {
        var $id = makeEntryId(type, name);
        var alias = aliases.get($id);
        return !alias || isStr(alias) ? alias : alias.values().next().value;
    }

    /** Find all entries by type and name */
    function findEs(type, name) {
        var typeEntry = entries.get(makeEntryId(type, name));
        if (!typeEntry) return [];

        return isTypeEntry(typeEntry)
            ? Array.of(typeEntry)
            : Array.from(typeEntry);
    }

    var forEach = findInMapSet.bind(null, entries);

    var forEachAlias = findInMapSet.bind(null, aliases);

    function find(predicate) {
        var result;
        forEach((entry) => predicate(entry) && (result = entry));
        return result;
    }

    function findAll(predicate) {
        var results = [];
        forEach((entry) => {
            if (predicate(entry)) results.push(entry);
        });
        return results;
    }

    function addAlias(aliasId, originType, originName, multibinding) {
        var originId = makeEntryId(originType, originName);
        var existingAlias = aliases.get(aliasId);
        if (!existingAlias || !multibinding) {
            // No exist alias, or multibinding not enabled:
            // simply store the new alias by replacing any existing one
            aliases.set(aliasId, originId);
        } else if (isStr(existingAlias)) {
            // Existing alias is a single reference
            // convert it to a Set and put both references into
            aliases.set(aliasId, new Set().add(existingAlias).add(originId));
        } else {
            // Existing alias already targeting to many references
            // add new entry to the existing Set
            existingAlias.add(originId);
        }
    }

    /**
     * Adds a type entry in the registry.
     * All entries are frozen to ensure immutability.
     *
     * When `multibinding` is `false` or not set, the entry replaces any existing entry with the same `$id`.
     * When `multibinding` is `true` and an entry with the same `$id` already exists:
     * - If the existing entry is a single binding, it will be converted into a `Set` containing both the old and new entries.
     * - If the existing entry is already a `Set` (i.e. multibinding), the new entry is added to the set.
     *
     * @param builder - current builder reference
     * @param id - unique entry identifier
     * @param entry - entry The type binding entry to store.
     * @param multibinding - Allows multiple entries under the same type. Otherwise, the new entry replaces the existing one.
     *
     * @internal
     */
    function addTypeEntry(builder, id, entry, multibinding) {
        var entryToBind = entry;
        mws.forEach((middleware) => {
            if (!middleware.onBind) return;

            entryToBind = middleware.onBind(entryToBind, entry, builder);
            if (
                !entryToBind ||
                !isTypeEntry(entryToBind) ||
                entryToBind.$id !== entry.$id ||
                entryToBind.type !== entry.type
            )
                throw new TypeError(
                    ErrorMiddlewareEntryTypeMismatch(
                        middleware.name,
                        entryToBind && entryToBind.$id,
                        entry.$id,
                    ),
                );
        });

        readOnly(entryToBind);

        var existingEntry = entries.get(id);
        if (!existingEntry || !multibinding) {
            // No existing entry, or multibinding not enabled:
            // simply store the new entry (replacing any existing one).
            entries.set(id, entryToBind);
        } else if (isTypeEntry(existingEntry)) {
            // Existing entry is a single binding:
            // convert it to a Set and add both the old and new entries.
            entries.set(id, new Set().add(existingEntry).add(entryToBind));
        } else {
            // Existing entry is already a Set:
            // add the new entry to the existing set.
            existingEntry.add(entryToBind);
        }
    }

    function compileAliasRef(builder, aliasRef, stack) {
        if (!isStr(aliasRef)) {
            for (var ref of aliasRef) compileAliasRef(builder, ref, stack);
            return;
        }

        if (listContains(stack, aliasRef)) {
            stack.push(aliasRef);
            throw new Error(ErrorAliasCycle(aliasRef, stack));
        }

        var ref = aliases.get(aliasRef);
        if (ref !== undefined) {
            stack.push(aliasRef);
            compileAliasRef(builder, ref, stack);
            stack.pop();
            return;
        }

        var typeEntry = entries.get(aliasRef);
        if (typeEntry === undefined)
            throw new Error(ErrorAliasMissingRef(lastOf(stack), aliasRef));

        stack.push(aliasRef);
        for (var aliasId of stack) {
            if (isTypeEntry(typeEntry)) {
                addTypeEntry(builder, aliasId, typeEntry, true);
            } else
                for (var entry of typeEntry) {
                    addTypeEntry(builder, aliasId, entry, true);
                }
        }
        stack.pop();
    }

    function cAlias(builder) {
        if (!aliases.size) return;

        var stack = [];
        for (var [aliasId, ref] of aliases) {
            stack.push(aliasId);
            compileAliasRef(builder, ref, stack);
            stack.pop();
        }

        aliases.clear();
    }

    return {
        entries,
        aliases,
        mws,
        types,
        has,
        hasMw,
        addMw,
        callMw,
        hasMod,
        addMod,
        findE,
        findAlias,
        findEs,
        forEach,
        forEachAlias,
        find,
        findAll,
        getAO,
        addAlias,
        addTypeEntry,
        cAlias,
    };
}

function createFactoryScopeContext(scope) {
    return {
        current: scope.id,
        path: scope.path,
        data: scope.data,
        dispose: scope.dispose.bind(scope),
    };
}

function createRootContainerScope(blueprint, rootData) {
    var $root = Symbol("r");
    var $parent = Symbol("p");
    var $scopes = Symbol("s");
    var $locals = Symbol("l");
    var $state = Symbol("d");

    /**
     * Builds a scope path array from root (excluded) to current scope.
     * @param scopeId - Current scope ID
     * @param parent - Parent scope if exist
     * @returns Frozen array of scope IDs from root to current
     */
    function makeScopePath(scopeId, parent) {
        var path = [];
        // Root scope has empty ID and is ignored.
        if (parent) {
            path.push(scopeId);
            while (parent && parent.id !== '') {
                path.push(parent.id);
                parent = parent[$parent];
            }
        }
        return readOnly(path.reverse());
    }

    function createScopeObject(id, parent, options = {}) {
        var { sealed = false, isolated = false, data } = options;
        return {
            id,
            data,
            sealed,
            isolated,
            path: makeScopePath(id, parent),
            [$root]: parent && (parent[$root] || parent),
            [$parent]: parent,
            [$locals]: new Map(),
            [$scopes]: new Map(),
            [$state]: { disposed: false },
        };
    }

    // The activation stack is used to track the chain of type activations
    // to detect circular dependencies during instance creation
    var activationStack = [];

    // The resolution stack is used to determine request chain.
    // It works with already created instances.
    var resolutionStack = [];

    /**
     * Activates (creates) an instance for a given type entry.
     *
     * Tracks the current activation path using a stack to detect and prevent circular dependencies.
     *
     * @param entry - The type entry to activate. Must contain a factory function and optional cached instance.
     * @param scope - The current container scope, used to resolve dependencies during factory execution.
     *
     * @return The created instance associated with the entry.
     */
    function activateInstance(entry, scope) {
        // Check for circular dependency by verifying if the entry is already being activated
        var hasDependencyCycle = listContains(activationStack, entry);

        // Push the current entry to the activation stack
        activationStack.push(entry);

        if (hasDependencyCycle) {
            // If a cycle is detected, throw a detailed error
            var error = new Error(
                ErrorDependenciesCycle(
                    entry.$id,
                    activationStack.map((it) => it.$id),
                ),
            );

            // Clear the activation stack to avoid residual state
            activationStack.length = 0;
            throw error;
        }

        // Call the factory to create the instance, passing the current scope as resolver
        var ctx = createFactoryScopeContext(scope);
        var instance = entry.injector
            ? entry.factory(entry.injector(scope, ctx), ctx)
            : entry.factory(scope, ctx);

        // Call 'OnActivated' middleware
        instance = blueprint.callMw(
            "onActivated",
            1,
            entry,
            instance,
            scope,
            activationStack.slice(),
        );

        // Remove the entry from the activation stack after successful creation
        activationStack.pop();

        return instance;
    }

    function getInstance(scope, entry, noThrow, noActivate) {
        var instance;

        // Check for internal module type.
        // Singletons can be created
        if (entry.module && entry.internal) {
            var topEntry = lastOf(activationStack);
            if (!topEntry || topEntry.module !== entry.module) {
                if (noThrow) return undefined;
                else
                    throw Error(
                        ErrorResolveInternalType(
                            entry.module.id,
                            entry.$id,
                            activationStack.map((it) => it.$id),
                        ),
                    );
            }
        }

        resolutionStack.push(entry);

        // Return the directly bound instance, if any (from bindInstance)
        if ("instance" in entry) instance = entry.instance;
        else if (
            scope[$parent] &&
            (entry.lifecycle === LC_SINGLETON || entry.lifecycle === "lazy")
        )
            // Direct singleton access from the root
            instance = getInstance(scope[$root], entry, noThrow);
        else if (entry.lifecycle === "scope") {
            var allowedScopes = entry.allowedScopes;

            // If scope is not isolated, search up the parent chain
            // to find an already created instance of this entry (no new instantiation)
            var nearestAllowedParent = undefined;
            for (
                var parent = scope;
                parent && instance === undefined;
                parent = parent[$parent]
            ) {
                if (!allowedScopes || listContains(allowedScopes, parent.id)) {
                    // Save nearest allowed scope
                    nearestAllowedParent ||= parent;
                    var locals = parent[$locals];
                    if (locals.has(entry)) instance = locals.get(entry);
                }
                if (parent.isolated) break;
            }

            if (allowedScopes) {
                if (!nearestAllowedParent) {
                    resolutionStack.pop();
                    if (noThrow) return instance;
                    else
                        throw new Error(
                            ErrorScopeViolation(scope.id, entry.$id),
                        );
                }

                // Redirect activation request to nearest allowed parent
                scope = nearestAllowedParent;
            }
        }

        if (instance === undefined) {
            // Attempt to get cached instance from current scope
            instance = scope[$locals].get(entry);
            if (instance === undefined && !noActivate) {
                if (entry.withScope)
                    scope = scope.scope(entry.type, entry.withScope);

                instance = activateInstance(entry, scope);

                // Cache the instance in scope locals if lifecycle is not transient
                if (entry.lifecycle !== "transient")
                    scope[$locals].set(entry, instance);
            }
        }

        return blueprint.callMw(
            "onResolve",
            1,
            resolutionStack.pop(),
            instance,
            scope,
            resolutionStack,
        );
    }

    function onRequestMiddleware(scope, entry, type, name) {
        return (
            blueprint.callMw(
                "onRequest",
                0,
                entry,
                scope,
                type,
                name,
                resolutionStack.slice(),
            ) || entry
        );
    }

    function assertScopeNotDisposedToResolve(type, name) {
        if (this[$state].disposed)
            throw new Error(
                ErrorInstanceAccessAfterDispose(
                    makeEntryId(type, name),
                    this.id,
                    this.path,
                ),
            );
    }

    function makeProviderFunc(scope, entry) {
        var providerFuncName = "provider<" + entry.$id + ">";
        return {
            // Deanonymize the function by giving it a specific name
            [providerFuncName]: function () {
                entry = onRequestMiddleware(
                    scope,
                    entry,
                    entry.type,
                    entry.name,
                );
                return getInstance.call(scope, scope, entry);
            },
        }[providerFuncName];
    }

    var scopePrototype = {
        get types() {
            return blueprint.types();
        },

        get isDisposed() {
            return this[$state].disposed;
        },

        get(type, name) {
            assertScopeNotDisposedToResolve.call(this, type, name);
            var entry = blueprint.findE(type, name);
            if (!entry) throw new Error(ErrorTypeBindingNotFound(type, name));

            entry = onRequestMiddleware(this, entry, type, name);
            return getInstance(this, entry);
        },

        maybe(type, name) {
            assertScopeNotDisposedToResolve.call(this, type, name);
            var entry = blueprint.findE(type, name);
            if (!entry) return undefined;

            entry = onRequestMiddleware(this, entry, type, name);
            return getInstance(this, entry, true);
        },

        getAll(type, name) {
            assertScopeNotDisposedToResolve.call(this, type, name);
            return blueprint
                .findEs(type, name)
                .map((entry) => onRequestMiddleware(this, entry, type, name))
                .map((entry) => getInstance(this, entry, true));
        },

        providerOf(type, name) {
            assertScopeNotDisposedToResolve.call(this, type, name);
            var entry = blueprint.findE(type, name);
            if (entry) return makeProviderFunc(this, entry);
            throw new Error(ErrorTypeBindingNotFound(type, name));
        },

        phantomOf(type, name) {
            assertScopeNotDisposedToResolve.call(this, type, name);
            var entry = blueprint.findE(type, name);
            if (entry)
                return (
                    getInstance(this, entry, true, true) ||
                    phantomProxy(makeProviderFunc(this, entry))
                );

            throw new Error(ErrorTypeBindingNotFound(type, name));
        },

        hasChildScope(id) {
            return this[$scopes].has(id);
        },

        scope(id, options) {
            if (this[$state].disposed)
                throw new Error(
                    ErrorChildScopeCreationAfterDispose(id, this.id, this.path),
                );

            // Walk up the scope hierarchy to find a scope with the matching ID.
            // Used to return an already existing parent scope instead of creating a duplicate.
            for (var scope = this; scope; scope = scope[$parent])
                if (scope.id === id) return scope;

            // Disallow creating child scopes from sealed scope
            if (this.sealed) throw new Error(ErrorSealedScope(this.id, id));

            var scopesMap = this[$scopes];

            var scope = scopesMap.get(id);
            if (scope) return scope;

            scope = readOnly(
                Object.setPrototypeOf(
                    createScopeObject(id, this, options),
                    Object.getPrototypeOf(this),
                ),
            );

            blueprint.callMw("onScopeOpen", -1, scope);
            scopesMap.set(id, scope);
            return scope;
        },

        dispose() {
            if (this[$state].disposed) return;

            // Dispose children
            this[$scopes].forEach((scope) => scope.dispose());
            this[$scopes].clear();

            blueprint.callMw("onScopeDispose", -1, this);
            this[$state].disposed = true;

            // Dispose local instances
            this[$locals].forEach((inst) => {
                if (hasSymbolDispose && isFunc(inst[Symbol.dispose]))
                    inst[Symbol.dispose]();
                else if (isFunc(inst.dispose)) inst.dispose();
            });
            this[$locals].clear();
        },
    };

    // istanbul ignore next
    if (hasSymbolDispose)
        scopePrototype[Symbol.dispose] = scopePrototype.dispose;

    var rootScope = readOnly(
        Object.setPrototypeOf(
            createScopeObject("", undefined, { data: rootData }),
            // Preventing illegal mutations of the scope prototype
            readOnly(scopePrototype),
        ),
    );

    // Singletons activation
    blueprint.forEach((typeEntry) => {
        if (
            // Instance is not defined
            typeEntry.instance === undefined &&
            // Has factory function
            typeEntry.factory &&
            // It is singleton binding
            typeEntry.lifecycle === LC_SINGLETON &&
            // Not activated yet
            !rootScope[$locals].has(typeEntry)
        ) {
            rootScope[$locals].set(
                typeEntry,
                activateInstance(typeEntry, rootScope),
            );
        }
    });

    return rootScope;
}

export function diBuilder(builderOptions = {}) {
    var {
        /** The default lifecycle to use when a binding does not explicitly define one. */
        lifecycle: defaultLifecycle = LC_SINGLETON,
        /** The default conflict resolution strategy to use for bindings. */
        ifConflict: defaultConflictResolve = "throw",
        data,
    } = builderOptions;

    var blueprint = createContainerBlueprint();

    var hasSomeSafeFactory = false;
    var requiredTypes = new Set();
    var externalInjections = [];
    var moduleStack = [];

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
     * @param lifecycle (Optional) factory binding lifecycle
     * @returns `true` if the binding should be skipped; `false` if it can proceed.
     *
     * @throws {ErrorBindingConflict} If a binding conflict exists and the strategy is `"throw"` or undefined.
     * @internal
     */
    function verifyBinding(id, strategy, lifecycle) {
        var isAlias = false;
        var existEntry = blueprint.findE(id);
        if (!existEntry) {
            existEntry = blueprint.findAlias(id);
            isAlias = true;
        }

        if (existEntry) {
            strategy ||= defaultConflictResolve;
            if (strategy === "keep") return true;
            if (!strategy || strategy === "throw")
                throw new Error(ErrorBindingConflict(id));

            // Check lifecycle consistency
            // Only applies when appending to an existing binding
            // Skip if either binding is an instance (have no lifecycle)
            if (
                !isAlias &&
                strategy === STRATEGY_APPEND &&
                lifecycle &&
                existEntry.lifecycle &&
                existEntry.lifecycle !== lifecycle
            ) {
                throw new Error(
                    ErrorMixedLifecycleBindings(
                        id,
                        existEntry.lifecycle,
                        lifecycle,
                    ),
                );
            }
        }
        return false;
    }

    function requireType(type, name) {
        requiredTypes.add(makeEntryId(type, name));
        return this;
    }

    function bindInstance(type, instance, options = {}) {
        var { name, ifConflict, ...entryOptions } = options;
        var $id = makeEntryId(type, name);
        if (instance === undefined)
            throw TypeError(ErrorUndefinedInstance($id));
        if (verifyBinding($id, ifConflict)) return this;

        blueprint.addTypeEntry(
            this,
            $id,
            {
                ...entryOptions,
                $id,
                type,
                name,
                instance,
                module: lastOf(moduleStack),
            },
            ifConflict === STRATEGY_APPEND,
        );
        return this;
    }

    function bindFactory(type, factory, options = {}) {
        var {
            name,
            ifConflict,
            lifecycle = defaultLifecycle,
            ...entryOptions
        } = options;
        var $id = makeEntryId(type, name);
        if (verifyBinding($id, ifConflict, lifecycle)) return this;
        if (factory.inject) factory.inject.forEach((it) => requireType(it));

        blueprint.addTypeEntry(
            this,
            $id,
            {
                ...entryOptions,
                $id,
                type,
                name,
                factory,
                lifecycle,
                module: lastOf(moduleStack),
            },
            ifConflict === STRATEGY_APPEND,
        );
        return this;
    }

    function bindSafeFactory(type, injector, factory, options = {}) {
        var {
            name,
            ifConflict = defaultConflictResolve,
            lifecycle = defaultLifecycle,
            ...entryOptions
        } = options;
        var $id = makeEntryId(type, name);
        if (verifyBinding($id, ifConflict, lifecycle)) return this;

        blueprint.addTypeEntry(
            this,
            $id,
            {
                ...entryOptions,
                $id,
                type,
                injector,
                factory,
                lifecycle,
                name,
                module: lastOf(moduleStack),
            },
            ifConflict === STRATEGY_APPEND,
        );
        hasSomeSafeFactory = true;
        return this;
    }

    function when(condition, truthyDelegate, falsyDelegate) {
        if (condition) truthyDelegate && truthyDelegate(this);
        else falsyDelegate && falsyDelegate(this);
        return this;
    }

    function bindAlias(type, originType, options = {}) {
        var { name, originName, ifConflict = defaultConflictResolve } = options;
        var $aliasId = makeEntryId(type, name);

        if (verifyBinding($aliasId, ifConflict)) return this;

        blueprint.callMw(
            "onBindAlias",
            -1,
            { type, name },
            { type: originType, name: originName },
            this,
        );
        blueprint.addAlias(
            $aliasId,
            originType,
            originName,
            ifConflict === STRATEGY_APPEND,
        );
        return this;
    }

    function use(middleware) {
        if (!blueprint.hasMw(middleware)) {
            blueprint.addMw(middleware);
            if (middleware.onUse) middleware.onUse(this);
        }
        return this;
    }

    function include(m) {
        if (!blueprint.hasMod(m)) {
            moduleStack.push(m);
            try {
                m.delegate(this);
                blueprint.addMod(m);
            } finally {
                moduleStack.pop();
            }
        }
        return this;
    }

    var markAsRequired = (type, name) => (requireType(type, name), {});
    function requireTypesFromSafeFactories() {
        if (!hasSomeSafeFactory) return;

        var dryRunScope = {
            get: markAsRequired,
            providerOf: markAsRequired,
            phantomOf: markAsRequired,
            maybe: () => undefined,
            getAll: () => [],
        };

        blueprint.forEach((entry) => {
            if (isFunc(entry.injector))
                try {
                    // Dry-run call to collect required types from safe factories.
                    // We only care about which types are accessed via `get(...)`.
                    // Any errors are ignored, as actual resolution is not performed here.
                    entry.injector(dryRunScope);
                } catch {
                    // Intentionally ignored — we're only interested in tracking type accesses.
                }
        });
    }

    function injectInto(delegate) {
        externalInjections.push(delegate);
        return this;
    }

    function build() {
        blueprint.callMw("onPreBuild", -1, this);

        // Compile aliases
        blueprint.cAlias(this);

        // Collect required types from safe factories
        requireTypesFromSafeFactories();

        // Required types verification
        requiredTypes.forEach(($id) => {
            if (!blueprint.has($id))
                throw new Error(ErrorMissingRequiredType($id));
        });

        var container = createRootContainerScope(blueprint, data);
        externalInjections.forEach((delegate) => delegate(container));
        blueprint.callMw("onPostBuild", -1, container);
        blueprint = null; // Dispose builder
        return container;
    }

    var findAlias = (predicate) => {
        var alias;
        blueprint.forEachAlias(
            (originId, aliasId) =>
                (alias =
                    predicate(splitEntryId(aliasId), splitEntryId(originId)) &&
                    aliasId),
        );
        return alias ? splitEntryId(alias) : undefined;
    };

    return {
        data,
        has: blueprint.has,
        hasModule: blueprint.hasMod,
        hasMiddleware: blueprint.hasMw,
        findEntry: blueprint.findE,
        findAllEntries: blueprint.findEs,
        find: blueprint.find,
        findAll: blueprint.findAll,
        getAliasOrigin: blueprint.getAO,
        findAlias,
        requireType,
        injectInto,
        bindInstance,
        bindFactory,
        bindSafeFactory,
        bindAlias,
        when,
        include,
        use,
        build,
    };
}

export function staticModule(id) {
    return {
        create: (delegate) =>
            readOnly({
                id,
                delegate,
                type: "static",
            }),
        compose: (...modules) =>
            readOnly({
                id,
                modules: readOnly(modules),
                type: "group",
                delegate: (binder) => {
                    for (var module of modules) {
                        binder.include(module);
                    }
                },
            }),
    };
}

var mapInject = (r, i) => i.map((t) => r.get(t));
export function factoryOf(Class, inject) {
    var isFactory = isArray(inject);

    inject = inject || Class.inject;
    var hasDeps = isArray(inject) && len(inject);

    var factory;
    if (isFactory) factory = (r) => Class(...mapInject(r, inject));
    else
        factory = hasDeps
            ? (r) => new Class(...mapInject(r, inject))
            : (factory = () => new Class());

    if (hasDeps) factory.inject = inject;
    return factory;
}
