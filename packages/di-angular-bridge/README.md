![NPM Type Definitions](https://img.shields.io/npm/types/%40spirex%2Fdi-angular-bridge?style=for-the-badge)
[![NPM Version](https://img.shields.io/npm/v/%40spirex%2Fdi-angular-bridge?style=for-the-badge)](https://www.npmjs.com/package/@spirex/di-angular-bridge)
[![Codecov](https://img.shields.io/codecov/c/github/spirex64/spirex-di?token=VXQZK5WDSY&flag=di-angular-bridge&style=for-the-badge)](https://codecov.io/github/SpireX64/spirex-di)
![GitHub License](https://img.shields.io/github/license/spirex64/spirex-di?style=for-the-badge)

# SpireX/DI Bridge for Angular
`@spirex/di-angular-bridge`

Seamless integration bridge between **SpireX/DI** and **Angular Dependency Injection (DI)**.  

This library allows developers to leverage Angular’s DI API while maintaining type-safe injections from SpireX/DI. Perfect for projects that want the best of both DI systems without losing strict typing.

## Why Use Bridge?
If you are using **SpireX/DI** in your application and want to integrate it with Angular’s DI ecosystem, this bridge simplifies the process. Key benefits include:

- **Type-safe Angular injections**: Use *SpireX/DI* services directly in Angular components and services while preserving full TypeScript types.
- **Automatic provider generation**: Generates Angular providers from your *SpireX/DI* container effortlessly.
- **Flexible integration**: Supports both the new `inject()` function and traditional constructor injection with `@Inject`.
- **Lightweight**: Focused on bridging DI systems without adding unnecessary overhead. Only ~1.3Kb (0.66Kb gzip).


## Installation
```shell
npm install @spirex/di @spirex/di-angular-bridge
# or
yarn add @spirex/di @spirex/di-angular-bridge
```


## Quick Start

### 1. Configure SpireX/DI with Angular Bridge
```ts
import { diBuilder, factoryOf } from '@spirex/di';
import { AngularBridge } from '@spirex/di-angular-bridge';
import { IAuthService, AuthService } from './services/auth';

// Build DI container and attach AngularBridge
export const container = diBuilder<{
    auth: IAuthService; 
}>()
    .bindFactory('auth', factoryOf(AuthService))
    .use(AngularBridge())
    .build();
```

### 2. Access the Bridge and Tokens
```ts
// Retrieve the configured Angular bridge
export const bridge = container.get('AngularBridge');

// InjectionToken-s can be used with Angular DI
export const TOKENS = bridge.tokens;
```

### 3. Register Providers in Angular
```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
    providers: [
        ...bridge.providersForRoot(),
    ]
});
```

### 4. Inject Dependencies in Components
Using `inject()` function:
```ts
import { Component, inject } from '@angular/core';

@Component({ ... })
export class MyComponent {
    private auth = inject(TOKENS.auth); // IAuthService
}
```

Using constructor injection with `@Inject`:
```ts
import { Component, Inject } from '@angular/core';

@Component({ ... })
export class MyComponent {
    constructor(
        @Inject(TOKENS.auth) private auth: IAuthService,
    ) {}
}
```

## Documentation

- [Why Use Both SpireX/DI and Angular DI?](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/02-Angular/01-Why-Two-Containers.md)
- [Package installation](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/02-Angular/02-Installation.md)
- [Angular Bridge Setup](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/02-Angular/03-Bridge-Setup.md)
- [Basic Dependency Injection](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/02-Angular/04-Basic-Injection.md)
- [Named Dependency Injection](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/02-Angular/05-Named-Injection.md)
- [Multiple Dependencies Injection](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/02-Angular/06-Multiple-Injection.md)
- [Injection Scopes](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/02-Angular/07-Injection-Scopes.md)

-------------------
## License

@spirex/di-angular-bridge is released under the MIT License.

You are free to use, modify, and distribute the library in both personal and commercial projects.