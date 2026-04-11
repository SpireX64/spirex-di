# SpireX/DI for Svelte

`@spirex/di-svelte`

Context-based integration for **[@spirex/di](https://github.com/SpireX64/spirex-di)** in Svelte apps.

![NPM Type Definitions](https://img.shields.io/npm/types/%40spirex%2Fdi-svelte?style=for-the-badge)
[![NPM Version](https://img.shields.io/npm/v/%40spirex%2Fdi-svelte?style=for-the-badge)](https://www.npmjs.com/package/@spirex/di-svelte)
[![Codecov](https://img.shields.io/codecov/c/github/spirex64/spirex-di?token=VXQZK5WDSY&flag=di-svelte&style=for-the-badge)](https://codecov.io/github/SpireX64/spirex-di)
![GitHub License](https://img.shields.io/github/license/spirex64/spirex-di?style=for-the-badge)

## Usage

Call **`setDIRootScope`** once you have an `IContainerScope` (usually from your root container). Use **`setDIScope(id, options?)`** to open a child scope for a subtree; it is disposed when the component is destroyed. **`useInject`** resolves a binding from the current scope.

```ts
// ./di/context.ts — optional: narrow types for your app TypeMap
import { getDISvelte } from "@spirex/di-svelte";
import type { TypeMap } from "./container";

export const { setDIRootScope, setDIScope, useInject } =
    getDISvelte<TypeMap>();
```

```svelte
<!-- ./App.svelte -->
<script lang="ts">
    import { createContainer } from "./di/container";
    import { setDIRootScope } from "./di/context";

    const container = createContainer();
    const uiScope = container.scope("ui");

    setDIRootScope(uiScope);
</script>

<slot />
```

```svelte
<!-- ./page.svelte -->
<script lang="ts">
    import { useInject } from "./di/context";

    const t = useInject("i18n").translate;
    const viewModel = useInject("viewModel");
</script>

<div>
    <h1>{t(viewModel.textTitle)}</h1>
    <button onclick={viewModel.onAction}>
        {t(viewModel.textButton)}
    </button>
</div>
```

Nested scope:

```svelte
<script lang="ts">
    import { setDIScope } from "./di/context";
    setDIScope("screen", { isolated: false });
</script>
```

Selector form (second argument is `IScopeContext`, aligned with `@spirex/di`):

```ts
const { a, path } = useInject((r, ctx) => ({
    a: r.get("serviceA"),
    path: ctx.path,
}));
```

## Multi-package projects (dynamic vs strict typing)

The package exports **dynamically typed** `useInject` / `setDIScope` / `setDIRootScope` (wide `TypeMap`). In an app that merges several modules’ containers, **narrow** with `getDISvelte<YourMergedTypeMap>()` or cast:

```ts
import { useInject } from "@spirex/di-svelte";
import type { TUseInject } from "@spirex/di-svelte";
import type { TypeMapOf } from "@spirex/di";

type AppTypeMap = TypeMapOf<typeof moduleA> & TypeMapOf<typeof moduleB>;
const inject = useInject as TUseInject<AppTypeMap>;
```

There is a **single module-level context key**; all packages must depend on the same `@spirex/di-svelte` version (peer) so the context is shared.

## Errors

If no scope was provided above in the tree, `useInject` and `setDIScope` throw **`No DI scope in context`**.
