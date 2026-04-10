# Setting Up DI for React

The `@spirex/di-react` package provides a **shared React Context** for dependency injection that connects the DI container to the React component tree. Unlike typical context-based integrations, `@spirex/di-react` uses a **single module-level context** — all packages in your application share the same DI tree automatically.

This design supports two complementary API styles:
- **Static typed API** — for applications where the full TypeMap is available.
- **Dynamic typed API** — for multi-package applications where each package only knows a subset of the types.


## Static Typed API

When the full container TypeMap is accessible (typically in single-package applications or at the application root), use `getDIReact<TypeMap>()` to obtain **strictly typed** React components and hooks.

### Extracting the Container TypeMap

To obtain the TypeMap from a container, use the `TypeMapOf<T>` utility type from the core `@spirex/di` package.

```ts
import { diBuilder, TypeMapOf } from "@spirex/di";

export const container = diBuilder()
    .include(HttpModule)
    .include(SecureModule)
    .include(CartModule)
    .include(CatalogModule)
    .build();

export type TypeMap = TypeMapOf<typeof container>;
```

In this example, **TypeMap** automatically reflects all dependencies registered by the included modules. This ensures that only valid dependency keys can be injected into React components.

### Using a Container Configurator Function

If your application builds the container through a _configurator_ function, you can extract the **TypeMap** using TypeScript's built-in `ReturnType<F>` utility.

```ts
import { diBuilder, TypeMapOf } from "@spirex/di";

export function configureContainer() {
    return diBuilder()
        .include(HttpModule)
        .include(SecureModule)
        .include(CartModule)
        .include(CatalogModule)
        .build();
}

export type TypeMap = TypeMapOf<ReturnType<typeof configureContainer>>;
```

This pattern is especially useful when container construction is abstracted or reused across environments (for example, client and server).

### Getting Typed React DI Tools

Once the **TypeMap** is defined, pass it to `getDIReact<TypeMap>()` to obtain typed React integration utilities.

```ts
import { getDIReact } from "@spirex/di-react";
import type { TypeMap } from "./container";

export const {
    DIRootScope,
    DIScope,
    withInject,
    useInject,
} = getDIReact<TypeMap>();
```

The returned object contains fully typed primitives:
- React components for providing DI scopes (`DIRootScope`, `DIScope`);
- A higher-order component for injecting dependencies via props (`withInject`);
- A hook for resolving dependencies inside functional components (`useInject`).

All of them are aware of the container's **TypeMap**, ensuring that dependency keys and resolved values are type-checked at compile time.

> `getDIReact()` always returns the **same underlying functions and components**. Multiple calls return the same references — no new context is created.


## Dynamic Typed API

In multi-package applications, the full TypeMap is typically only available at the application root where the container is assembled. Feature packages that register their own modules do not have access to the complete TypeMap.

For these cases, `@spirex/di-react` exports components and hooks directly at the module level. These exports use `AnyTypeMap` by default and can be **narrowed** via type casts using the `TUseInject` and `TWithInject` utility types.

### Direct Imports

```ts
import { useInject, withInject, DIRootScope, DIScope } from "@spirex/di-react";
```

These are the same functions returned by `getDIReact()`, but typed with `AnyTypeMap`. They work without any type cast — dependency keys are `string` and resolved values are `any`.

### Narrowing Types for a Package

Each package can define a **local TypeMap** from the modules it knows about, and cast the imports accordingly:

```ts
import { useInject, withInject } from "@spirex/di-react";
import type { TUseInject, TWithInject } from "@spirex/di-react";
import type { TypeMapOf } from "@spirex/di";

type LocalTypeMap = TypeMapOf<typeof ModuleA> & TypeMapOf<typeof ModuleB>;

const useTypedInject = useInject as TUseInject<LocalTypeMap>;
const withTypedInject = withInject as TWithInject<LocalTypeMap>;
```

This gives the package **compile-time type safety** for the dependencies it knows about, while still sharing the same underlying React context with the rest of the application.


## Shared Context Architecture

All exports from `@spirex/di-react` — whether obtained via `getDIReact()` or imported directly — share a **single React context** created at module load time.

This means:
- `DIRootScope` provided at the application root is accessible in **every package** that imports from `@spirex/di-react`.
- There is no need to pass context references between packages.
- `getDIReact()`, `createDIContext()`, and direct imports all return the **same function references**.

This architecture enables clean separation of concerns: the application root owns the container and provides `DIRootScope`, while feature packages resolve their dependencies via `useInject` or `withInject` without any coupling to the root module.


## Usage Overview

After initialization, these utilities can be used throughout the React component tree to inject and scope dependencies safely. The root scope typically binds the container to the application, while nested scopes allow controlled lifetimes and overrides.

Each of these primitives is covered in detail in subsequent documentation sections.


-----------------
## Summary

`@spirex/di-react` provides a **shared React context** for dependency injection with two API styles:

- **Static typed** via `getDIReact<TypeMap>()` — returns fully typed components and hooks when the complete TypeMap is available.
- **Dynamic typed** via direct imports — uses `AnyTypeMap` by default, narrowable with `TUseInject<T>` and `TWithInject<T>` type casts for multi-package applications.

Both styles share the same underlying context, ensuring that `DIRootScope` at the application root is accessible from any package.
