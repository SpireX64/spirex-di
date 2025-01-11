import type { TScopeID } from "./types";

export const Errors = {
    TypeBindingNotFound: (type: string) => `Type binding ${type} not found.`,
    EmptyContainer:
        "Container building failed. Cannot create a container without bindings. " +
        "Please bind at least one service or value using 'bindInstance' or 'bindFactory'.",
    BindingConflict: (type: string) =>
        `Binding conflict. The type '${type}' is already bound.`,
    ScopeClosed: (scopeId: TScopeID, entryId: string) =>
        `The requested instance '${entryId}' cannot be resolved because the scope '${scopeId.toString()}' has already been closed. ` +
        "Ensure the scope remains open while resolving services or refactor your application to handle closed scopes appropriately.",
    ParentScopeClosed: (parentScopeId: TScopeID, childScopeId: TScopeID) =>
        `Cannot open a child scope '${childScopeId.toString()}' because the parent scope '${parentScopeId.toString()}' has already been closed. ` +
        "Ensure the parent scope is open before attempting to create child scopes.",
} as const;
