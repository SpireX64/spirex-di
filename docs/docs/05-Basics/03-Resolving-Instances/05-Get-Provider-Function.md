# Provider Function
Sometimes, you need **to provide a dependency** without immediately creating its instance.

This is useful when a dependency is **heavy to create** and/or is **used only in rare conditions**, and you don’t want to instantiate it unnecessarily.


## The naive approach (bad pattern)
A common but **very bad approach** is passing the **resolver itself** into the service and letting it fetch dependencies on demand:

```ts
// VERY BAD PATTERN! DON'T USE!!!
class SomeService {
    constructor(
        private readonly _resolver: ITypesResolver<TypeMap>,
    ) {}

    doAction() {
        if (isSpecial) {
            const heavyThing = this._resolver.get("heavyThing");
            heavyThing.exec();
        }
    }
}

// OMG!!!
builder.bindFactory("service", r => new SomeService(r));
```

Why is this bad?...
- The service now knows about the container, violating encapsulation.
- The service can fetch any dependency, breaking dependency control.
- Harder to track dependencies and debug issues.

## A better approach: deferred creation with a function
Instead of passing the resolver, pass **a function that resolves the instance** only when needed:

```ts
class SomeService {
    constructor(
        private readonly getHeavyThing: () => IHeavyThing,
    ) {}

    doAction() {
        if (isSpecial) {
            this.getHeavyThing().exec();
        }
    }
}

// ...
builder.bindFactory("service", r => 
    new SomeService(() => r.get("heavy")),
);
```

- This delays creation until the service really needs it.
- The service **doesn’t know about the container**.
- It easier to mock in unit tests.

Problem: if "heavy" is not bound, the error will occur **only when** `doAction` is called and `isSpecial` is truthy, which may be too late.

## True-lazy approach with `providerOf`
SpireX/DI provides the `providerOf` method, which returns a provider function.

```ts
builder.bindFactory("service", r => 
    new SomeService(r.providerOf("heavy")),
);
```

How it works:
- **Strict:** like get, it checks if the type is missing, `providerOf` immediately throws an error, avoiding surprises later.
- **Lazy:** does not create the instance immediately. It returns a function that creates or retrieves the instance only when called.

```ts
const heavyProvider = r.providerOf("heavy");
const heavyInstance = heavyProvider(); // Instance created only now
```

This approach is true-lazy and helps avoid unnecessary instantiations.

## Breaking cyclic dependencies
A cyclic dependency occurs when:
- Service A depends on Service B.
- Service B depends on Service A.

Without lazy evaluation, resolving them creates an infinite loop:
```ts
builder
    .bindFactory("serviceA", r => new ServiceA(r.get("serviceB")))
    .bindFactory("serviceB", r => new ServiceB(r.get("serviceA")));

// ...
container.get("serviceA");
// Activation failed:
// A cyclic dependency was detected while resolving type 'serviceA'
// (Activation chain: [serviceA] -> serviceB -> [serviceA])
```

### Breaking cycles with `providerOf`
Using true-lazy providers, you can **break cyclic dependencies**:

```ts
builder
    .bindFactory("serviceA", r => new ServiceA(r.get("serviceB")))
    .bindFactory("serviceB", r => new ServiceB(r.providerOf("serviceA")));
```
- "serviceB" now receives a provider function instead of an instance.
- The cycle is broken until the function is called.
 
If the provider is called immediately in the constructor, SpireX/DI will **still detect the cycle** and throw an error.


---------------
## Summary
- `providerOf` returns a lazy function for creating/retrieving an instance.
- Ensures strict type checking at configuration time.
- Safer and cleaner than passing the container or resolver directly.

Useful for:
- Breaking cyclic dependencies;
- Rarely used dependencies;
- Heavy objects.

This is the recommended pattern for **true-lazy dependency injection** in SpireX/DI.
