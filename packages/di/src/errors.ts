import type { TScopeID } from "./types";

export const Errors = Object.freeze({
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
    InvalidModuleName: (moduleName: string) =>
        `Module name "${moduleName}" is not valid`,
    ModuleNotAvailable: (moduleName: string) =>
        `The requested module '${moduleName}' is not available in the current DI context. Ensure the module is registered before accessing it.`,
    DynamicModuleStubAccess:
        "Cannot access a value from a dynamic module because it has not been loaded yet",
    DynamicModuleFunctionCall: (moduleName: string, funcName: string) =>
        `Cannot call function '${funcName}' on dynamic module '${moduleName}' outside the factory. ` +
        "Ensure the function is used within the type factory context.",
    DynamicModuleConstructorCall: (moduleName: string, ctorName: string) =>
        `Cannot instantiate '${ctorName}' from dynamic module '${moduleName}' outside the factory. ` +
        "Ensure class instantiation happens within the factory context.",
    DynamicModuleModification: (moduleName: string, propName: string) =>
        `Cannot modify property '${propName}' of dynamic module '${moduleName}' outside the factory. ` +
        "Dynamic module values are read-only outside the factory context.",
    DynamicModuleNotLoaded: (moduleName: string, memberName: string) =>
        `Cannot access '${memberName}' from dynamic module '${moduleName}' because the module has not been loaded yet. ` +
        "Ensure the module is loaded before use.",
    NonObjectPropertySet: (propName: string, valueType: string) =>
        `Cannot create property '${propName}' on ${valueType}`,
    MiddlewareEntryTypeMismatch: (
        middlewareName: string,
        middlewareEntryId: string,
        originEntryId: string,
    ) =>
        `Middleware '${middlewareName}' altered the entry type: Expected '${middlewareEntryId}', but received '${originEntryId}`,
});
