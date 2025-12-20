# Factory Binding

Factory binding is used for scenarios that are more complex than binding a simple value or an already created instance.
Instead of providing a ready-to-use object, you register a **factory function** that is responsible for creating the instance for a specific type key.

In SpireX/DI, this is done using the `bindFactory` builder operation.

A factory gives you **full control** over how an instance is created. It allows you to execute arbitrary creation logic and, if needed, resolve other dependencies from the container.


## Basic Concept
At its simplest, a factory can just return a value:
```ts
const builder = diBuilder<{ value: string }>()
  .bindFactory("value", () => "JavaScript");
```

In this example, the factory always returns the same string. Conceptually, this is very close to binding a value or instance, but there is an important difference:
The factory is **not executed immediately**. It will only be called according to the lifecycle rules of the binding, after the container is built.


## When and How a Factory Is Called
How often and when a factory function is executed depends on its lifecycle.

By default, a factory binding uses a singleton lifecycle:
- The factory is called once;
- The instance is created during container build;
- The same instance is returned for every request.

This default behavior is intentional. Creating singleton instances during container build avoids unnecessary work at runtime and keeps instance creation predictable.

Although lifecycles are described in detail in a separate section, it is important to understand that:
- A factory may be called once or multiple times
- The container may cache or not cache its result
- This behavior is controlled by the lifecycle option

All examples in this section rely on this behavior to work as intended.

> TODO: Add link to the lifecycles section


## Factories Are Synchronous
Factory functions must be synchronous.
The container does **not support awaiting** asynchronous operations during instance creation.

If a service requires asynchronous initialization, a common approach is:
1. Create the instance synchronously in the factory
2. Move asynchronous logic into a separate initialization method
3. Call that method after retrieving the instance from the container


## Resolving Dependencies Inside a Factory
Unlike instance bindings, factory bindings can depend on other types.

The factory function receives a **resolver** as its argument. Using this resolver, the factory can request other dependencies from the container:

```ts
const container = diBuilder<{
  name: string;
  age: number;
  message: string;
}>()
  .bindInstance("hello", "Teto")
  .bindInstance("world", 31)
  .bindFactory(
    "message",
    r => r.get("name") + r.get("age"),
  )
  .build();

const value = container.get("message");
console.log(value); // "Teto31"
```

Here, the factory for message combines two other values into one.
This pattern is very common and is the main reason factory bindings exist.

### Real-World Example: Service Construction
Factory bindings are most often used to construct services that depend on other services:

```ts
const container = diBuilder<{
  booksRepo: IBooksRepository;
  booksGateway: IBooksGateway;
  booksService: IBooksService;
}>()
  .bindFactory("booksRepo", () => new BooksRepository())
  .bindFactory("booksGateway", () => new BooksGateway())
  .bindFactory(
    "booksService",
    r => new BooksService(
      r.get("booksRepo"),
      r.get("booksGateway"),
    ),
  )
  .build();
```
In this example:
- Each service is created by its own factory;
- Dependencies are explicitly resolved through the resolver;
- The container controls when and how often each factory is executed.

This makes the dependency graph explicit and easy to reason about.

## Cyclic Dependencies
A cyclic dependency occurs when two or more factories depend on each other, directly or indirectly.

SpireX/DI detects such cycles automatically. When a cycle is encountered, the container throws an error that clearly describes which types are involved and how the cycle was formed.

This makes cyclic dependency problems visible immediately instead of failing silently at runtime.

Example:
```ts
const container = diBuilder<{
  authRepo: IAuthRepository;
  apiClient: IApiClient;
}>()
  .bindFactory("authRepo", r =>
    new AuthRepository(r.get("apiClient")),
  )
  .bindFactory("apiClient", r =>
    new ApiClient(r.get("authRepo")),
  )
  .build();

container.get("apiClient"); // Throws an error
// Activation failed: A cyclic dependency was detected
// while resolving type 'apiClient'.
// (Activation chain: [apiClient] -> authRepo -> [apiClient])
```
In this situation, neither factory can create its instance because each one requires the other first.

### Breaking Cycles with Lazy Resolution
In such cases, a cycle can be broken by lazy access to a dependency, meaning the actual instance is requested only when it is really needed.

The container provides mechanisms for this kind of lazy resolution, allowing the program to run correctly even when two services reference each other.

```ts
const container = diBuilder<{
  authRepo: IAuthRepository;
  apiClient: IApiClient;
}>()
  .bindFactory("authRepo", r =>
    new AuthRepository(r.get("apiClient")),
  )
  .bindFactory("apiClient", r =>
    // Using "phantomOf" instead of "get"
    // to lazy-resolve "authRepo" instance
    new ApiClient(r.phantomOf("authRepo")),
  )
  .build();

container.get("apiClient"); // OK
```
In this example, a phantom delays the actual instance resolution until the dependency is first used. The API client does not need the auth token during construction, so the cycle is safely broken.

It is important to understand, however, even if the dependencies cycle is broken at runtime, both instances **still conceptually depend on each other**.
This can be a warning sign of **architectural issues**. Mutual dependencies often make systems harder to understand, test, and evolve. While lazy resolution can unblock you technically, such designs should usually be revisited and simplified before they grow into larger problems!

-----

## Summary
Factory binding allows you to define how instances are created instead of providing ready-made values.

- `bindFactory` operation registers a factory function for a type;
- Factories may contain arbitrary creation logic;
- Factories are synchronous;
- Dependencies can be resolved via the provided resolver;
- When and how often a factory is called depends on its lifecycle;
- Cyclic dependencies are detected automatically;
- Cycles can be broken using lazy resolution.


## Related Topics
> TODO: Add links: 
> - Safe-Factory binding
> - Class factory
> - Lifecycles
> - Named binding
> - Binding conflicts
> - Get Type Instance
> - Get provider
> - Get phantom