# @spirex/eslint-plugin-di

ESLint plugin with static analysis rules for `@spirex/di` container configuration. Detects binding conflicts, lifecycle mismatches, circular dependencies, and other common mistakes before runtime.

## Requirements

- **Node.js** >= 18
- **ESLint** >= 9 (flat config)
## Installation

```shell
npm install --save-dev @spirex/eslint-plugin-di
```

## Configuration

Add the plugin to your `eslint.config.mjs`:

```javascript
import spirexDI from "@spirex/eslint-plugin-di";

export default [
    spirexDI.configs.recommended,
    {
        files: ["src/**/*.{js,ts,jsx,tsx}"],
    },
];
```

## Rules

| Rule | Description | Severity |
|------|-------------|----------|
| `@spirex/di/no-duplicate-binding` | Disallow duplicate bindings for the same token without a conflict resolution strategy | error |
| `@spirex/di/no-undefined-instance` | Disallow binding `undefined` as an instance value | error |
| `@spirex/di/no-missing-build` | Require that `diBuilder()` calls are followed by `.build()` | warn |
| `@spirex/di/no-lifecycle-mismatch` | Disallow mixed lifecycles with `ifConflict: "append"` for the same token | error |
| `@spirex/di/no-circular-dependency` | Detect dependency cycles via `factory.inject` and injector analysis | error |
| `@spirex/di/no-alias-cycle` | Detect alias chains that form cycles | error |
| `@spirex/di/no-dangling-alias` | Detect aliases pointing to non-existent bindings | error |
| `@spirex/di/no-missing-required-type` | Detect `requireType` references to unbound tokens | warn |
| `@spirex/di/no-unresolved-token` | Cross-file: detect `get()` calls for tokens not bound anywhere | error |
| `@spirex/di/no-unused-binding` | Cross-file: detect bindings never resolved | warn |

## Rule Details

### `@spirex/di/no-duplicate-binding`

Detects when the same `(token, name)` pair is bound multiple times in a builder without specifying an `ifConflict` strategy. At runtime, this would throw `Error: Binding exists: 'token'`.

**Incorrect:**
```javascript
diBuilder()
    .bindFactory("logger", loggerFactory)
    .bindFactory("logger", otherLoggerFactory) // Error: duplicate
    .build();
```

**Correct:**
```javascript
diBuilder()
    .bindFactory("logger", loggerFactory)
    .bindFactory("logger", otherLoggerFactory, { ifConflict: "replace" })
    .build();
```

### `@spirex/di/no-undefined-instance`

Detects `bindInstance(token, undefined)` which throws `TypeError` at runtime.

**Incorrect:**
```javascript
builder.bindInstance("config", undefined);
```

### `@spirex/di/no-missing-build`

Warns when `diBuilder()` is called but `.build()` is never invoked, meaning the container is never instantiated.

### `@spirex/di/no-lifecycle-mismatch`

Detects when `ifConflict: "append"` bindings for the same token have different lifecycles, which throws at runtime.

**Incorrect:**
```javascript
builder
    .bindFactory("handler", aHandler, { ifConflict: "append", lifecycle: "singleton" })
    .bindFactory("handler", bHandler, { ifConflict: "append", lifecycle: "transient" });
```

## Related

- [`@spirex/di`](https://github.com/SpireX64/spirex-di) — The DI library
- [`spirex-di-vscode`](../../tools/vscode-plugin) — VSCode/Cursor extension
