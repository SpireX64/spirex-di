# Container Builder Default Options

The container provides a mechanism **to globally override default options** that apply to all bindings.

This feature is particularly useful when a project has consistent preferences for factory lifecycles or conflict resolution strategies.

By configuring these defaults at the container level,
you can **avoid repeatedly specifying the same options** for every binding,
making your dependency injection setup cleaner and less error-prone.


## Configuring Default Options
You can set default options by passing an options object to the container builder:
```ts
const builder = diBuilder<{
    auth: AuthManager;
}>({
    // Default builder options
});
```

Currently, the container supports overriding the following default options:

- Conflict resolution strategy (`ifConflict` option)
- Factory lifecycle (`lifecycle` option)

## Conflict Resolution Strategy
By default, the container uses the `"throw"` strategy for resolving conflicts between bindings.

This means that if you attempt to bind an implementation to a type that already has a binding with a different implementation, the container will **immediately throw an error**.

This approach highlights configuration issues upfront rather than silently replacing or ignoring bindings, and is **recommended for most projects**.

However, in some situations, another strategy may be more convenient. To globally change the default strategy, use the `ifConflict` option when creating the builder:

```ts
const builder = diBuilder<{
    value: number;
}>({
    ifConflict: "replace",
})
    .bindInstance("value", 11)  // will be replaced silently
    .bindInstance("value", 22); // previous value replaced without error
```

In this example, the `"replace"` strategy is set as the default.

Now, any subsequent bindings for the "value" type will **silently replace** previous bindings instead of throwing errors.


## Factory Lifecycle
By default, factories are bound with the `"singleton"` lifecycle. This is efficient for small to medium applications and ensures quick resolution.

However, if your project contains many services, a singleton lifecycle can **increase startup time and memory usage**. In such cases, it may be preferable to use the `"lazy"` lifecycle as the default, so that services are created only when requested.

You can set the default lifecycle globally using the `lifecycle` option:
```ts
const builder = diBuilder<{ auth: AuthManager }>({
    lifecycle: "lazy",
})
    .bindFactory(
        "auth",
        factoryOf(AuthManager)
        // automatically uses "lazy"
    );
```

If you need a specific factory to override the default lifecycle, you can still specify it in the binding options:
```ts
const builder = diBuilder<{ auth: AuthManager }>({
    lifecycle: "lazy",
})
    .bindFactory(
        "auth",
        factoryOf(AuthManager),
        { lifecycle: "singleton" } // overrides the default
    );
```

## Best Practices
- Use default options to reduce repetitive configuration across bindings.
- Prefer the `"throw"` strategy initially to detect conflicts early, switching to other strategies only **when necessary**.
- Consider using `"lazy"` lifecycle for projects with many services to **optimize** memory usage and startup performance.
- Explicitly override defaults only for exceptional cases where a binding requires different behavior.


---------------
## Summary
Container builder default options allow you to globally configure conflict resolution strategies and factory lifecycles, reducing boilerplate and ensuring consistent behavior across bindings. 

The `"throw"` strategy helps detect binding conflicts early, while `"replace"` can be set globally when silent replacement is preferred. 

Factory lifecycles can be set to `"singleton"` for quick resolution or `"lazy"` for memory-efficient, on-demand instantiation.

These defaults can still be overridden per binding when necessary, offering flexible and maintainable container configuration.
