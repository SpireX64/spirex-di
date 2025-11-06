# SpireX/DI for Svelte
`@spirex/di-svelte`

Provides **Svelte** integration for injecting dependencies into components.

![NPM Type Definitions](https://img.shields.io/npm/types/%40spirex%2Fdi-svelte?style=for-the-badge)
[![NPM Version](https://img.shields.io/npm/v/%40spirex%2Fdi-svelte?style=for-the-badge)](https://www.npmjs.com/package/@spirex/di-svelte)
[![Codecov](https://img.shields.io/codecov/c/github/spirex64/spirex-di?token=VXQZK5WDSY&flag=di-svelte&style=for-the-badge)](https://codecov.io/github/SpireX64/spirex-di)
![GitHub License](https://img.shields.io/github/license/spirex64/spirex-di?style=for-the-badge)

```ts
// ./di/context
import { createDIContext, DIScope } from "@spirex/di-svelte"
import type { TypeMap } from "./container"

export const {
    setDIRootScope,
    setDIScope,
    useInject,
} = createDIContext<TypeMap>()
```

```svelte
<!-- ./app.svelte -->
<script lang="ts">
    import { createContainer } from "./di/container";
    import { setDIRootScope } from "./di/context";

    const container = createContainer();
    const uiScope = container.scope('ui');

    setDIRootScope(uiScope)
</script>

<slot/>
```

```svelte
<!-- ./page.svelte -->
<script lang="ts">
    import { useInject } from "./di/context"

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
