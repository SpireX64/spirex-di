# Dependency Injection - Named

The SpireX/DI container supports named bindings, a pattern that allows multiple implementations of the same type to coexist by distinguishing them with a name.

```ts
const container = diBuilder<{
    auth: IAuthService;
}>()
    .bindFactory('auth', factoryOf(EmailAuthService), { name: 'email' })
    .bindFactory('auth', factoryOf(OAuthService), { name: 'oauth' })
    .build();
```

When retrieving a specific implementation, you provide the name so the container knows which instance to return:

```ts
const auth = container.get('auth', 'email'); // EmailAuthService
const auth = container.get('auth', 'oauth'); // OAuthService
```

Angular’s DI system **does not natively support** named bindings, as it relies on **unique tokens** for dependency resolution. However, when integrating with SpireX/DI, it’s often necessary to access named services directly within Angular components.


## Named Injection in Angular

The bridge introduces a helper function, `named()`, which allows you to specify a service name for injection. This function takes a *token* and a *name*, returning a value that can be used with Angular’s `inject()` function:

```ts
import { Component, inject } from '@angular/core';
import { TOKENS, named } from './domain/di';

@Component({ ... })
export class MyComponent {
    private _auth = inject(named(TOKENS.auth, 'oauth')); // OAuthService
}
```

This approach provides full access to **named bindings in SpireX/DI** while keeping Angular’s DI API untouched. Developers can now inject specific implementations by name without modifying standard Angular patterns or tokens.


-------------
## Summary
Named bindings allow multiple implementations of the same type to coexist in SpireX/DI. The Angular bridge exposes these bindings via the `named()` helper, enabling developers to inject specific named services directly into Angular components. This preserves type safety, maintains Angular’s idiomatic DI usage, and fully leverages the flexibility of SpireX/DI within Angular applications.
