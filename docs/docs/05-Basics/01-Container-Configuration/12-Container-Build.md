# Container Build
A key concept when working with **SpireX/DI** is building the container after its configuration is complete.

The build step finalizes the configuration, creates the container, and prepares it for runtime use.

During the build process, the container builder analyzes all bindings and performs multiple optimizations, especially for singletons and aliases.

```ts
const container = diBuilder()
  .include(AuthModule)
  .include(CatalogModule)
  .include(CartModule)
  .include(PaymentModule)
  .build(); // Container build
```

## Builder finalization and immutability
Once the container is built, the builder transitions into an **disposed state**.

This means:
- the builder can no longer be used to produce new containers;
- no additional bindings can be registered;
- the configuration becomes **fully immutable**.

This behavior is intentional and serves two important purposes:
- reducing CPU overhead;
- minimizing memory usage.

All optimizations are performed directly on the configuration data without copying it.
After processing, bindings are frozen (made immutable) and moved into the container instance.

This guarantees that:
- the container configuration cannot accidentally change at runtime;
- runtime access remains as fast as possible;
- the container behaves deterministically.


## Alias compilation
One of the most important steps during container build is alias compilation.

If a configuration contains alias chains or complex alias graphs,
resolving them dynamically at runtime would require traversing multiple bindings
to locate the actual factory or instance.

Instead, **SpireX/DI** compiles all aliases during the build phase.

As a result:
- alias chains are flattened;
- alias-to-alias references are resolved;
- multiple bindings created via aliases are merged where required.

After compilation, accessing a service via an alias has the same performance
as accessing a factory or instance binding directly.

Thanks to this compilation step:
- aliases remain a powerful architectural tool;
- alias usage has zero runtime cost;
- even deeply nested alias graphs do not affect application performance.


## Binding validation
After alias compilation, the builder performs binding validation.

This includes, but is not limited to:
- validating dependencies declared via `bindSafeFactory`;
- validating required external types declared by modules via `requireType`;
- ensuring all referenced bindings exist and are consistent.

If a required binding is missing, broken, or incompatible,
the build process will fail with a clear and descriptive error.

This ensures that:
- configuration errors are detected early;
- the application cannot start in an invalid state;
- runtime failures due to misconfigured dependencies are avoided.


## Singleton activation
The final step of the build process is singleton activation.

All bindings with the `singleton` lifecycle:
- begin creating their instances;
- have their dependencies resolved;
- are stored in the root scope.

Eager creation of singletons provides several benefits:
- services are fully initialized before business logic starts;
- no delays occur during runtime due to late service creation;
- failures in service construction are detected immediately at startup.


Singleton instances are stored in a **highly optimized** structure.
Because they:
- exist only in the root scope;
- are created exactly once;
- do not require visibility checks.

Their resolution speed is **almost** equivalent to retrieving a value from a `Map`.


--------------
## Summary
Building the container is not just a formality.
It is a critical phase where SpireX/DI:

- finalizes and freezes configuration;
- compiles aliases into optimized resolution paths;
- validates all bindings and dependencies;
- eagerly creates and optimizes singleton instances.

After the build completes, the container is fully prepared for **fast, safe,
and predictable** dependency resolution throughout the lifetime of the application.

## Related Topics
> - Lifecycles
> - Aliases
> - Safe factory binding
> - Type requirement
