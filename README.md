# SpireX/DI

![NPM Type Definitions](https://img.shields.io/npm/types/%40spirex%2Fdi?style=for-the-badge)
[![NPM Version](https://img.shields.io/npm/v/%40spirex%2Fdi?style=for-the-badge)](https://www.npmjs.com/package/@spirex/di)
![GitHub License](https://img.shields.io/github/license/spirex64/spirex-di?style=for-the-badge)
[![Codecov](https://img.shields.io/codecov/c/github/spirex64/spirex-di?token=VXQZK5WDSY&flag=di&style=for-the-badge)](https://codecov.io/github/SpireX64/spirex-di)


`@spirex/di` is a **powerful**, **safe**, **flexible**, and **lightweight** dependency injection library designed for JS/TS projects of any complexity. It offers **strict static typing** with an **immutable container**, ensuring reliability and clarity in your code. With **zero dependencies**, it works in any modern JavaScript environment out of the box — true **plug & play**.

## Features
- **Immutable container** — no hidden runtime mutations;
- **Maximum type safety** — full autocompletion & compile-time checks;
- **Modular** — static & dynamic modules;
- **Advanced scope management** with auto-dispose;
- **Lifecycle management** — singleton, lazy, scope, transient;
- Middleware support;
- Named bindings, aliases & conflict resolution strategies.
- Zero dependencies, runs on pure JS, **only ~9KB**.

## Install
```sh
npm install @spirex/di
# or
yarn add @spirex/di
```

## Quick start
```ts
import { diBuilder, factoryOf } from "@spirex/di";

class Gateway { ... }

class Service {
    static inject = ['gateway'] as const
    constructor(gateway: Gateway) {...}
    doSomething(): void { ... }
}

// Create a DI container with strict type mapping
const container = diBuilder<{
    gateway: Gateway; // Key 'gateway' maps to Gateway instance
    service: Service; // Key 'service' maps to Service instance
}>()
    // Bind 'service' to a factory
    // that resolves its dependencies from the container
    .bindFactory("service", factoryOf(Service))

    // Bind 'gateway' to a Gateway factory
    .bindFactory("gateway", factoryOf(Gateway))

    // Build the container;
    // after this, it becomes immutable & ready to use
    .build();

// Retrieve the 'service' instance from the container
const service = container.get("service");
```

**Explanation:**
1. We define *Gateway* and *Service* classes. *Service* depends on *Gateway*.
2. We create a strictly typed container using diBuilder<TypeMap>().
3. `.bindFactory` is used to register services with dependencies.
4. `.build()` finalizes the container.
5. `.get("service")` returns the fully constructed *Service* with *Gateway* automatically injected.

## Integrations & Extensions
Container is designed to be fully extensible and works seamlessly with additional packages to enhance functionality:

### SpireX/DI Dynamic Modules
`@spirex/di-dynamic` 

Adds support for **dynamic modules**, allowing you to load parts of your container asynchronously at runtime. Perfect for *code-splitting* and modular applications.

[![codecov](https://codecov.io/github/SpireX64/spirex-di/graph/badge.svg?token=VXQZK5WDSY&flag=di-dynamic)](https://codecov.io/github/SpireX64/spirex-di)

```ts
import type { CartService } from "./features/cart"

const CartModule = dynamicModule(
    "CartModule",
    () => import("./features/cart/index.ts"),
).create<{
    cart: CartService,
}>((binder, { CartService }) => {
    binder.bindFactory("cart", factoryOf(CartService));
});

const container = diBuilder()
    .include(CartModule)

// Before resolve types from dynamic module:
await CartModule.loadAsync()
```

### SpireX/DI Config
`@spirex/di-config`

A middleware that configures services right after they are created. Configure lets you apply post-construction initialization logic without modifying the service factory or class itself, making it easier to extend and reuse modules.

[![codecov](https://codecov.io/github/SpireX64/spirex-di/graph/badge.svg?token=VXQZK5WDSY&flag=di-config)](https://codecov.io/github/SpireX64/spirex-di)

```ts
import { Config } from '@spirex/di-config';

const container = diBuilder()
    .include(SQLiteModule)
    .use(Config({
        sqlite: (sqlite) => { sqlite.file = "db.sqlite" }
    }));
```

### SpireX/DI for React
`@spirex/di-react`

 Provides **ReactJS** integration, including hooks and higher-order components (HoC) for injecting dependencies into components.

[![codecov](https://codecov.io/github/SpireX64/spirex-di/graph/badge.svg?token=VXQZK5WDSY&flag=di-dynamic)](https://codecov.io/github/SpireX64/spirex-di)

```tsx
const { DIRootScope, useInject } = createDIContext<TypeMap>()

const Page: React.VFC = () => {
    const vm = useInject("pageViewModel");
    return <h1>{vm.title}</h1>
}

const App: React.VFC = () => {
    const container = createContainer();

    const reactScope = container.scope("react");
    return (
        <DIRootScope root={reactScope}>
            <DIScope id="page" sealed>
                <Page />
            </DIScope>
        </DIRootScope>
    )
}
```

### SpireX/DI for Svelte
`@spirex/di-svelte`

Provides **Svelte** integration for injecting dependencies into components.

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

## License
`@spirex/di` is released under the MIT License.

You are free to use, modify, and distribute the library in both personal and commercial projects.