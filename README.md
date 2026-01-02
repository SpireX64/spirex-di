# SpireX/DI

![NPM Type Definitions](https://img.shields.io/npm/types/%40spirex%2Fdi?style=for-the-badge)
[![NPM Version](https://img.shields.io/npm/v/%40spirex%2Fdi?style=for-the-badge)](https://www.npmjs.com/package/@spirex/di)
![GitHub License](https://img.shields.io/github/license/spirex64/spirex-di?style=for-the-badge)
[![Codecov](https://img.shields.io/codecov/c/github/spirex64/spirex-di?token=VXQZK5WDSY&flag=di&style=for-the-badge)](https://codecov.io/github/SpireX64/spirex-di)


`@spirex/di` is a **powerful**, **lightweight**, and **predictable** dependency injection library for JavaScript and TypeScript. 

It enforces strict TypeScript typing through a **TypeMap**, uses an **immutable container** built via a fluent builder API, and supports **modular**, reusable configurations. With **zero dependencies**, **advanced scope management**, and **extensible middleware**, it keeps your code clean, testable, and flexible without imposing any runtime boilerplate. 

Fully **plug & play** and production-ready, **SpireX/DI** is ideal for enterprise projects, helping teams manage complex service graphs effortlessly while simplifying long-term maintenance.

## Features
- **Immutable container** — no hidden runtime mutations;
- **Maximum type safety** — full autocompletion & compile-time checks;
- **Modular** — static & dynamic modules;
- **Advanced scope management** with auto-dispose;
- **Lifecycle management** — singleton, lazy, scope, transient;
- Middleware support;
- Named bindings, aliases & conflict resolution strategies.
- Zero dependencies, runs on pure JS, **only ~9.2KB** (~3.4kb gzipped).

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

## Documentation
- [Introduction](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/00-Introduction.md)
- [Philosophy](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/01-Philosophy.md)
- [Installation](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/03-Installation.md)
- [Getting Started](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/04-Getting-Started.md)
- **Basics**
  - Container Configuration
    - [Container Builder](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/01-Container-Builder.md)
    - [About TypeMap](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/02-Type-Map.md)
    - [Instance Binding](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/03-Instance-Binding.md)
    - [Factory Binding](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/04-Factory-Binding.md)
    - [Safe Factory Binding](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/05-Safe-Factory-Binding.md)
    - [Class Factory](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/06-Class-Factory.md)
    - [Named Binding](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/07-Named-Binding.md)
    - [Binding Conflicts](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/08-Bindings-Conflict.md)
    - [Multiple Binding](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/09-Multi-Bindings.md)
    - [Lifecycles](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/10-Lifecycles.md)
    - [Aliases](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/11-Aliases.md)
    - [Container Build](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/01-Container-Configuration/12-Container-Build.md)
  - Modules
    - [Static Modules](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/02-Modules/01-Static-Modules.md)
    - [Module Dependencies](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/02-Modules/02-Module-Dependencies.md)
  - Resolving Instances
    - [Type Enumeration](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/03-Resolving-Instances/01-Types-Enumeration.md)
    - [Get Instance of Type](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/03-Resolving-Instances/02-Get-Instance-Of-Type.md)
    - [Getting optional instances](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/03-Resolving-Instances/03-Get-Optional-Instance.md)
    - [Getting all instances of a type](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/03-Resolving-Instances/04-Get-All-Instances-Of-Type.md)
    - [Provider Functions](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/03-Resolving-Instances/05-Get-Provider-Function.md)
    - [Phantom Instance](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/05-Basics/03-Resolving-Instances/06-Get-Phantom-Instance.md)
- **Advanced**
  - Container Builder
    - [Container Builder Default Options](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/06-Advanced/01-Container-Builder/01-Default-Options.md)
    - [Enforcing Type Bindings](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/06-Advanced/01-Container-Builder/02-Enforcing-Type-Bindings.md)
    - [Injecting Dependencies into Existing Services](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/06-Advanced/01-Container-Builder/03-Injecting-Into-Existing-Instances.md)

_(Work In Progress)_


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
