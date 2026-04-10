# SpireX DI — VSCode Extension

Navigation, autocomplete, and analysis for `@spirex/di` projects in VSCode and Cursor.

## Requirements

- **VSCode** >= 1.85 / **Cursor**
- Project using **@spirex/di** >= 1.0

## Installation

Search "SpireX DI" in the Extensions panel, or:

```bash
code --install-extension spirex.spirex-di
```

## Features

### Go to Definition

Place your cursor on a DI token string (e.g., `"logger"` in `scope.get("logger")`) and press F12 to jump to its binding location.

Supported contexts: `scope.get()`, `scope.maybe()`, `useInject()`, `bindAlias()`, `factory.inject`, `setDIScope()`.

### Find All References

Right-click a DI token and select "Find All References" to see all binding and resolution sites across the project.

### Hover Information

Hover over a token string to see binding details: kind, lifecycle, module, dependencies, allowed scopes, and more.

### Autocomplete

Start typing a token inside DI method string arguments to get autocomplete suggestions with binding metadata:

- `scope.get("` → shows all bound tokens
- `useInject("` → shows all bound tokens
- `bindAlias("x", "` → shows all bound tokens

### CodeLens

See reference counts above each binding declaration. Click to open the references panel.

### Container Explorer

Tree view in the Explorer sidebar showing the DI container structure: modules, bindings grouped by module, lifecycle badges, and dependency counts.

### Dependency Graph

Run "SpireX DI: Show Dependency Graph" to open an interactive force-directed graph showing token dependencies, color-coded by lifecycle. Cycles are highlighted in red.

### Rename Token

Rename a DI token string across all files — binding sites, resolution sites, alias references, inject arrays, and framework integration calls.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `spirexDI.enableDiagnostics` | `true` | Enable real-time DI diagnostics |
| `spirexDI.enableCodeLens` | `true` | Show reference counts above DI bindings |

## Commands

| Command | Description |
|---------|-------------|
| `SpireX DI: Show Dependency Graph` | Open interactive dependency graph |
| `SpireX DI: Refresh Index` | Manually refresh the DI project index |

## Supported Frameworks

The extension recognizes resolution patterns from:
- `@spirex/di` — `scope.get()`, `scope.maybe()`, `scope.getAll()`, `scope.providerOf()`, `scope.phantomOf()`
- `@spirex/di-react` — `useInject()`, `withInject()`, `<DIScope>`
- `@spirex/di-svelte` — `useInject()`, `setDIScope()`

## Related

- [`@spirex/di`](https://github.com/SpireX64/spirex-di) — The DI library
- [`@spirex/eslint-plugin-di`](../../tools/eslint-plugin) — ESLint rules for DI configuration
