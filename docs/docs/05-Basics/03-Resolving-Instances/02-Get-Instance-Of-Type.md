# Get Instance of Type

After the container is fully configured and built,
it becomes the single source of truth for all application services.
At this point, the most common operation is retrieving an instance of a specific type.

**SpireX/DI** provides several operations for extracting instances from the container.
All of them share a similar interface, but each has a different purpose and behavior.

These operations are available:
- directly on the container,
- container's scopes,
- inside factories through the dependency resolver.

We start with the most basic and most frequently used operation.


## `get` — strict instance retrieval

The `get` method is the primary way to retrieve a service from the container.
It accepts a **type key** and optionally a **binding name**.

```ts
const usersService = container.get("users"); // IUsersService
```

If the type has **named bindings**, the name can be provided as the second argument:

```ts
const webIap = container.get("iap", "web"); // IapService
```


## Type safety and inference
SpireX/DI relies entirely on the container’s **TypeMap** to infer the return type.

This means:
- no generic parameters are required;
- no manual casting is needed;
- TypeScript will infer the exact type based on the key.

As long as the key exists in the TypeMap, the returned value is fully typed.

This keeps usage concise and safe:
```ts
const auth = container.get("auth"); 
// "auth" is inferred as AuthService
```


## Strict behavior and error handling
The get method is **strict**.

If you try to retrieve a type that does not have a binding,
the container will immediately throw an error.

```ts
container.get("unknown");
// Error: Type binding "unknown" not found.
```

It makes missing or misconfigured dependencies obvious and impossible to ignore.
In other words, get always represents a **required dependency**.


## Why strictness matters?
Strict resolution is especially important for `singleton` services.

Singletons are created during container build.
If a required dependency is missing, the error will surface immediately,
before any business logic is executed.

```ts
builder.bindFactory("auth", r =>
    new AuthRepository(
        r.get("authGateway"), // Throws error if not bound
        r.get("authRepo"),
    )
);
```

If `authGateway` or `authRepo` is not bound:
- container build or activation will fail;
- the application will not start in a broken state.

This helps catch configuration problems early and close to their source.


## Using `get` inside factories and class factories
The same `get` method is used internally by the dependency resolver inside factories.

When using class factories (`factoryOf`),
the `get` method is implicitly used to resolve constructor dependencies.

```ts
class AuthService {
    static inject = ["authGateway", "authRepo"] as const;

    constructor(
        private readonly _gateway: IAuthGateway,
        private readonly _repo: IAuthRepository,
    ) {}
}

builder.bindFactory("auth", factoryOf(AuthService));
```

In this case:
- dependency order and types are checked by TypeScript;
- each key listed in `inject` is resolved using `get`;
- missing bindings will cause a build-time or activation error.

------------------
## Summary
- `get` is the most common and simplest way to retrieve a service;
- It's **strict** and fails fast if a binding is missing;
- It relies on **TypeMap** for full type inference;
- It clearly expresses **required** dependencies.
- It's used consistently across:
    container access, container's scopes, factory resolvers and class factories.

If a dependency **must exist** for correct application behavior,
using the `get` method is the correct choice.
