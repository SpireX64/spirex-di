# Why Use Both SpireX/DI and Angular DI?

In large organizations, it is common to have a set of reusable services—such as analytics, authentication, or payment—that are shared across multiple applications. **Reusing** these services prevents duplication and ensures consistency, allowing teams to integrate them **without rewriting** the same logic for each project.

However, these applications often use **different frameworks**, including Angular, NestJS, Svelte, React, or Express. Each of these frameworks typically relies on its own dependency injection (DI) system. This leads to a situation where developers must either **adopt** the framework’s built-in DI or **manage** two separate DI systems simultaneously.

For example, in **Angular**, a developer might need to use both Angular DI and a domain-specific DI container, as shown below:

```ts
import { container } from "some-di-lib";
import { Component, inject } from '@angular/core';
import { TOKENS } from './tokens';

@Component({ ... })
class MyComponent {
    // Angular DI
    private router = inject(TOKENS.router);

    // Domain-level DI
    private auth = container.Resolve<IAuthService>('auth');
}
```

This dual-DI approach increases cognitive overhead. Developers must know which container a service is registered in and often need to learn a second DI framework just to access a required service.

## The SpireX/DI – Angular Bridge
The SpireX/DI ↔ Angular bridge was created to address this problem. 

It provides seamless integration between the two DI systems, allowing developers to:
- Use pre-configured services from the **SpireX/DI** container.
- Access them using the familiar **Angular API** without duplicating configuration.
- Maintain framework-native injection patterns while leveraging existing service infrastructure.

With the bridge, the same component can inject both **Angular** and **domain-level** services uniformly:

```ts
import { Component, inject } from '@angular/core';
import { TOKENS } from './tokens';

@Component({ ... })
class MyComponent {
    private router = inject(TOKENS.router);
    private auth = inject(TOKENS.auth);
}
```

This approach simplifies development, reduces mental overhead, and encourages code reuse across different frameworks.


--------------
## Summary
In complex applications with multiple frameworks, developers often face the challenge of working with more than one DI system. The SpireX/DI – Angular bridge solves this by connecting the domain-level DI container with Angular’s native DI. It enables developers to use existing services without reconfiguring them and allows Angular components to remain idiomatic. Ultimately, this integration reduces cognitive load and fosters consistent, reusable service patterns across projects.
