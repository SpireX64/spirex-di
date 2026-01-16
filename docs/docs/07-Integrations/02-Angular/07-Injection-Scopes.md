# Injection Scopes

SpireX/DI allows you to create **injection scopes**, which limit the lifecycle of services to a specific context. This enables components or features to have **private instances** of services while still sharing global singletons or lazy services from the root container.

In Angular, this concept is similar to **component-level injectors**. Each component can define its own providers while still accessing services from parent components. The SpireX/DI Angular bridge ensures these scopes integrate seamlessly with Angular's dependency injection system.


## Using Scopes in Angular Components
To create an isolated scope for a component, use the bridge’s `providersForScope()` method. This prepares all `"scope"` services for Angular injection:

```ts
@Component({
  providers: [
    // Create an isolated "profile" scope for scoped services
    ...bridge.providersForScope("profile"),
  ],
})
class ProfileComponent implements OnDestroy {
    // Access the current scope context
    private readonly _scope = inject(TOKENS.ScopeContext);

    ngOnDestroy() {
        // Dispose the scope when the component is destroyed
        this._scope.dispose();
    }
}
```

Key points for usage:
- The component hosting the scope becomes the **owner** of the isolated services.
- Always call `_scope.dispose()` in `ngOnDestroy()` to **release resources and prevent memory leaks**.
- Singleton and lazy services are **always retrieved from the root container**, even in isolated scopes.


## How Isolated Scopes Work
By default, a SpireX/DI child scope will **check parent scopes** for existing `"scope"` services to reuse instances. For **component-local behavior** in Angular, the bridge creates an **isolated scope** that ignores parent scopes for `"scope"` services.

Creating a scope via `providersForScope()` in Angular is equivalent to:
```ts
const scope = container.scope("profile", { isolated: true });
```

- Isolated scopes only bypass parent checks for "scope" services.
- Singleton and lazy services remain shared from the root.

This ensures component-level scoped services behave **predictably**, like Angular’s component-level providers, without accidentally reusing parent scope instances.


## Naming Scopes
Scope names must be unique within their branch of the scope tree, but identical names are allowed in separate branches: `profile -> settings, notifications -> settings`

Each branch is independent, preventing conflicts between scopes with the same name in different parts of the application.

## Scope Context Object
When you inject `TOKENS.ScopeContext` into a component, you get a small **context object for the scope**:

- `dispose()` — Cleans up all services within the scope. **Must be called in** `ngOnDestroy()`.
- `current` — Returns the name of the current scope (e.g., "profile").
- `path` — Returns the stack of scope names from the root (excluding the root).

> For standard Angular usage, calling `dispose()` is the only required action. Properties like `current` and `path` are primarily used in container factories or advanced scenarios.


## Best Practices
- **Use scopes for isolated services:** Scopes allow components or features to have dedicated service instances without affecting the global container.
- **Dispose scopes to free resources:** Calling dispose() not only cleans up the scope itself but also its contained services, reducing memory usage.
- **Define clear scope boundaries:** SpireX/DI scopes for Angular help structure application boundaries. Giving scopes descriptive, meaningful names improves maintainability and clarity.


--------------------
## Summary
Injection scopes in SpireX/DI provide isolated service instances within Angular components, allowing each component or feature to manage its own services independently. This creates clear boundaries inside the application, improves modularity, and ensures that resources are properly released when components are destroyed.

Using scopes through the Angular bridge helps developers keep features isolated while still leveraging shared services from the global container.
