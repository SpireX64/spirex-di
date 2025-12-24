# Aliases

Aliases are another powerful binding mechanism provided by **SpireX/DI**.

Unlike instance bindings or factory bindings, an alias does not bind a type to a value or a factory. Instead, an alias binds one binding to another binding.

In other words, an alias allows you to reuse an existing binding under a different type identifier.

## Why aliases are needed?
A common scenario is a service that implements multiple interfaces.

Each interface is declared as a separate provided type in the container.
If you bind a factory for each interface independently, the container will create and manage separate instances for **each binding**.

This leads to:
- unnecessary memory usage;
- duplicated state;
- subtle bugs if the service is stateful.

Aliases solve this problem by **reusing the same binding** for multiple types. Instead of creating multiple instances, the container will return the same instance for all aliased types.

Type compatibility is enforced by TypeScript. The original binding type must be assignable to the alias type, otherwise the compiler will report an error. 

In addition to type compatibility, **SpireX/DI** also validates alias targets during container build. If the container builder detects that an alias refers to a **non-existent binding**, it will throw an error and clearly point to the problematic alias.

```ts
const container = diBuilder()
  .bindAlias("foo", "service")
  .build(); // Throws error

// Alias "foo" refers to non-existent type binding "service".
```

This validation guarantees that:
- all aliases are valid and resolvable;
- configuration errors are detected early;
- broken or incomplete container setups cannot reach runtime.

## Basic alias binding
Aliases are created using the `bindAlias` operation of the container builder.

Its interface is similar to other binding operations, but instead of a factory or value, you specify **the target binding key**.

Example:
```ts
interface IPaymentExecutor {
  requestPurchase(productId: string): Promise<Purchase>;
}

interface IPurchasesProvider {
  getPurchases(userAccount: string): Promise<readonly PurchaseReceipt[]>;
}

class PaymentService
  implements IPaymentExecutor, IPurchasesProvider {
  // ...
}

const container = diBuilder<{
  paymentExecutor: IPaymentExecutor;
  purchasesProvider: IPurchasesProvider;
  paymentService: PaymentService;
}>()
  // PaymentService -> IPaymentExecutor
  .bindAlias("paymentExecutor", "paymentService")

  // PaymentService -> IPurchasesProvider
  .bindAlias("purchasesProvider", "paymentService")

  .bindFactory(
    "paymentService",
    factoryOf(PaymentService),
    { lifecycle: "lazy" },
  )
  .build();

const executor = container.get("paymentExecutor");
const provider = container.get("purchasesProvider");

assert(executor === provider);
```
Here:
- `PaymentService` is bound only once;
- both interfaces resolve to the same instance;
- no duplicated state is created.


## Binding order and validation
Aliases may reference bindings that are defined later.
Alias resolution is validated during container build, not during binding registration.

This means:
- bindings can be declared in any order;
- configuration becomes more flexible and easier to extend;
- modules do not need strict registration ordering.


## Named aliases
Aliases fully support named bindings.

To create a named alias, specify `name` in the options:
```ts
builder.bindAlias("aliasType", "originType", { name: "aliasName" });

// ...
container.get("aliasType", "aliasName");
```

If the **original binding** itself is named, you must specify `originName`:
```ts
builder
  .bindFactory("iap", factoryOf(WebIapService), { name: "web" })
  .bindAlias("paymentService", "iap", { originName: "web" });
```


## Aliases within the same type
Aliases can also be created within the same type.
This is especially useful for defining a default implementation.

```ts
builder
  .bindFactory("iap", factoryOf(WebIapService), { name: "web" })
  .bindAlias("iap", "iap", { originName: "web" });

// ...
const iapDefault = container.get("iap");
const iapWeb = container.get("iap", "web");

assert(iapDefault === iapWeb);
```

In this case:
- the named implementation is explicitly registered;
- the alias defines which implementation is the default.

## Alias conflicts and conflict strategies
Aliases are bindings, so they participate in conflict resolution just like factories and instances.

All conflict strategies apply: `throw`, `keep`, `replace` and `append`.

Example with replacement:
```ts
builder
  .bindAlias("iap", "iap", {
    originName: "web",
    ifConflict: "replace",
  });
```
This replaces the existing default payment implementation with the web-based one.


## Aliases and multiple bindings
Aliases can be combined with the `append` strategy to form groups/lists.

This pattern is extremely useful when:
- you want direct access to a specific implementation;
- you also want access to all implementations as a group.

```ts
builder
  .bindFactory(
    "handler",
    factoryOf(PublishHandler),
    { name: "publish" },
  )
  .bindAlias("handler", "handler", {
    originName: "publish",
    ifConflict: "append",
  });

// ...
container.get("handler", "publish"); // PublishHandler
container.getAll("handler");         // [..., PublishHandler]
```

The implementation is:
- registered by name for direct access;
- aliased without a name and appended to the list.


## Aliases of aliases
Because aliases bind to bindings, not directly to factories or instances,
**an alias can reference another alias**.

```ts
builder
  .bindAlias("iap", "iap", { originName: "web" })
  .bindAlias("iap", "iap", { name: "default" });

// {iap,default} -> {iap} -> {iap,web}
```
This allows building layered or semantic alias hierarchies.

### Alias cycles
It is possible to accidentally create alias cycles.
The container detects such cycles during container build and throws an error.

```ts
builder
  .bindAlias("aliasA", "aliasB")
  .bindAlias("aliasB", "aliasC")
  .bindAlias("aliasC", "aliasA")
  .build(); // Throws error

// Alias resolution cycle detected:
// [aliasA] -> aliasB -> aliasC -> [aliasA]
```
This prevents infinite resolution loops at runtime.


## Aliases with multiple bindings and aggregation
Aliases can point to bindings that themselves represent multiple bindings (created via `append`).
When this happens, all referenced bindings are **merged** into a single list.

Example:
```ts
builder
  .bindAlias("authHandler", "authProviderA", { ifConflict: "append" })
  .bindAlias("authHandler", "authProviderB", { ifConflict: "append" })

  .bindAlias("iapHandler", "iapServiceA", { ifConflict: "append" })
  .bindAlias("iapHandler", "iapServiceB", { ifConflict: "append" })

  .bindAlias("eventHandler", "notificationService")

  .bindAlias("handler", "authHandler", { ifConflict: "append" })
  .bindAlias("handler", "iapHandler", { ifConflict: "append" })
  .bindAlias("handler", "eventHandler", { ifConflict: "append" });
```

Resolution result:
```ts
container.getAll("authHandler");
// [ AuthProviderA, AuthProviderB ]

container.getAll("iapHandler");
// [ IapServiceA, IapServiceB ]

container.getAll("handler");
// [
//   AuthProviderA, AuthProviderB,
//   IapServiceA, IapServiceB,
//   NotificationService
// ]
```

This enables powerful composition patterns for plugins, handlers, middleware, and pipelines.


## Performance
At first glance, alias chains and aggregation may look expensive.
However, alias resolution is compiled during container build.

At runtime, alias access has **the same performance** as direct access.
There is no traversal of alias chains and no lists are merged dynamically.

Example benchmark:
```ts
const container = diBuilder()
  .bindInstance("foo", 42)
  .bindAlias("aliasA", "aliasB")
  .bindAlias("aliasB", "aliasC")
  .bindAlias("aliasC", "foo")
  .build();

let time = performance.now();
for (let i = 0; i < 1_000_000; i++)
  container.get("aliasA");
console.log("ALIAS", performance.now() - time);

time = performance.now();
for (let i = 0; i < 1_000_000; i++)
  container.get("foo");
console.log("DIRECT", performance.now() - time);
```

Example result on a local machine:
```
ALIAS  123.9279649999986
DIRECT 124.2441640000001
```
This demonstrates that aliases introduce no measurable runtime overhead.


------------------
## Summary
Aliases allow:
- reusing a single binding under multiple types;
- avoiding duplicated instances and state;
- defining defaults and semantic shortcuts;
- aggregating implementations into lists;
- building flexible, extensible configuration graphs.

They are a great feature of **SpireX/DI** that enables expressive and efficient container configuration without sacrificing performance or type safety.
