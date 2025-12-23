# Binding Conflicts

When configuring a container, a conflict may occur if multiple bindings are registered for the same type key and the same name.

By default, the container builder treats this situation as an error.
If a conflict is detected, an exception is thrown immediately.
This behavior helps surface configuration mistakes early
and prevents ambiguous dependency resolution.

However, strict failure is not always desirable. In real applications, container configuration may depend on:
- platform-specific overrides
- environment conditions
- optional modules
- feature flags
- test setups

For these cases, SpireX/DI provides configurable **conflict resolution strategies**.

## Conflict Resolution Strategy

The conflict resolution strategy is controlled by the `ifConflict` option, which can be provided for each binding.

This option defines what the builder should do if a binding with the same type key and name already exists.

If not specified, the default strategy is `throw`.

```ts
builder
  .bindFactory("apiKey", () => "wSrU9SVA1WnB", { ifConflict: "throw" })
  .bindFactory("apiKey", () => "mHGB5gNsgya6", { ifConflict: "throw" }); // Throws error
```

This strict mode is useful for catching accidental duplicate bindings and configuration mistakes.


### Strategy: throw (default)
The `throw` strategy immediately fails when a conflict is detected.

Characteristics:
- Prevents silent overrides;
- Makes configuration errors obvious;
- Encourages explicit and predictable setup.

This strategy is recommended for:
- Core application configuration;
- Critical services;
- Early development stages.

It ensures that every binding is intentional and unique.


### Strategy: keep
The `keep` strategy ignores the new binding if a conflict is detected and preserves the existing one.

```ts
builder
  .bindFactory("apiKey", () => "wSrU9SVA1WnB")
  .bindFactory("apiKey", () => "mHGB5gNsgya6", { ifConflict: "keep" });
```

In this example, the second binding is ignored and the original value remains active.

This strategy is useful when:
- Providing default or fallback bindings;
- Allowing more specific modules to override behavior;
- Composing containers from optional modules.

```ts
// Example: environment-based fallback
builder.bindFactory("logger", factoryOf(ConsoleLogger));

if (env.production) {
  builder.bindFactory("logger", factoryOf(ProdLogger), { ifConflict: "keep" });
}
```
Here, the production logger is only used if no logger was already registered earlier.

### Strategy: replace
The `replace` strategy removes the existing binding and replaces it with the new one.

```ts
builder
  .bindFactory("apiKey", () => "wSrU9SVA1WnB")
  .bindFactory("apiKey", () => "mHGB5gNsgya6", { ifConflict: "replace" });
```
In this case, the second binding becomes active and completely replaces the first one.

This strategy is especially useful when:
- Overriding default implementations;
- Injecting test doubles or mocks;
- Switching implementations based on runtime conditions.

```ts
// Example: replacing services in tests
builder.bindFactory("iap", factoryOf(IapService));

if (env.test) {
  builder.bindFactory("iap", factoryOf(FakeIapService), {
    ifConflict: "replace",
  });
}
```
This allows test code to transparently replace real services without changing application logic.

```ts
// Example: feature flag override
builder.bindFactory("paymentService", factoryOf(LegacyPaymentService));

if (features.newPayments)
  builder.bindFactory(
    "paymentService",
    factoryOf(NewPaymentService),
    { ifConflict: "replace" },
  );
```

### Strategy: append
The `append` strategy preserves both the existing binding and the new one.

This strategy enables **multiple bindings** for the same type key, instead of forcing a single winner.

Because this behavior has specific semantics and implications, it is covered in detail in the section about multiple bindings. For now, it is important to know that:

- no binding is removed
- no error is thrown
- both bindings remain available to the container

This strategy is useful for extensibility scenarios, such as:
- plugin systems
- pipelines
- observers

## Important Notes
- Conflict detection applies to the full binding identity (type key + name);
- Named bindings and unnamed bindings are treated as distinct;
- Conflict strategies affect only the current binding operation;
- Choosing the wrong strategy can hide configuration errors

In general:
- Use `throw` for correctness and safety;
- Use `keep` for fallbacks and optional behavior;
- Use `replace` for explicit overrides;
- Use `append` for extensibility patterns.

---------
## Summary
Binding conflicts occur when multiple bindings target the same type key and name.

SpireX/DI allows you to control how these conflicts are handled using the `ifConflict` option.

- Default behavior is to throw an error;
- `throw` strategy enforces strict and explicit configuration;
- `keep` strategy preserves existing bindings;
- `replace` strategy overrides existing bindings;
- `append` strategy allows multiple bindings.

Conflict resolution strategies make container configuration flexible while keeping behavior explicit and predictable.

## Related Topics
> - Multi Bindings
> - Aliases
