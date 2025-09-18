# TypeMap

At the core of **SpireX/DI** lies the concept of a **TypeMap**.  
A `TypeMap` is a TypeScript type definition that describes the set of **all services and values** that the container can provide.


## Defining a TypeMap

A `TypeMap` is a plain TypeScript object type declaration, where:
- **Keys** are strings (service identifiers);
- **Values** are the static types of the corresponding services or values.

```ts
type TypeMap = {
  logger: Logger;
  config: Config;
  attempts: number;
};
```

This `TypeMap` declares that the container may provide:
- A "logger" implementing the `Logger` type.
- A "config" implementing the `Config` type.
- A "attempts" of type `number`.


## Why String Keys?
Unlike some DI libraries that use classes or symbols as identifiers,
**SpireX/DI uses strings only**.

The reasons are:

1. **Simplicity** – Strings are the natural keys in plain JavaScript objects.You cannot declare a class or a symbol as a key in a `TypeMap` — TypeScript will simply not allow it.  

1. **Portability** – String keys work consistently across module systems  
   (ESM, CJS, UMD) without relying on runtime references.  

2. **Type Safety** – Every key must be explicitly declared in the `TypeMap`.  
   If a key is missing, TypeScript immediately reports an error.  

3. **Developer Experience** – Strings already have a human-readable form,  
   which makes debugging and logging container state straightforward.  

4. **Flexibility** – Since keys are just strings, they can be manipulated,  
   generated, or grouped with ease compared to classes or symbols.  

> Yes, TypeScript does allow defining **unique symbols** that can serve as strongly-typed keys.
> However, this approach introduces additional boilerplate, requires separating key definitions from the `TypeMap`, and is not widely accessible. 

SpireX/DI deliberately favors **strings** as the most ergonomic and intuitive option for the majority of developers.


## Abstract vs Concrete Types

It is recommended to use abstract types (interfaces or type aliases) instead of concrete classes:

```ts
// Recommended
type TypeMap = {
  logger: ILogger;    // interface ILogger { log(msg: string): void }
};

// Not recommended
type TypeMap = {
  logger: Console;   // concrete class Console
};
```

**Why?**
- Abstract types decouple service definition from implementation.
- You can replace implementations without changing the container configuration.
- It improves testability and flexibility of your codebase.

## Inline Declaration in `diBuilder`

Although you may declare a separate `TypeMap` type, in practice it is usually cleaner to define it inline in the generic parameter of `diBuilder`:

```ts
import { diBuilder } from "@spirex/di";

const builder = diBuilder<{
  logger: Logger;
  counter: number;
}>();
```

This approach ensures that the TypeMap always reflects the current state of the container configuration.
Since the map may evolve as you add modules or bindings, it is safer and more practical to keep it tied directly to the builder instead of storing it separately.

## Extracting Type Maps with `TypeMapOf`
In some cases you may still need to obtain the TypeMap type explicitly — for example, to annotate function parameters or to share type information across different files.

For this, SpireX/DI provides the utility type `TypeMapOf<T>`.

It allows you to extract the associated `TypeMap` from all major SpireX/DI entities: `IContainerBuilder`, `ITypeEntryBinder`, `ITypesResolver`, `IContainerScope`, `TTypeEntry` and `DIModule`.

```ts
import { diBuilder, TypeMapOf } from "@spirex/di";

const builder = diBuilder<{
  value: number;
}>();

type AppTypes = TypeMapOf<typeof builder>;
// type AppTypes = { value: number }
```

With `TypeMapOf`, you gain full flexibility when advanced type manipulation is necessary. But in most cases, keeping the TypeMap inline in the builder’s generic parameter is the cleanest and most reliable solution.


## Summary

- A **TypeMap** is the single source of truth for all keys and types in the container.
- Keys are **strings** for simplicity, portability, safety, and readability.
- Prefer **abstract types** over concrete implementations.
- Define the TypeMap **inline** in diBuilder whenever possible.
- Use `TypeMapOf<T>` to extract type definitions from containers, builders, scopes, and modules when necessary.
