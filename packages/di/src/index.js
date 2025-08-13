/** A char used to separate the type and name in the unique ID of a binding */
var ID_SEP = "$";

var hasSymbolDispose = typeof Symbol.dispose === "symbol";

function chainToString(chain, key) {
    var sep = " -> ";
    switch (chain.length) {
        case 0:
            return key;
        case 1:
        case 2:
            return key + sep + key;
        default:
            return chain.map((it) => (it === key ? `[${it}]` : it)).join(sep);
    }
}

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
 * throw new Error(DIErrors.BindingConflict('MyService'));
 */
export var DIErrors = Object.freeze({
    BindingConflict: (type) =>
        `Binding conflict. The type '${type}' is already bound.`,

    MissingRequiredTypeError: (type) => `Required type "${type}" is not bound.`,

    AliasCycle: (alias, aliasChain) =>
        `Alias resolution cycle detected: ${chainToString(aliasChain, alias)}`,

    AliasMissingRef: (aliasId, originId) =>
        `Alias "${aliasId}" refers to non-existent type binding "${originId}".`,

    MiddlewareEntryTypeMismatch: (middlewareName, newEntryId, originEntryId) =>
        `Middleware "${middlewareName || "unnamed"}" altered the entry type: Expected '${originEntryId}', but received '${newEntryId}`,

    TypeBindingNotFound: (type, name) =>
        `Type binding ${type}${name ? ` with name "${name}` : ""} not found.`,

    DependenciesCycle: (entryType, chain) =>
        `Activation failed: A cyclic dependency was detected while resolving type '${entryType}' (Activation chain: ${chainToString(chain, entryType)})`,

    MixedLifecycleBindings: (type, lifecycleA, lifecycleB) =>
        `Mixed lifecycle bindings detected for type "${type}": ${lifecycleA}, ${lifecycleB}`,

    SealedScope: (sealedScope, childScope) =>
        `Cannot create child scope "${childScope}" from sealed scope "${sealedScope}"`,

    ScopeViolation: (scope, type) =>
        `Access to type "${type}" is not allowed in scope "${scope}".`,

    InstanceAccessAfterDispose: (type, scopeId, scopeHierarchy) =>
        `Cannot resolve type '${type}' from disposed scope "${chainToString(scopeHierarchy, scopeId)}"`,

    ChildScopeCreationAfterDispose: (childScopeId, scopeId, scopeHierarchy) =>
        `Cannot create a child scope "${childScopeId}" from disposed scope "${chainToString(scopeHierarchy, scopeId)}"`,
});

/**
 * Creates a unique identifier string for a binding entry based on its type and optional name.
 *
 * The ID is used internally to distinguish bindings, including support for named bindings.
 * This ID is stored in the `$id` field of a binding entry and is used as the internal key.
 *
 * @param type - The type token of the binding.
 * @param name - Optional name for the binding (used for named bindings).
 * @return A unique string identifier for the binding.
 */
function makeEntryId(type, name) {
    return !!name ? type + ID_SEP + name : type;
}

function isTypeEntry(mayBeTypeEntry) {
    return (
        mayBeTypeEntry &&
        typeof mayBeTypeEntry === "object" &&
        "$id" in mayBeTypeEntry &&
        "type" in mayBeTypeEntry
    );
}

function createContainerBlueprint() {
    /** Map of registered type bindings */
    var entries = new Map();
    /** Map of registered alias entries. */
    var aliases = new Map();
    /** Set of registered container middlewares. */
    var middlewares = new Set();

    var modules = new Set();

    // region: PUBLIC METHODS
    function hasMod(module) {
        return modules.has(module);
    }

    function addMod(module) {
        modules.add(module);
    }

    function hasMw(middleware) {
        return middlewares.has(middleware);
    }

    function addMw(middleware) {
        middlewares.add(middleware);
    }

    function callMw(hookName, resultArgIndex, ...args) {
        var result = args[resultArgIndex];
        for (var mv of middlewares) {
            var hook = mv[hookName];
            if (typeof hook === "function") {
                result = hook(...args);
                if (resultArgIndex >= 0) args[resultArgIndex] = result;
            }
        }
        return result;
    }

    function getAliasOrigin(type, name) {
        var id = makeEntryId(type, name);
        var ref = aliases.get(id);
        return ref instanceof Set ? Array.from(ref.values()) : ref;
    }

    function has(type, name) {
        var id = makeEntryId(type, name);
        return entries.has(id) || aliases.has(id);
    }

    function findEntry(type, name) {
        var $id = makeEntryId(type, name);
        var binding = entries.get($id);
        return !binding || isTypeEntry(binding)
            ? binding
            : binding.values().next().value;
    }

    function findAlias(type, name) {
        var $id = makeEntryId(type, name);
        var alias = aliases.get($id);
        return !alias || typeof alias === "string"
            ? alias
            : alias.values().next().value;
    }

    function findAllEntries(type, name) {
        var typeEntry = entries.get(makeEntryId(type, name));
        if (!typeEntry) return [];

        return isTypeEntry(typeEntry)
            ? Array.of(typeEntry)
            : Array.from(typeEntry);
    }

    function forEach(delegate) {
        entries.forEach((entry) => {
            if (isTypeEntry(entry)) delegate(entry);
            else entry.forEach(delegate);
        });
    }

    function addAlias(aliasId, originType, originName, multibinding) {
        var originId = makeEntryId(originType, originName);
        var existingAlias = aliases.get(aliasId);
        if (!existingAlias || !multibinding) {
            // No exist alias, or multibinding not enabled:
            // simply store the new alias by replacing any existing one
            aliases.set(aliasId, originId);
        } else if (typeof existingAlias === "string") {
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
     * @param id - unique entry identifier
     * @param entry - entry The type binding entry to store.
     * @param multibinding - Allows multiple entries under the same type. Otherwise, the new entry replaces the existing one.
     *
     * @internal
     */
    function addTypeEntry(id, entry, multibinding) {
        var entryToBind = entry;
        middlewares.forEach((middleware) => {
            if (!middleware.onBind) return;

            entryToBind = middleware.onBind(entryToBind, entry);
            if (
                !entryToBind ||
                !isTypeEntry(entryToBind) ||
                entryToBind.$id !== entry.$id ||
                entryToBind.type !== entry.type
            )
                throw new Error(
                    DIErrors.MiddlewareEntryTypeMismatch(
                        middleware.name,
                        entryToBind && entryToBind.$id,
                        entry.$id,
                    ),
                );
        });

        Object.freeze(entryToBind);

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

    function compileAliasRef(aliasRef, stack) {
        if (typeof aliasRef !== "string") {
            for (var ref of aliasRef) compileAliasRef(ref, stack);
            return;
        }

        if (stack.includes(aliasRef)) {
            stack.push(aliasRef);
            throw new Error(DIErrors.AliasCycle(aliasRef, stack));
        }

        var ref = aliases.get(aliasRef);
        if (ref !== undefined) {
            stack.push(aliasRef);
            compileAliasRef(ref, stack);
            stack.pop();
            return;
        }

        var typeEntry = entries.get(aliasRef);
        if (typeEntry === undefined)
            throw new Error(
                DIErrors.AliasMissingRef(stack[stack.length - 1], aliasRef),
            );

        stack.push(aliasRef);
        for (var aliasId of stack) {
            if (isTypeEntry(typeEntry)) {
                addTypeEntry(aliasId, typeEntry, true);
            } else {
                for (var entry of typeEntry) {
                    addTypeEntry(aliasId, entry, true);
                }
            }
        }
        stack.pop();
    }

    function compileAliases() {
        if (!aliases.size) return;

        var stack = [];
        for (var [aliasId, ref] of aliases) {
            stack.push(aliasId);
            compileAliasRef(ref, stack);
            stack.pop();
        }

        aliases.clear();
    }

    // endregion: PUBLIC METHODS

    return {
        entries,
        aliases,
        middlewares,
        has,
        hasMw,
        addMw,
        callMw,
        hasMod,
        addMod,
        findEntry,
        findAlias,
        findAllEntries,
        forEach,
        getAliasOrigin,
        addAlias,
        addTypeEntry,
        compileAliases,
    };
}

function createFactoryScopeContext(scope) {
    return {
        current: scope.id,
        path: scope.path,
    };
}

function createRootContainerScope(blueprint) {
    var $root = Symbol("root");
    var $parent = Symbol("parent");
    var $scopes = Symbol("scopes");
    var $locals = Symbol("locals");
    var $state = Symbol("state");

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
            while (parent && parent.id.length > 0) {
                path.push(parent.id);
                parent = parent[$parent];
            }
        }
        return Object.freeze(path.reverse());
    }

    function createScopeObject(id, parent, options) {
        return {
            id,
            sealed: (options && options.sealed) || false,
            isolated: (options && options.isolated) || false,
            path: makeScopePath(id, parent),
            [$root]: parent && (parent[$root] || parent),
            [$parent]: parent,
            [$locals]: new Map(),
            [$scopes]: new Map(),
            [$state]: {
                disposed: false,
            },
        };
    }

    // The activation stack is used to track the chain of type activations
    // to detect circular dependencies during instance creation
    var activationStack = [];

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
        var hasDependencyCycle = activationStack.includes(entry);

        // Push the current entry to the activation stack
        activationStack.push(entry);

        if (hasDependencyCycle) {
            // If a cycle is detected, throw a detailed error
            var error = new Error(
                DIErrors.DependenciesCycle(
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
        instance = blueprint.callMw("onActivated", 1, entry, instance, scope);

        // Remove the entry from the activation stack after successful creation
        activationStack.pop();

        return instance;
    }

    function getInstance(scope, entry, noThrow) {
        var instance;

        // Return the directly bound instance, if any (from bindInstance)
        if (entry.instance) instance = entry.instance;
        else if (
            scope[$parent] &&
            (entry.lifecycle === "singleton" || entry.lifecycle === "lazy")
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
                parent && !instance;
                parent = parent[$parent]
            ) {
                if (!allowedScopes || allowedScopes.includes(parent.id)) {
                    // Save nearest allowed scope
                    nearestAllowedParent ||= parent;
                    instance = parent[$locals].get(entry);
                }
                if (parent.isolated) break;
            }

            if (allowedScopes) {
                if (!nearestAllowedParent) {
                    if (noThrow) return instance;
                    else
                        throw new Error(
                            DIErrors.ScopeViolation(scope.id, entry.$id),
                        );
                }

                // Redirect activation request to nearest allowed parent
                scope = nearestAllowedParent;
            }
        }

        if (!instance) {
            // Attempt to get cached instance from current scope
            instance =
                scope[$locals].get(entry) || activateInstance(entry, scope);

            // Cache the instance in scope locals if lifecycle is not transient
            if (entry.lifecycle !== "transient")
                scope[$locals].set(entry, instance);
        }

        return blueprint.callMw("onResolve", 1, entry, instance, scope);
    }

    function onRequestMiddleware(scope, entry, type, name) {
        blueprint.callMw("onRequest", -1, entry, scope, type, name);
        return entry;
    }

    function assertScopeNotDisposedToResolve(type, name) {
        if (this[$state].disposed)
            throw new Error(
                DIErrors.InstanceAccessAfterDispose(
                    makeEntryId(type, name),
                    this.id,
                    this.path,
                ),
            );
    }

    var scopePrototype = {
        get isDisposed() {
            return this[$state].disposed;
        },

        get(type, name) {
            assertScopeNotDisposedToResolve.call(this, type, name);
            var entry = blueprint.findEntry(type, name);
            if (!entry)
                throw new Error(DIErrors.TypeBindingNotFound(type, name));

            onRequestMiddleware(this, entry, type, name);
            return getInstance(this, entry);
        },

        maybe(type, name) {
            assertScopeNotDisposedToResolve.call(this, type, name);
            var entry = blueprint.findEntry(type, name);
            if (!entry) return undefined;

            onRequestMiddleware(this, entry, type, name);
            return getInstance(this, entry, true);
        },

        getAll(type, name) {
            assertScopeNotDisposedToResolve.call(this, type, name);
            return blueprint
                .findAllEntries(type, name)
                .map((entry) => onRequestMiddleware(this, entry, type, name))
                .map((entry) => getInstance(this, entry, true));
        },

        providerOf(type, name) {
            assertScopeNotDisposedToResolve.call(this, type, name);
            var entry = blueprint.findEntry(type, name);
            if (!entry)
                throw new Error(DIErrors.TypeBindingNotFound(type, name));

            var scope = this;

            // Use a custom function name to help with debugging and stack traces
            var providerFuncName = "provider<" + entry.$id + ">";
            return {
                // Deanonymize the function by giving it a specific name
                [providerFuncName]: function () {
                    onRequestMiddleware(scope, entry, type, name);
                    return getInstance.call(scope, scope, entry);
                },
            }[providerFuncName];
        },

        hasChildScope(id) {
            return this[$scopes].has(id);
        },

        scope(id, options) {
            if (this[$state].disposed)
                throw new Error(
                    DIErrors.ChildScopeCreationAfterDispose(
                        id,
                        this.id,
                        this.path,
                    ),
                );

            // Walk up the scope hierarchy to find a scope with the matching ID.
            // Used to return an already existing parent scope instead of creating a duplicate.
            for (var scope = this; scope; scope = scope[$parent])
                if (scope.id === id) return scope;

            // Disallow creating child scopes from sealed scope
            if (this.sealed) throw new Error(DIErrors.SealedScope(this.id, id));

            var scopesMap = this[$scopes];

            var scope = scopesMap.get(id);
            if (scope) return scope;

            scope = Object.freeze(
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
                if (
                    hasSymbolDispose &&
                    typeof inst[Symbol.dispose] === "function"
                )
                    inst[Symbol.dispose]();
                else if (typeof inst.dispose === "function") inst.dispose();
            });
            this[$locals].clear();
        },
    };

    // istanbul ignore next
    if (hasSymbolDispose)
        scopePrototype[Symbol.dispose] = scopePrototype.dispose;

    var rootScope = Object.freeze(
        Object.setPrototypeOf(
            createScopeObject(""),
            // Preventing illegal mutations of the scope prototype
            Object.freeze(scopePrototype),
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
            typeEntry.lifecycle === "singleton" &&
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

export function createContainerBuilder(builderOptions) {
    /** The default lifecycle to use when a binding does not explicitly define one. */
    var defaultLifecycle =
        (builderOptions && builderOptions.lifecycle) || "singleton";

    /** The default conflict resolution strategy to use for bindings. */
    var defaultConflictResolve =
        (builderOptions && builderOptions.ifConflict) || "throw";

    var blueprint = createContainerBlueprint();

    var hasSomeSafeFactory = false;
    var requiredTypes = new Set();
    var moduleStack = [];

    // region INTERNAL METHODS

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
     * @throws {DIErrors.BindingConflict} If a binding conflict exists and the strategy is `"throw"` or undefined.
     * @internal
     */
    function verifyBinding(id, strategy, lifecycle) {
        var isAlias = false;
        var existEntry = blueprint.findEntry(id);
        if (!existEntry) {
            existEntry = blueprint.findAlias(id);
            isAlias = true;
        }

        if (existEntry) {
            strategy ||= defaultConflictResolve;
            if (strategy === "keep") return true;
            if (!strategy || strategy === "throw")
                throw new Error(DIErrors.BindingConflict(id));

            // Check lifecycle consistency
            // Only applies when appending to an existing binding
            // Skip if either binding is an instance (have no lifecycle)
            if (
                !isAlias &&
                strategy === "append" &&
                lifecycle &&
                existEntry.lifecycle &&
                existEntry.lifecycle !== lifecycle
            ) {
                throw new Error(
                    DIErrors.MixedLifecycleBindings(
                        id,
                        existEntry.lifecycle,
                        lifecycle,
                    ),
                );
            }
        }
        return false;
    }

    // endregion INTERNAL METHODS

    // region PUBLIC METHODS

    function requireType(type, name) {
        requiredTypes.add(makeEntryId(type, name));
        return this;
    }

    function bindInstance(type, instance, options) {
        var $id = makeEntryId(type, options && options.name);
        var ifConflict = options && options.ifConflict;

        if (verifyBinding($id, ifConflict)) return this;

        blueprint.addTypeEntry(
            $id,
            {
                $id,
                type,
                instance,
                name: options && options.name,
                module: moduleStack[moduleStack.length - 1],
                allowedScopes: options && options.allowedScopes,
                meta: options && options.meta,
            },
            ifConflict === "append",
        );
        return this;
    }

    function bindFactory(type, factory, options) {
        var $id = makeEntryId(type, options && options.name);
        var ifConflict = options && options.ifConflict;
        var lifecycle = (options && options.lifecycle) || defaultLifecycle;

        if (verifyBinding($id, ifConflict, lifecycle)) return this;

        blueprint.addTypeEntry(
            $id,
            {
                $id,
                type,
                factory,
                lifecycle,
                name: options && options.name,
                module: moduleStack[moduleStack.length - 1],
                allowedScopes: options && options.allowedScopes,
                meta: options && options.meta,
            },
            ifConflict === "append",
        );
        return this;
    }

    function bindSafeFactory(type, injector, factory, options) {
        var $id = makeEntryId(type, options && options.name);
        var ifConflict = options && options.ifConflict;
        var lifecycle = (options && options.lifecycle) || defaultLifecycle;

        if (verifyBinding($id, ifConflict, lifecycle)) return this;

        blueprint.addTypeEntry(
            $id,
            {
                $id,
                type,
                injector,
                factory,
                lifecycle,
                name: options && options.name,
                module: moduleStack[moduleStack.length - 1],
                allowedScopes: options && options.allowedScopes,
                meta: options && options.meta,
            },
            ifConflict === "append",
        );
        hasSomeSafeFactory = true;
        return this;
    }

    function when(condition, delegate) {
        if (condition) delegate(this);
        return this;
    }

    function bindAlias(type, originType, options) {
        var $aliasId = makeEntryId(type, options && options.name);
        var ifConflict = options && options.ifConflict;

        if (verifyBinding($aliasId, ifConflict)) return this;

        blueprint.addAlias(
            $aliasId,
            originType,
            options && options.originName,
            ifConflict === "append",
        );
        return this;
    }

    function use(middleware) {
        blueprint.addMw(middleware);
        if (middleware.onUse) middleware.onUse(this);
        return this;
    }

    function include(m) {
        if (!blueprint.hasMod(m)) {
            blueprint.addMod(m);
            moduleStack.push(m);
            m.delegate(this);
            moduleStack.pop();
        }
        return this;
    }

    function requireTypesFromSafeFactories() {
        if (!hasSomeSafeFactory) return;

        var dryRunScope = {
            get: (type, name) => (requireType(type, name), {}),
            maybe: () => undefined,
            getAll: () => [],
        };

        blueprint.entries.forEach((entry) => {
            if (typeof entry.injector === "function")
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

    function build() {
        // Compile aliases
        blueprint.compileAliases();

        // Collect required types from safe factories
        requireTypesFromSafeFactories();

        // Required types verification
        requiredTypes.forEach(($id) => {
            if (!blueprint.entries.has($id))
                throw new Error(DIErrors.MissingRequiredTypeError($id));
        });

        return createRootContainerScope(blueprint);
    }

    // endregion PUBLIC METHODS

    return {
        has: blueprint.has,
        hasModule: blueprint.hasMod,
        hasMiddleware: blueprint.hasMw,
        findEntry: blueprint.findEntry,
        findAllEntries: blueprint.findAllEntries,
        getAliasOrigin: blueprint.getAliasOrigin,
        requireType,
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

export function staticModule(name) {
    return {
        create: (delegate) => {
            return {
                name,
                delegate,
                type: "static",
            };
        },
    };
}
