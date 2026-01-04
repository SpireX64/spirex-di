# Dependency Injection Context for React

When integrating a dependency injection (DI) container with a React application, it is important to connect the container lifecycle and type system to the React component tree. The `@spirex/di-react` package addresses this by providing a **dedicated factory** that creates a **typed React Context** specifically designed for dependency injection.

This approach allows React components to resolve dependencies directly from the DI container
while preserving full TypeScript type safety and IDE autocompletion.


## Creating a Typed DI Context
The `@spirex/di-react` package exposes a factory function called `createDIContext<T>()`. This factory creates a React Context along with a set of helper components, hooks, and higher-order components (HOCs) for dependency injection.

To enable strong typing, `createDIContext()` requires the **TypeMap** of the container. The TypeMap represents all registered dependency keys and their resolved types, allowing TypeScript to **validate injections at compile time**.


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
If your application builds the container through a _configurator_ function, you can extract the **TypeMap** using TypeScript’s built-in `ReturnType<F>` utility.

```ts
import { diBuilder, TypeMapOf } from "@spirex/di";

export function configureContainer() {
    return diBuilder()
        .include(HttpModule)
        .include(SecureModule)
        .include(CartModule)
        .include(CatalogModule);
}

export type TypeMap = TypeMapOf<ReturnType<typeof configureContainer>>;
```

This pattern is especially useful when container construction is abstracted or reused across environments (for example, client and server).

### Initializing the React DI Context
Once the **TypeMap** is defined, it can be passed to `createDIContext<T>()` to generate typed React integration utilities.

```ts
import { createDIContext } from "@spirex/di-react";
import type { TypeMap } from "./container";

export const {
    DIRootScope,
    DIScope,
    withDIScope,
    withInject,
    useInject,
} = createDIContext<TypeMap>();
```


The factory returns a set of fully typed primitives:
- React components for providing DI scopes;
- Higher-order components for injecting dependencies;
- A hook for resolving dependencies inside functional components.

All of them are aware of the container’s **TypeMap**, ensuring that dependency keys and resolved values are type-checked.


## Usage Overview
After initialization, these utilities can be used throughout the React component tree to inject and scope dependencies safely. The root scope typically binds the container to the application, while nested scopes allow controlled lifetimes and overrides.

Each of these primitives is covered in detail in subsequent documentation sections.


-----------------
## Summary
`@spirex/di-react` integrates a DI container with React by generating a **typed React Context** through `createDIContext<T>()`. 

By deriving a **TypeMap** from the container using `TypeMapOf`, dependency injection becomes **fully type-safe and IDE-friendly**. The factory returns components, HOCs, and hooks that seamlessly connect the container to the React component tree.

This approach ensures predictable dependency resolution while preserving strong TypeScript guarantees.
