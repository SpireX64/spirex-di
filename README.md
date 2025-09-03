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
import { diBuilder } from "@spirex/di";

class Gateway { ... }

class Service {
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
    .bindFactory("service", r => new Service(r.get("gateway")))

    // // Bind 'gateway' to a factory that creates a new Gateway
    .bindFactory("gateway", r => new Gateway())

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

### SpireX/DI for React
`@spirex/di-react`

 Provides **ReactJS** integration, including hooks and higher-order components (HoC) for injecting dependencies into components.

[![codecov](https://codecov.io/github/SpireX64/spirex-di/graph/badge.svg?token=VXQZK5WDSY&flag=di-dynamic)](https://codecov.io/github/SpireX64/spirex-di)

## License
`@spirex/di` is released under the MIT License.

You are free to use, modify, and distribute the library in both personal and commercial projects.