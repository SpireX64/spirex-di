# Instance Binding

## What is Instance Binding?

Instance binding is the simplest way to register a value or object in the DI container.  
With this approach, you bind an **already created and fully initialized instance** to a specific type key, and the container will always return that exact instance.

In `@spirex/di`, instance binding is performed using the builder operation `bindInstance`.

> TODO: Add link to "bindInstance" reference.


## When Should You Use Instance Binding?
Instance binding is ideal when:
- You already have a ready-to-use value or object;
- No dependency resolution or initialization is required;
- The instance should always be the same (singleton);
- You want maximum performance and minimal container overhead.

Typical use cases include:
- Constants and primitive values:
- Configuration objects;
- Immutable data;
- External library instances created outside the container;
- Services that must exist before the container is built.


## Basic Usage
To bind an instance, you need a **type key** and the **instance itself**.

```ts
import { diBuilder } from "@spirex/di";

const builder = diBuilder<{ value: string }>()
  .bindInstance("value", "Hello");
```
Here, the string `"Hello"` is bound to the type key `"value"`.

Once the container is built, you can retrieve the instance as usual:
```ts
const container = builder.build();

container.get("value"); // "Hello"
```


## Lifecycle and Singleton Behavior
All instances registered via `bindInstance` are **always singletons**.

Important implications:
- The instance exists before the container is created;
- The container does **NOT** create, initialize, or manage the instance;
- The same instance is returned every time;
- The instance cannot be replaced after the container is built.

Because of this, the container does not need to:
- Resolve dependencies
- Cache activated instances
- Track lifecycle

This makes instance binding the **most performant** binding type.
Retrieving such an instance is almost equivalent to accessing a value from a `Map`.


### Accessing the Instance Before Container Creation
Since the instance is created upfront, you can access it directly from the binding entry if needed, using builder API:
```ts
const valueBinding = builder.findEntry("value");
const value = valueBinding.instance;

console.log(value); // "Hello"
```
This can be useful for debugging or advanced setup scenarios.

> TODO: Add link to builder inspecting


### Immutability Recommendation
Because instance bindings always return the same object, it is strongly recommended to bind immutable instances.

If a mutable object is shared across the application, any service could accidentally modify its internal state.

For example:
```ts
const config = Object.freeze({
  apiUrl: "https://api.example.com",
  timeout: 5000,
});

builder.bindInstance("config", config);
```
Using `Object.freeze` (or other immutability techniques) helps guarantee safety and predictability.


## Performance Characteristics
Instance binding is the **most efficient** binding type in `@spirex/di`:
- No dependency resolution;
- No container-side caching;
- No lifecycle management;
- Instant retrieval.

This makes it perfect for hot paths and frequently accessed values!


## When Not to Use Instance Binding
Avoid bindInstance when:
- The instance depends on other services;
- Initialization logic is required;
- You need lazy creation;
- You need per-request or dynamic instances.

In such cases, consider using **factory binding** instead:
```ts
builder.bindFactory(...)
```

-------------

## Summary
- `bindInstance` binds an already created instance to a type key;
- The bound instance is **always** a singleton;
- The container does not manage its lifecycle;
- Retrieval is extremely fast;
- Best suited for constants, configs, and external instances;
- For dynamic or dependency-based creation, prefer `bindFactory`.

## Related Topics
> TODO: Add links: 
> - Factory binding
> - Named binding
> - Binding Conflict
> - Get Type Instance
