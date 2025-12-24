# Safe Factory Binding
Factory binding has one important limitation: dependency validation happens only at the moment an instance is created.

This is a natural consequence of how factories work — the container cannot know which dependencies are requested without actually executing the factory function.

Executing a factory merely to discover its dependencies is **unsafe**:
- the factory may create objects;
- it may perform side effects;
- it may assume the application is already running.

Because of this, regular factory bindings are validated only when the instance is first created.

For most services this is acceptable, but for critical parts of the application it is often desirable to detect missing or invalid dependencies as early as possible — ideally during container build.

This is exactly what safe factory binding is designed for.


## What Is Safe Factory Binding?
Safe factory binding is a variation of factory binding that allows the container to validate dependencies during container build, without creating the actual instance.

The core idea is to split the factory into **two separate steps**:
1. A dependency declaration function — describes what dependencies are required.
2. An instance creation function — describes how the instance is created.

This separation allows the container to safely analyze dependencies without triggering any side effects.

## Basic Usage
Safe factory binding is done using `bindSafeFactory`.

```ts
builder.bindSafeFactory(
  "authService",
  // Declare dependencies
  r => ({
    repo: r.get("authRepo"),
    gateway: r.get("authGateway"),
  }),
  // Create instance
  d => new AuthService(d.repo, d.gateway),
);
```

Here:
- The first function declares which dependencies are needed;
- The second function creates the actual instance using those dependencies.

From the consumer’s point of view, this behaves the same as a regular factory binding.


## How Dependency Validation Works?
During container build, only the **dependency declaration function** is executed.

Important details:
- The resolver passed to this function is a stub;
- This stub does not resolve real instances;
- Instead, it records which types were requested.

After the function finishes:
- The container checks that all requested types are properly bound;
- Errors are reported immediately if something is missing or invalid.

The instance creation function is **not called** at this stage, so:
- No objects are created;
- No side effects occur;
- No initialization logic is executed.

This makes the process safe and predictable.

Aside from early dependency validation, safe factory binding behaves the same as `bindFactory`.


## When Safe Factory Binding Is Useful?

Safe factory binding is especially valuable when:
- The container configuration is complex;
- There are many conditional bindings;
- Different platforms or environments are supported;
- Some services are critical and must fail fast if misconfigured.

For example, in applications where:
- Certain services exist only on specific platforms;
- Bindings depend on runtime flags or build targets;
- Errors should surface immediately on startup.

Safe factory binding helps catch configuration problems early, before the application starts doing real work.

----------------

## Summary
Safe factory binding is a stricter and safer form of factory binding.

- Regular factories validate dependencies only when creating an instance;
- Safe factories validate dependencies during container build;
- This is achieved by splitting dependency declaration and instance creation;
- No instances are created during validation;
- This approach is ideal for critical services and complex configurations.


## Related Topics
> - Factory Binding
> - Type Requirement
> - Conditional Bindings
