# Multiple Binding

In some situations, it is useful to group several implementations under the same type and retrieve them all at once.
This is especially helpful when a system needs to work with a set of implementations, rather than a single one.

Typical examples include:
- plugins
- handlers
- strategies
- middleware
- definitions
- configuration providers

In these cases, the container should return a list of instances instead of forcing you to resolve them one by one.

## Why Multiple Binding Is Not Enabled by Default?
By default, registering more than one binding for the same type results in a conflict error.
This happens because the default conflict resolution strategy is `throw`.

This strict behavior prevents accidental duplication and ambiguous configuration.

To intentionally allow multiple bindings for the same type, you must explicitly opt into this behavior.

## Enabling Multiple Binding
To register multiple implementations under the same type, use the `append` conflict strategy.

```ts
builder
  .bindFactory("plugin", factoryOf(LoggingPlugin), { ifConflict: "append" })
  .bindFactory("plugin", factoryOf(AuthPlugin), { ifConflict: "append" })
  .bindFactory("plugin", factoryOf(RoutingPlugin), { ifConflict: "append" });
```

Each binding is added to an internal list associated with the type key.
Together, these bindings form a grouped collection.

## Retrieving All Implementations
To retrieve all bound implementations for a type, use the `getAll` operation:

```ts
const plugins = container.getAll("plugin");
// [LoggingPlugin, AuthPlugin, RoutingPlugin]
```
The returned list contains all instances in the same order in which they were registered.

This ordering guarantee is important for use cases like:
- middleware pipelines
- ordered handlers
- plugin execution chains


## Using `get` with Multiple Bindings
If you use `get` instead of `getAll`, the container returns the **first bound implementation**:

```ts
const plugin = container.get("plugin"); // LoggingPlugin
```

This behavior exists mainly for compatibility, 
but relying on it is usually discouraged when multiple bindings are involved.
The “first” implementation may change as configuration evolves.

## Selecting a Specific Implementation
There is intentionally no direct API for retrieving a specific element from a multiple binding group.

Allowing indexed or named access would reintroduce ambiguity and tight coupling to configuration order.

If you need to select a specific implementation,
the recommended approach is to retrieve the full list and search it explicitly.

```ts
const authPlugin = container
  .getAll("plugin")
  .find(p => p.name === "auth");
```

If this pattern appears frequently, it may indicate that **named bindings** are a better fit for your use case.


## Interaction with Other Conflict Strategies
Multiple bindings exist only as long as the `append` strategy is used.

If a binding with the same type is later registered using the `replace` strategy
the **entire group** is replaced by the new binding.

```ts
const container = diBuilder()
  .bindFactory("plugin", factoryOf(LoggingPlugin), { ifConflict: "append" })
  .bindFactory("plugin", factoryOf(AuthPlugin), { ifConflict: "append" })
  .bindFactory("plugin", factoryOf(RoutingPlugin), { ifConflict: "append" })
  .bindFactory("plugin", factoryOf(FakePlugin), { ifConflict: "replace" })
  .build();

const plugins = container.getAll("plugin"); // [FakePlugin]
```
This allows higher-priority configuration layers to completely override grouped bindings when needed.


## When to Use Multiple Binding
Multiple binding is a good choice when:
- all implementations should be treated uniformly;
- consumers should not depend on a specific implementation.

It is less suitable when:
- a specific implementation must be selected directly;
- different implementations have distinct roles.

In those cases, named bindings provide clearer intent and stronger guarantees.


--------------
## Summary
Multiple binding allows you to group several implementations under a single type.

- Multiple bindings are disabled by default;
- Use the `append` conflict strategy to enable grouping;
- `getAll` returns all instances in registration order;
- `get` returns only the first instance;
- There is no direct API for selecting a single element;
- `replace` conflict strategy overrides the entire group;
- Named bindings are often a better choice for targeted selection.

Multiple binding is a powerful mechanism for extensible and modular designs,
such as plugin systems and processing pipelines.
