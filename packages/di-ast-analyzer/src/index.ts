// Types
export type {
    DIBindingRef,
    SourceLocation,
    DIBindingKind,
    DIResolveMethod,
    DIResolveSource,
    DIResolverDependency,
    DIBinding,
    DIResolution,
    DIModuleDefinition,
    DIBuilderContext,
    DIFileModel,
    DIImportInfo,
} from "./types.js";

export {
    makeBindingRef,
    bindingRefId,
    bindingRefsEqual,
} from "./types.js";

// Patterns
export {
    isDIBuilderCall,
    extractBuilderOptions,
    isBindCall,
    isBindFactoryCall,
    isBindInstanceCall,
    isBindSafeFactoryCall,
    isBindAliasCall,
    isRequireTypeCall,
    isIncludeCall,
    isUseCall,
    isWhenCall,
    isInjectIntoCall,
    isBuildCall,
    isStaticModuleCreate,
    isStaticModuleCompose,
    isDynamicModuleCreate,
    extractModuleId,
    isFactoryOfCall,
    extractFactoryOfDeps,
    isResolveCall,
    getResolveMethodName,
    isUseInjectCall,
    isWithInjectCall,
    isSetDIScopeCall,
    isSetDIRootScopeCall,
    extractStringToken,
    extractBindingOptions,
    extractAliasOptions,
    extractInjectArray,
    extractInjectorDeps,
    collectFactoryResolverDeps,
} from "./patterns.js";

export type {
    BuilderOptions,
    BindingOptionsResult,
    AliasOptionsResult,
} from "./patterns.js";

// Collector
export { collectFileModel } from "./collector.js";

// Graph algorithms
export {
    findDependencyCycles,
    findAliasCycles,
    findConflicts,
    findLifecycleMismatches,
    findDanglingAliases,
    findUnresolved,
    findUnused,
    findMissingRequired,
} from "./graph.js";

export type {
    CycleResult,
    ConflictResult,
    LifecycleMismatchResult,
    DanglingAliasResult,
    UnresolvedResult,
    UnusedResult,
    MissingRequiredResult,
} from "./graph.js";
