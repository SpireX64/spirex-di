# Container Builder

In **SpireX/DI**, you cannot directly create a container instance.  
This is because a container is designed to be **immutable**: once it is built, it cannot be changed anymore.  

To configure the container before it is created, you must use the **builder** returned by the `diBuilder` function.  
The builder provides a fluent API for defining how the container will behave, including which types are available and how they are constructed.


## TypeMap — Defining the Types

The container requires a complete description of all the types it provides.  
This description is given through a **TypeMap**, which is passed as a generic parameter to `diBuilder`.

```ts
type TypeMap = {
  logger: Logger;
  value: number;
};
```

The `TypeMap` is used to enforce strict type checking at every step:

- **All keys** must be explicitly declared in the TypeMap.
- The **types of values** are validated both when binding and when resolving dependencies.
- If a binding refers to an undeclared key, or the type does not match, TypeScript will produce a compilation error.

The function `diBuilder<TypeMap>()` returns a value of type: `IContainerBuilder<TypeMap>`.

```ts
export interface IContainerBuilder<TypeMap extends TTypeMapBase> {
  /** Finalizes the configuration and produces the container */
  build(): IContainerScope<TypeMap>;

  // ... other operator methods (explained in later sections)
}
```

This means:
- The builder is strongly tied to your TypeMap.
- All operator methods (such as bindInstance and bindFactory) use the type information from TypeMap.


## Finalizing the Configuration
The last step in any configuration is calling `.build()`.
This produces a container with type `IContainerScope<TypeMap>`, which is ready to resolve dependencies.

Once `.build()` is called, the container becomes fixed and immutable.
No new bindings can be added, and no existing bindings can be changed.

## The simplest possible container

Here is the simplest possible container.
It has no bindings or logic, so it cannot resolve anything, but it demonstrates the process:

```ts
import { diBuilder } from '@spirex/di';

const container = diBuilder().build();
```

This container is useless because it does not provide any values or services. However, it illustrates the most important principle: all containers are created through a builder.

