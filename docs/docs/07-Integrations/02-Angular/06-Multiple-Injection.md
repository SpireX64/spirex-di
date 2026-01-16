# Dependency Injection - Multiple

Sometimes, you need to provide **not just a single instance**, but a **list of services** through a DI container. 

Angular natively supports this using multi-providers, which allow a token to be associated with multiple providers. The container then returns a list of all registered instances for that token:

```ts
import { InjectionToken, inject } from '@angular/core';

export const INTERCEPTOR_TOKEN =
    new InjectionToken<Interceptor[]>('interceptors');

providers: [
  { provide: INTERCEPTOR_TOKEN, useClass: AuthInterceptor, multi: true },
  { provide: INTERCEPTOR_TOKEN, useClass: LoggingInterceptor, multi: true },
  { provide: INTERCEPTOR_TOKEN, useClass: RetryInterceptor, multi: true },
];

const interceptors = inject(INTERCEPTOR_TOKEN); // Interceptor[]
```

> [Angular - Multiple providers](https://angular.dev/guide/di/defining-dependency-providers#multiple-providers)


## Multiple Bindings in SpireX/DI
SpireX/DI also supports multiple bindings. Unlike Angular, SpireX/DI allows you to retrieve either a **single instance** or the **full list of instances**. When requesting a single instance, the container returns the first registered one:

```ts
builder
    .bindFactory('interceptor', factoryOf(AuthInterceptor), { ifConflict: 'append' })
    .bindFactory('interceptor', factoryOf(LoggingInterceptor), { ifConflict: 'append' })
    .bindFactory('interceptor', factoryOf(RetryInterceptor), { ifConflict: 'append' });

const oneInterceptor = container.get('interceptor');     // Interceptor
const allInterceptors = container.getAll('interceptor'); // Interceptor[]
```

Calling `getAll()` is safe even if there is only a single binding; SpireX/DI will wrap the instance in an array. In Angular, achieving this behavior would require separate tokens for single and multi-instance injection.


## Accessing Multiple Instances via the Bridge
The Angular bridge exposes a helper function, `allOf()`, which allows you to retrieve **all instances** of a given token:

```ts
import { allOf, TOKENS, inject } from './domain/di';

const interceptor = inject(TOKENS.interceptor); // Interceptor
const interceptorsList = inject(allOf(TOKENS.interceptor)); // Interceptor[]
```

> Note: `allOf()` leverages SpireX/DI capabilities.
> It **does not work** for services registered solely via Angular DI.

## Combining Named and Multiple Bindings
SpireX/DI also supports **named multi-bindings**, where multiple instances share the same type and name:

```ts
builder
    .bindFactory(
        "interceptor",
        factoryOf(LoggingInterceptor),
        { name: 'api', ifConflict: 'append' },
    )
    .bindFactory(
        "interceptor",
        factoryOf(RetryInterceptor),
        { name: 'api', ifConflict: 'append' },
    );
```

To access these named lists in Angular, you can combine `allOf()` and `named()`:
```ts
const apiInterceptors = inject(allOf(named(TOKENS.interceptor, 'api')));
```

Alternatively, for brevity, `allOf()` can accept a name as a second argument:
```ts
const apiInterceptors = inject(allOf(TOKENS.interceptor, 'api'));
```

This provides full access to **named and multiple bindings** from SpireX/DI directly within **Angular components**.


-------------------
## Summary
SpireX/DI supports multiple bindings and named multi-bindings, allowing flexible retrieval of single or multiple service instances. 

The Angular bridge exposes these features through the `allOf()` and `named()` helpers, enabling idiomatic, type-safe Angular injection for lists of services.

This approach eliminates the need for separate tokens or complex provider setups in Angular, while fully leveraging SpireX/DI’s advanced DI capabilities.
