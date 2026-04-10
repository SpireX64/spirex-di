# @spirex/di-ast-analyzer

AST analysis core for `@spirex/di` tooling. Provides pattern matchers, DI model collector, and graph algorithms for static analysis of DI container configurations.

## Requirements

- **Node.js** >= 18
- **ESTree-compatible AST** (from ESLint, `@typescript-eslint/parser`, or similar)


## API Overview

### Types (`types`)

DI domain model types that reuse `@spirex/di` types where applicable:

- `DIBindingRef` — binding identity (`{ type, name }`) aliased from `TBindingRef`
- `DIBinding` — represents a binding extracted from AST
- `DIResolution` — represents a resolution call (`get`, `maybe`, etc.)
- `DIModuleDefinition` — module definition from `staticModule` / `dynamicModule`
- `DIBuilderContext` — all bindings and metadata from a single `diBuilder()` context
- `DIFileModel` — complete analysis result for a single file

Utility functions: `makeBindingRef()`, `bindingRefId()`, `bindingRefsEqual()`

### Patterns (`patterns`)

AST pattern matchers for `@spirex/di` API calls. All work with ESTree `CallExpression` nodes:

- **Builder**: `isDIBuilderCall`, `extractBuilderOptions`
- **Bindings**: `isBindFactoryCall`, `isBindInstanceCall`, `isBindSafeFactoryCall`, `isBindAliasCall`
- **Modules**: `isStaticModuleCreate`, `isStaticModuleCompose`, `isDynamicModuleCreate`
- **Resolution**: `isResolveCall`, `isUseInjectCall`, `isWithInjectCall`
- **Extractors**: `extractStringToken`, `extractBindingOptions`, `extractInjectorDeps`

### Collector (`collector`)

- `collectFileModel(ast, filePath)` — traverses an ESTree Program AST and produces a `DIFileModel`

### Graph (`graph`)

- `findDependencyCycles(bindings)` — Tarjan's SCC for dependency cycle detection
- `findAliasCycles(bindings)` — DFS cycle detection on alias chains
- `findConflicts(bindings)` — duplicate bindings without conflict strategy
- `findLifecycleMismatches(bindings)` — append bindings with mixed lifecycles
- `findDanglingAliases(bindings)` — aliases pointing to non-existent bindings
- `findUnresolved(resolutions, bindings)` — resolution calls with no matching binding
- `findUnused(bindings, resolutions)` — bindings never resolved
- `findMissingRequired(requiredTypes, bindings)` — required types without bindings

## Usage Example

```typescript
import { parse } from "@typescript-eslint/parser";
import { collectFileModel, findConflicts } from "@spirex/di-ast-analyzer";

const ast = parse(sourceCode, { loc: true, range: true });
const model = collectFileModel(ast, "src/container.ts");

for (const builder of model.builders) {
    const conflicts = findConflicts(builder.bindings);
    for (const c of conflicts) {
        console.log(`Duplicate binding: ${c.ref.type}`);
    }
}
```
