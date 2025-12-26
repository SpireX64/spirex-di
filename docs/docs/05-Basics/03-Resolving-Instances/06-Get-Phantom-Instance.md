# Phantom Instance

## When Provider Functions Are Not an Option
SpireX/DI supports **true-lazy dependency injection** to avoid
unnecessary instantiation of heavy or rarely used services.

The recommended approach is usually **a provider function**,
obtained via `providerOf`, which delays resolution
until the dependency is actually needed.

However, there are situations where passing a function is not feasible:
- The service comes from a third-party library and its constructor signature cannot be changed.
- Refactoring the code to accept provider functions would be overly complex or invasive.
- The dependency must appear as a concrete instance from the consumer’s perspective.

To address these cases, SpireX/DI introduces **phantom instances**,
obtained via the `phantomOf` method.


## Why They Are Called “Phantoms”?
The term phantom is used deliberately and comes from its dictionary definition:
_"A phantom is a perceived presence or vision of a concrete entity that does not actually exist"._

This concept maps directly to how phantom dependencies work in SpireX/DI.
- The service receives something that looks and behaves like the real dependency.
- From the service’s point of view, the dependency already exists.
- In reality, **no instance has been created yet**.

The real instance materializes only after the first interaction
with the phantom—such as accessing a property or calling a method.
Until that moment, the dependency exists only as a “vision” of the real object,
not as the object itself.

## How Phantom Instance Works
A phantom is a special object that impersonates the requested type until it is actually used.

Unlike provider-based injection:
- A phantom is not a function.
- The consuming service does not need to be aware of any lazy mechanism.

At the moment of first interaction, SpireX/DI resolves the real instance using the resolver from which the phantom was obtained. All subsequent operations are transparently delegated to that resolved instance.

If the dependency instance already exists when `phantomOf` is requested, SpireX/DI immediately returns the real instance instead of creating a phantom, since delaying resolution would provide no benefit.


## Usage Example
```ts
class SomeService {
    constructor(private readonly heavyThing: IHeavyThing) {}

    doAction() {
        if (isSpecialCondition) {
            this.heavyThing.execute();
        }
    }
}

builder.bindFactory("service", r =>
    new SomeService(r.phantomOf("heavyThing"))
);
```
In this example:
- `SomeService` believes it has a fully initialized `IHeavyThing`.
- The actual instance is created only when `execute()` is invoked.
- The service remains completely unaware of the DI container.
- Dependency creation is postponed until it is genuinely needed.


## Strictness and Early Validation
Despite being lazy, `phantomOf` is a strict resolution method, just like `get` and `providerOf`.

This means that:
- The existence of a binding is verified immediately when requesting the phantom.
- Missing bindings result in an immediate and descriptive error.
- Circular dependencies are still detected and reported with a clear activation chain.

As a result, phantom dependencies combine **runtime laziness** with **early configuration safety**.


## Phantom vs Provider: Choosing the Right Tool
Both `providerOf` and `phantomOf` enable true-lazy resolution,
but they serve different architectural needs.

Provider functions:
- Make laziness explicit.
- Require API changes to accept a function.
- Are ideal when you control the service design.

Phantom instances:
- Preserve existing service interfaces.
- Require no changes to consuming code.
- Are ideal for third-party services or complex legacy designs.

Internally, both approaches defer instantiation
while preserving correct scope and lifecycle behavior.


## Best Practices
Use `phantomOf` when:
- Lazy instantiation is required but function injection is not feasible.
- You integrate external libraries expecting concrete instances.
- Refactoring toward provider-based injection is prohibitively complex.

Prefer `providerOf` whenever possible, as it makes deferred behavior explicit
and easier to reason about. Phantom instances should be used intentionally,
as a design-level abstraction, not as a default replacement.


----------------
## Summary
`phantomOf` enables **true-lazy dependency injection** by providing a instance that appears to exist but is not instantiated until first use.

The term phantom reflects this behavior precisely: the service perceives the dependency as present, while it exists only conceptually.

This approach allows lazy resolution without changing service interfaces or exposing the DI container.
Together with provider functions, phantom dependencies give SpireX/DI flexible, safe tools for handling heavy, optional, and hard-to-refactor dependencies.
