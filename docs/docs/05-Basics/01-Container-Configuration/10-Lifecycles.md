# Lifecycle

SpireX/DI allows you to define a lifecycle for every instance created by a factory (`bindFactory` and `bindSafeFactory`).

A lifecycle defines:
- When an instance is created;
- How long the container keeps a reference to it;
- Whether the container reuses an existing instance or creates a new one on each request.

As long as the container owns a reference to an instance, it will return the **same instance** instead of creating a new one.

The lifecycle is configured via the `lifecycle` option during binding.

By default, all bindings use the `singleton` lifecycle.

```ts
builder.bindFactory(
  "usersRepo",
  factoryOf(UsersRepository),
  // { lifecycle: "singleton" },
);
```


## Supported lifecycles
SpireX/DI supports four lifecycle types:
`singleton`, `lazy`, `transient` and `scope`.

Each lifecycle solves different problems and is suitable for different scenarios.


### Singleton
The `singleton` lifecycle means that:
- the instance is created during container build;
- the instance exists for the entire lifetime of the container;
- the instance is stored in the root scope.

Because `singleton` instances are created eagerly, this lifecycle:
- makes runtime access very fast;
- allows detecting configuration and construction errors early, during application startup.

This lifecycle is used by default, as it is optimal for most services.

```ts
const container = diBuilder<{ service: MyService }>()
  .bindFactory(
    "service",
    factoryOf(MyService),
    { lifecycle: "singleton" },
  )
  .build(); // MyService is created here

const service1 = container.get("service");
const service2 = container.get("service");

assert(service1 === service2);
```

Typical use cases:
- core application services;
- repositories;
- API clients;
- configuration objects;
- stateless services.


### Lazy
The `lazy` lifecycle is very similar to `singleton`, with one important difference:
- the instance is not created during container build;
- it is created only on the first request;
- after creation, it is reused just like a `singleton`.

```ts
const container = diBuilder<{ service: MyService }>()
  .bindFactory(
    "service",
    factoryOf(MyService),
    { lifecycle: "lazy" },
  )
  .build();

const service1 = container.get("service"); // created here
const service2 = container.get("service");

assert(service1 === service2);
```

Typical use cases:
- heavy or expensive services;
- optional features;
- improving application startup time.


### Transient
The `transient` lifecycle means that:
- a new instance is created on every request call;
- the container does not store a reference to the instance;
- the container does not manage the instance lifetime.

```ts
const container = diBuilder<{ service: MyService }>()
  .bindFactory(
    "service",
    factoryOf(MyService),
    { lifecycle: "transient" },
  )
  .build();

const a = container.get("service");
const b = container.get("service");

assert(a !== b);
```

Transient bindings are also useful as projections or selectors of values from singleton services.

```ts
const container = diBuilder<{
  service: MyService;
  state: string;
}>()
  .bindFactory("service", factoryOf(MyService))
  .bindFactory(
    "state",
    r => r.get("service").runtime.state,
    { lifecycle: "transient" },
  )
  .build();

const state = container.get("state");
```
In this case no caching is required and the returned value is always up to date.

Typical use cases:
- value objects;
- DTOs;
- temporary objects;
- computed values;
- selectors and adapters.


### Scope
The `scope` lifecycle does not just limit an instance lifetime — it gives the developer fine-grained control over how and where instances live by using explicit scopes.

Scopes allow you to:
- control when an instance is created;
- control how long it exists;
- explicitly dispose instances to free resources and memory;
- model real application boundaries such as requests, screens, flows, or sessions.

A scope can represent:
- a screen or page;
- an HTTP request;
- a user session;
- a workflow or feature flow;
- or any explicitly controlled block of code.

Creation and disposal of scopes are fully controlled by the developer.

```ts
const container = diBuilder<{
  iap: IapService;
}>()
  .bindFactory("iap", factoryOf(WebIapService), { lifecycle: "scope" })
  .build();

// Create a scope
const paymentScope = container.scope("payment");

const iap = paymentScope.get("iap");
await iap.requestPurchase("subTrial_19.99");

paymentScope.dispose();
// IapService is disposed together with the scope
```


#### Advanced capabilities of scopes
SpireX/DI provides advanced mechanisms for:
- scope creation and nesting;
- instance visibility across scopes;
- controlled disposal of instances.

These topics are intentionally powerful and flexible, and they are covered in detail in dedicated sections of the documentation.
For this lifecycle overview, it is enough to understand that a `scope` instance lives only inside the scope where it was created and is disposed together with that scope.


#### Important warning about resolving scoped instances
The container itself is the root scope.

If a `scope` lifecycle instance is resolved from the root container instead of from a child scope, it will be created in the root scope.

This leads to several important consequences:
- the instance will behave like a `lazy` singleton;
- the same instance will be reused in all child scopes;
- the instance will never be disposed until the container itself is destroyed;
- memory held by this instance cannot be released earlier.

Example of a common mistake:
```ts
const container = diBuilder<{ service: MyService }>()
  .bindFactory("service", factoryOf(MyService), { lifecycle: "scope" })
  .build();

// BAD: resolved in the root scope
const service = container.get("service");
```

In this case, the developer may expect a new instance per scope, but instead gets a single shared instance for the entire application.

Correct usage:
```ts
const featureScope = container.scope("feature");

// OK: resolved inside a scope
const service = featureScope.get("service");
```

Always pay close attention to the scope from which you resolve `scope` lifecycle instances.
Resolving them from the wrong scope can silently turn them into effectively lazy singletons, breaking isolation and preventing proper cleanup.


## Performance considerations
`singleton` and `lazy` lifecycles:
- exist only in the root scope;
- do not require scope traversal;
- are resolved as fast as possible.

`scope` lifecycle:
- has a small performance overhead;
- requires checking the current and parent scopes;
- should be used where lifetime control is more important than raw speed.


----------
## Summary
- `singleton` - Created at container build time, lives for the entire container lifetime. Best for core services.
- `lazy` - Created on first request, then reused. Best for heavy or optional services.
- `transient` - Created on every request, not stored by the container. Best for temporary objects and computed values.
- `scope` - Created and cached inside a specific scope. Best for request-, screen-, or session-bound services.

Choosing the correct lifecycle is a key part of designing a clean, efficient, and predictable dependency graph with SpireX/DI.

## Related Topics
> - Factory Binding
> - Creating Scopes
> - Disposing Scopes
> - Scoped Instance
