# Binding Metadata

## Extending Bindings with Metadata
In complex dependency injection scenarios, you may want to **annotate** certain bindings with additional information or perform actions based on these annotations. 

Standard binding methods in SpireX/DI, such as `bindFactory` and `bindInstance`, provide only limited options specific to their binding type. This makes it difficult to attach arbitrary data or extend the behavior of bindings in a flexible way.

To address this, SpireX/DI allows you to define **custom metadata** for value and factory bindings through the `meta` option. Metadata is **fully customizable** and can store **any** JavaScript value—primitives, objects, functions, or even classes.

## Defining Metadata
The `meta` option is an **object** whose keys and values can be arbitrarily defined. These values are **preserved with the binding** and can later be used by middleware, factories, or other extensions.

```ts
import { builder, factoryOf } from "@spirex/di";
import { MyService } from "./services";

builder.bindFactory("service", factoryOf(MyService), { 
    meta: {
        owner: "Its me!",
        version: 1,
    }
});
```
In this example, the binding for "service" includes metadata that identifies its **owner** and **version**. This information is purely declarative; you can define **any custom fields** relevant to your application.


## Type-Safe Metadata
To ensure type safety when generating metadata, you can use a pattern where a **helper function** accepts the container’s type map. This enables TypeScript to provide auto-completion and type checking for your metadata keys and values.

```ts
import type { TTypeMapBase } from "@spirex/di";

function metaForSample<TypeMap extends TTypeMapBase>(type: keyof TypeMap) {
    // Generate metadata dynamically based on the type
    return {
        fields: ["id", "name"], // Example: could analyze type structure
    };
}

builder.bindFactory("service", factoryOf(MyService), {
    meta: {
        sample: metaForSample("typeKey"),
    }
});
```
This pattern allows developers to create type-aware metadata, making it easier to build tools or extensions that interact with your **container bindings** safely.


## Practical Applications
Metadata in SpireX/DI is typically used in **Middleware** or **factory functions** to perform actions based on binding annotations.

Some examples of practical usage include:
- Logging all method calls for services that have `meta.debug = true`.
- Wrapping service properties in reactive proxies when `meta.reactive = true`, enabling change detection and subscription.
- Applying conditional logic or validation before providing a service based on a custom predicate stored in metadata.

These examples illustrate that metadata provides **unlimited flexibility** for extending container behavior **without modifying** the core mechanism.

## Best Practices
- Use `meta` primarily for annotations or configuration that may influence runtime behavior via middleware or factories.

- Keep metadata values descriptive and minimal to avoid unnecessary complexity.

- Consider using type-safe helper functions when generating metadata that depends on the container’s type map.

- Avoid overloading metadata with unrelated responsibilities—its power is in supporting targeted, extensible use cases.


-----------
## Summary
The `meta` option in SpireX/DI allows you to attach **arbitrary metadata** to factory and value bindings, enabling **flexible extensions** and runtime **behavior modifications**. 

Metadata values can be **any** JavaScript object, primitive, or function, and can be type-checked using the container’s type map.

This feature empowers developers to implement logging, reactivity, conditional provisioning, and other **advanced** behaviors. By leveraging metadata, your container becomes highly extensible without complicating core mechanisms.
