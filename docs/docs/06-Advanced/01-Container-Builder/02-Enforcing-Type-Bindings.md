# Enforcing Type Bindings

When building large, modular configurations in TypeScript or JavaScript, ensuring that all critical types are properly bound can be challenging.

**In complex setups** with multiple modules or middleware, it is easy to overlook **a missing binding**. This can lead to runtime errors or incomplete dependency graphs.

The SpireX/DI container addresses this issue by allowing developers to **explicitly declare required types** using the `requireType` operation.

This enforces that a given type **must have** a binding in the container before it is built.


## Usage
The `requireType` method is called during container configuration to specify types that must be bound. You can also provide a second argument to check for named bindings. 

The container verifies these requirements **at build time**, throwing an error if any required type is missing.

```ts
import { diBuilder, factoryOf } from "@spirex/di";
import { ILogger, AppLogger } from "./logger";

const container = diBuilder<{
    logger: ILogger;
}>()
    .requireType("logger") // Ensure logger is bound
    .bindFactory("logger", factoryOf(AppLogger))
    .build();
```

If a required type is not bound, `build()` will throw an error:
```ts
const container = diBuilder<{
    logger: ILogger;
}>()
    .requireType("logger")
    .build(); 
// Throws Error: Required type "logger" is not bound.
```

This feature is particularly useful in **plain JavaScript**, where **TypeMap** usage is not possible. 

Here, `requireType` effectively acts as a contract, ensuring that the container provides the required implementations.
```js
const container = diBuilder()
    // Using "requireType" like a TypeMap contract in plain JS
    .requireType("logger")

    .bindFactory("logger", factoryOf(AppLogger))
    .build();
```


## Integration with Modules
Modules can also declare **required types** using requireType. 

This allows a module to **specify dependencies that must be provided externally** by the container or by other modules. During container build, all such requirements from all modules are aggregated and verified.

```ts
const DataModule = staticModule("data").create<{
    dbContext: DataBaseContext;
    dbProvider: IDataBaseProvider;
}>(binder => {
    binder
        // Module requires an external provider
        .requireType("dbProvider")

        // Module provides dbContext
        .bindFactory("dbContext", factoryOf(DataBaseContext)); 
});
```
In this example, `DataModule` provides a binding for `dbContext`, but cannot function without a `dbProvider`. The container **must ensure** that `dbProvider` is bound either via another module or a direct container binding.


## Notes
- **Build-time enforcement.** 
    `requireType` only checks for missing bindings at the moment `build()` is called. Ensure all required types are bound before building the container.
- **Named bindings.**
    Use the second argument of `requireType` to validate named bindings.
- **Module aggregation.** 
    When multiple modules declare required types, the container aggregates all requirements and performs a single verification during build.


----------------------
## Summary
The `requireType` operation in SpireX/DI is a mechanism to enforce that critical types are bound in the container at build time.

It helps prevent missing dependency issues in large, modular configurations, works seamlessly in both TypeScript and plain JavaScript, and supports named bindings.

Modules can use `requireType` to declare external dependencies, ensuring the container provides all necessary implementations.

By combining this feature with standard bindings, developers can maintain robust and predictable dependency graphs in complex applications.
