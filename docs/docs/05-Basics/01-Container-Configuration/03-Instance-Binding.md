# Instance Binding

In **SpireX/DI**, the `bindInstance` operation is used to register **pre-existing values or objects** as dependencies in the container.

This is the simplest form of binding and is intended for objects or values that are already created and do not require additional instantiation or dependency resolution.


## Binding Values or Instances

Use `bindInstance` operation to register a **pre-existing value or object** as a dependency in the container.

```ts
bindInstance<T extends keyof TypeMap>(
    type: T,
    instance: TypeMap[T],
    options?: TTypeBindingOptions,
): this // extends ITypeEntryBinder<TypeMap>;
```

### Parameters
- `type` – The key from the `TypeMap` representing the type to bind.
- `instance` – The pre-existing value or object that will be associated with this type.
- *`options` (optional)* – Configuration options that control the binding's behavior.

### Return value
Returns `ITypeEntryBinder<TypeMap>` the current binder instance to allow method chaining.

### Example
```ts
const container = diBuilder<{
    sampleNumber: number;
    sampleString: string;
}>()
  .bindInstance("sampleNumber", 42)
  .bindInstance("sampleString", "Hello")
  .build();
```
- "sampleNumber" is bound to the primitive value `42`.
- "sampleString" is bound to the string `"Hello"`.

After building the container, you can retrieve these values directly:

```ts
console.log(container.get("sampleNumber")); // 42
console.log(container.get("sampleString")); // "Hello"
```


## Lifecycle

Instances registered via `bindInstance` are **always singletons**.

Key points about their lifecycle:
- The instance exists **before the container is built**.
- The container does **not** create, cache, or manage them like a factory-based instance.
- These instances are **immutable** within the container; you cannot replace or rebind them after the container is built.
- They are **stored directly in the binding**, not in the container's runtime cache.


## Dependency Restrictions

Since `bindInstance` registers already-created objects, the bound instances **cannot have dependencies**.

- No dependency injection occurs for bindInstance.
- The container assumes the instance is fully constructed and ready to use.


## Performance

Retrieving an instance bound with bindInstance is instantaneous:

- No factory or resolver is executed.
- No lifecycle checks or dependency resolution are performed.
- The container simply returns the stored value immediately, making it the fastest binding type.


## Practical Notes
- `bindInstance` is ideal for constants, configuration objects, or singleton services that are created externally.
- Use `bindInstance` when the instance is fully initialized and does not require other services from the container.
- For dynamically constructed services or services with dependencies, use `bindFactory` instead (see the Factory Binding section).

## Summary

- `bindInstance` registers **existing** values or objects as dependencies.
- All `bindInstance` entries are **singletons** and stored in the binding itself.
- Instances do **not** have dependencies.
- Retrieval is **immediate**, making it highly efficient.
- Recommended for constants, pre-initialized objects, or configuration values.
