# Named Binding

This usually happens when different parts of the system require slightly different behavior,
or when the logic depends on a platform, environment, or use case.

To support this, SpireX/DI provides **named bindings**.

A named binding allows you to attach multiple independent bindings
to the same type key by distinguishing them with a name.


## Basic Idea
A named binding is created by specifying a name option when registering a binding.

```ts
builder
  .bindFactory("iapService", factoryOf(IapAndroid), { name: "android" })
  .bindFactory("iapService", factoryOf(IapWeb), { name: "web" });
```

By providing a name, you effectively create a **separate binding** for the same type key.
Bindings with different names do not conflict with each other and can coexist safely.

Conceptually, the container treats the combination of type key and name as a unique binding.


## Resolving a Named Binding
To retrieve a named binding from the container, you must specify both the type key and the name:

```ts
const iapWeb = container.get("iapService", "web");
```

If a binding was registered with a name, it cannot be resolved using only the type key.
The name becomes part of the identity of the binding and must always be provided.


## Why Named Bindings Exist
Named bindings are useful in many real-world scenarios.

They allow you to:
- Register multiple implementations for the same abstraction
- Select behavior dynamically
- Avoid artificial type splitting
- Keep container configuration expressive and flexible

Below are some common patterns where named bindings shine.

### Example: Platform-Specific Implementations
Different platforms often require different implementations of the same service.
```ts
builder
  .bindFactory("iapService", factoryOf(IapAndroid), { name: "android" })
  .bindFactory("iapService", factoryOf(IapWeb), { name: "web" });
```

The rest of the application can explicitly request the implementation it needs
without duplicating types or introducing conditional logic into the container.

### Example: Controller Registration
Named bindings work very well for server-side applications,
where routes or paths can act as names.

```ts
builder
  .bindFactory("apiController", factoryOf(CatalogController), { name: "api/catalog" })
  .bindFactory("apiController", factoryOf(UsersController), { name: "api/users" });
```

Here, each controller is bound under the same type, but distinguished by its route path.

### Example: Strategy Pattern
Named bindings are a natural fit for the strategy pattern,
where the name identifies the chosen strategy.

```ts
builder
  .bindFactory("routeStrategy", factoryOf(RoadRouteStrategy), { name: "road" })
  .bindFactory("routeStrategy", factoryOf(WalkingRouteStrategy), { name: "walking" })
  .bindFactory("routeStrategy", factoryOf(TransportRouteStrategy), { name: "transport" });
```

The container becomes a registry of available strategies,
and selecting one is as simple as providing the appropriate name.

### Example: Gradual Refactoring and Migration
Named bindings are especially useful during refactoring.

When introducing a new implementation, you can register it alongside
the old one without breaking existing code:

```ts
builder
  .bindFactory("cartService", factoryOf(CartService))
  .bindFactory("cartService", factoryOf(CartServiceV2), { name: "v2" });
```

Existing components can continue using the original implementation,
while new or migrated components explicitly opt into the new one.
Once migration is complete, the old binding can be safely removed.


## Important Rule to Remember
A type key and a name together form a unique binding.

This means:
- A named binding cannot be resolved without specifying its name;
- The container will not fallback to an unnamed binding;
- Explicitness is required when working with named bindings.

This design avoids ambiguity and makes dependency resolution predictable.

---------
## Summary
Named bindings allow multiple implementations to coexist under the same type key.

- A name creates a separate binding for the same type
- Bindings with different names do not conflict
- The name must be provided when resolving the binding
- Named bindings are useful for platforms, strategies, controllers, and migrations
- The combination of type key and name uniquely identifies a binding

Named bindings give you flexibility without sacrificing clarity,
making them a powerful tool for structuring complex applications.


## Related Topics
> - Binding Conflicts
> - Multi Bindings
> - Aliases
