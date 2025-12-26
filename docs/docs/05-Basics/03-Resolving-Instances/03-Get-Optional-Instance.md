# Getting optional instances
In real-world applications, not all services are always available.

Sometimes a service:
- depends on the current platform (web / mobile / desktop),
- is enabled only in specific environments,
- is an optional extension rather than a core dependency.

In such cases, the application should be able to work without this service.

## The problem with the `get` method
The `get` method is strict by design.
If a service does not have a bound implementation, `get` throws an error.

This is correct behavior for required dependencies, but it becomes inconvenient for optional ones.

A naive solution would be to catch the error:
```ts
builder.bindFactory("iap", r => {
    let iapService: IIapService | undefined;

    try {
        iapService = r.get("iapService", "web");
    } catch {
        console.debug("Web payment service is not available.");
    }

    return new IapManager(
        r.get("iapRepo"),
        iapService,
    );
});
```

This approach has several drawbacks:
- exception handling clutters the factory code,
- errors are used for control flow,
- throwing and catching exceptions has a runtime cost,
- required and optional dependencies are not clearly distinguished.


## Safe optional resolution
For optional dependencies, SpireX/DI provides the `maybe` method.

The `maybe` method tries to resolve a service and returns `undefined` when no implementation is bound.
It does not throw if the binding does not exist.

```ts
builder.bindFactory("iap", r => new IapManager(
    r.get("iapRepo"),              // required dependency
    r.maybe("iapService", "web"),  // optional dependency
));
```
The factory becomes: shorter, clearer and easier to read.

At a glance, it is obvious which dependencies are mandatory and which are optional.
This makes `maybe` ideal for optional integrations, plugins, and environment-specific services.

## Using logical fallbacks
JavaScript logical operators return the first _truthy_ value, not just a boolean.

Since `undefined` is a _falsy_ value, this can be used to define fallbacks:

```ts
r.maybe("iapService", "web") || r.get("iapService", "cash");
```

In this example:
- if the web payment service exists, it is used;
- otherwise, the cash-based implementation is resolved instead.

This pattern is expressive and requires no additional branching.

## Don't use `maybe` for existence checks
Even though `maybe` returns `undefined` when no binding exists,
it is not intended to be used as a way to check whether a service is bound.

Because `maybe` performs resolution, which means:
- it may create an instance;
- it may trigger side effects,
- it may eagerly initialize services.

If you only need to check whether a binding exists,
use the container’s type enumeration instead.

```ts
if (container.types.service) {
    // "service" has a bound implementation
}
```
This check is fast, has no side effects and works purely on container configuration.

-------------
## Summary
- Use `get` for required dependencies.
- Use `maybe` for optional dependencies.
- Logical operators can be used to define fallback implementations.

This separation keeps dependency resolution explicit, safe, and easy to reason about.
