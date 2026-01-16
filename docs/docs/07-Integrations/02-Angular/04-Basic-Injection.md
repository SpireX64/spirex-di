# Dependency Injection - Basic

Once the bridge integration is set up, you can start using it to inject services into Angular components.

The SpireX/DI ↔ Angular bridge provides **one-way integration**: services defined in SpireX/DI can be injected into Angular components, but Angular services cannot be automatically accessed from the SpireX/DI container.


## Injecting SpireX/DI Services in Angular

To inject a service from SpireX/DI, use the typed tokens provided by the bridge:
```ts
// Get the configured bridge
export const bridge = container.get("AngularBridge");

// Retrieve all service tokens
export const TOKENS = bridge.tokens;
```

The bridge exposes typed `InjectionToken<T>` instances, allowing you to inject services without additional type casting. These tokens are fully compatible with Angular’s DI system, so they can be used in any Angular injectable or component, such as `@Injectable` services or `@Component` classes.

Injection is performed using Angular’s built-in `inject()` function:

> [Angular — Injecting dependencies with `inject()`](https://angular.dev/guide/di#injecting-dependencies-with-inject)

```ts
import { Component, inject } from '@angular/core';
import { TOKENS } from './domain/di';

@Component({ ... })
export class MyComponent {
    private _auth = inject(TOKENS.auth);
}
```

The `inject()` function automatically infers the type from the token, so no explicit casting or type annotation is required.


## Lifecycle considerations
Angular’s dependency injection system does not support a `transient` lifecycle.
When a service is exposed to Angular via the bridge, Angular resolves each `InjectionToken` **once per injector** and then reuses the same instance.

The following SpireX/DI lifecycles are **fully supported** and behave as expected when used from Angular: `singleton`, `lazy` and `scope`. These lifecycles align well with Angular’s DI model and require no special handling.

For services registered with the `transient` lifecycle:
- Angular will not repeatedly invoke the factory on each injection;
- The first resolved instance will be cached by Angular and reused;
- As a result, true `transient` semantics are **not preserved** across the SpireX/DI → Angular boundary

### Safe usage of `transient` with `bindInstance`
It is still safe to use `transient` for services registered via `bindInstance`, because this binding always returns the **same value**. In this case, the lack of repeated factory calls does not change the observable behavior.

### Recommended workaround for `transient` factories
If you need true `transient` behavior in Angular, you can expose an **object containing providers** for the required transient services.

```ts
builder.bindFactory(
  "transients",
  r => ({
    getTypeA: r.providerOf("typeA"),
    getTypeB: r.providerOf("typeB"),
    // ...
  }),
  { lifecycle: "scope" },
);
```

Example usage in Angular injection context:
```ts
private readonly _typeA = inject(TOKENS.transients).getTypeA();
```

Key points of this approach:
- Each call to `getTypeA()` / `getTypeB()` creates a new transient instance;
- Transient semantics are preserved within the current scope.


----------------
## Summary
With the bridge, any service registered in the **SpireX/DI** container can be injected directly into **Angular components** using standard Angular patterns. Typed InjectionTokens ensure type safety, while the familiar `inject()` function keeps your code clean, idiomatic, and **fully compatible with Angular DI**.