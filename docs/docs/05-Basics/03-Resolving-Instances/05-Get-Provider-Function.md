# Provider Functions

## The Problem with Heavy Dependencies
In some applications, certain dependencies are **expensive to create** or are only required under **rare conditions**. Instantiating them eagerly as part of the dependency injection (DI) process can waste resources.

A common naive approach is to pass the container or a resolver directly into the service and let it fetch the dependency when needed:

```ts
// BAD PRACTICE: Service knows about the container/resolver
class SomeService {
    constructor(private readonly resolver: ITypesResolver<TypeMap>) {}

    doAction() {
        if (isSpecialCondition) {
            const heavyThing = this.resolver.get("heavyThing");
            heavyThing.execute();
        }
    }
}

// Binding
builder.bindFactory("service", r => new SomeService(r));
```

This approach is problematic because:
- It **exposes the DI container to the service**, breaking encapsulation.
- The service can fetch **any dependency at any time**, which makes code harder to reason about.
- Errors related to missing bindings may only appear at runtime, often under rare conditions.


## Lazy Dependencies via Provider Functions
A better approach is to pass **a function that returns the dependency** instead of the container or resolver itself. This delays the instantiation until the dependency is actually needed, without giving the service direct access to the DI container:

```ts
class SomeService {
    constructor(private readonly getHeavyThing: () => IHeavyThing) {}

    doAction() {
        if (isSpecial) {
            this.getHeavyThing().execute();
        }
    }
}

// Binding with a lazy provider function
builder.bindFactory("service", r => new SomeService(() => r.get("heavyThing")));
```

This pattern already improves encapsulation and laziness, but it has one limitation: 
if the binding for `"heavyThing"` is missing, the error will only appear when `doAction` is called and `isSpecial` is truthy, which might be **very rare**.


## Provider Functions with Early Binding Check
SpireX/DI introduces the `providerOf` method to create **true-lazy provider functions** that:
- Delay instantiation until the function is called.
- Immediately validate that a binding exists for the requested type.

```ts
builder.bindFactory("service", r => 
    new SomeService(r.providerOf("heavyThing"))
);
```

### How it works?
- `providerOf` returns **a provider function** that creates the instance on demand or returns an existing instance if it already exists.
- If no implementation is bound for the requested type, `providerOf` immediately throws a descriptive error.
- The service remains unaware of the DI container, preserving proper encapsulation.


This pattern ensures that:
- Dependencies are created only when needed (true-lazy).
- Binding issues are detected early, reducing runtime surprises.


## Solving Cyclic Dependencies
Cyclic dependencies occur when two services depend on each other, either directly or indirectly, which can result in infinite activation loops:

```ts
builder
    .bindFactory("serviceA", r => new ServiceA(r.get("serviceB")))
    .bindFactory("serviceB", r => new ServiceB(r.get("serviceA")));

// Resolving serviceA will fail:
container.get("serviceA");
// Activation failed: A cyclic dependency was detected
// (Activation chain: [serviceA] -> serviceB -> [serviceA])
```

By using provider functions, cycles can be broken because
a service now receives a function to get the dependency rather
than the dependency itself:

```ts
builder
    .bindFactory("serviceA", r => new ServiceA(r.get("serviceB")))
    .bindFactory("serviceB", r => new ServiceB(r.providerOf("serviceA")));
```

- The cycle is no longer activated until the provider function is called.
- If the provider function is called immediately in the constructor, 
  SpireX/DI will still **detect** the cycle and **throw an error**.


## Notes and Best Practices
- Always prefer `providerOf` **over passing the container or resolver directly**. This maintains proper separation of concerns.
- **Use provider functions** for heavy or rarely used dependencies to optimize performance.
- **Provider functions help mitigate cyclic dependencies**, but you still need to design your services carefully.
- **Early validation** with `providerOf` ensures missing bindings are detected at registration, not at random runtime moments.

----------------
## Summary
Using provider functions (`providerOf`) in SpireX/DI allows you to inject **true-lazy dependencies** without exposing the DI container. They solve common problems such as:

- Unnecessary instantiation of heavy dependencies.
- Encapsulation violations from naive resolver injection.
- Hard-to-detect runtime errors due to missing bindings.
- Cyclic dependency issues by delaying instantiation until needed.

By combining laziness with early validation, `providerOf` offers a clean, safe, and efficient pattern for managing optional or expensive dependencies in TypeScript applications.
