# Module Composition

## Managing Feature-Scoped Modules in Large Applications

In applications following a DDD-style architecture, it is common to structure code around feature-oriented modules. Each module typically exists to serve a single core service, while also defining all of its internal dependencies. For example, a `Users` feature module may expose a `UsersService`, while internally wiring gateways, repositories, and loggers that are not meant to be consumed directly outside the feature.

```ts
const UsersModule = staticModule("Users").create<{
    users: UsersService
    usersGateway: IUsersGateway
    usersRepository: IUsersRepository
    usersLogger: IUsersLogger
}>(binder => {
    // bindings
})
```

Conceptually, such a module encapsulates everything required for one feature to function. However, in real-world systems, the number of these feature modules can grow very large. When each module has to be registered individually in the DI container, container configuration quickly becomes verbose and hard to maintain.

```ts
const container = diBuilder()
    .include(UsersModule)
    .include(SplashesModule)
    .include(PaywallsModule)
    .include(OffersModule)
    .include(CatalogModule)
    // 200+ includes ...
    .build()
```

This is primarily a configuration scalability problem rather than a design flaw in the modules themselves.


## Composing Modules

SpireX/DI addresses this issue by allowing modules to be _composed_ into higher-level modules. A module composition groups several independent modules into a **single composite module** that can be included as one unit.

```ts
const MarketingModule = staticModule("Marketing").compose(
    SplashesModule,
    PaywallsModule,
    OffersModule,
)
```

The resulting module is a regular static module that exposes the combined public types of all modules included in the composition. No bindings are duplicated or merged implicitly; each underlying module keeps its own identity and internal structure.


## Using a Composite Module in the Container
Once a composition is created, it can be included in the container just like any other module. All services and types provided by the composed modules become available for resolution.

```ts
const container = diBuilder()
    .include(MarketingModule)
    .build()
```

This dramatically reduces boilerplate in container configuration while preserving clear feature boundaries.

## Compositions Are First-Class Modules
A **composite module** is not a special construct—it behaves exactly like a **normal module**. This means it can:

- Be included directly in the DI container.
- Be used as a dependency of another module.
- Participate in higher-level compositions.

For example, you can build more abstract or domain-level groupings by composing existing composites and standalone modules together:

```ts
const MonetizationModule = staticModule("Monetization").compose(
    AccessModule,
    InAppPurchasesModule,
    MarketingModule,
)
```

Each module in the composition remains reusable on its own. You are not forced to use the composite everywhere; it merely provides a convenient aggregation when needed.


## Common Infrastructure Composition
A common and practical use case for module composition is grouping frequently used infrastructure modules. Instead of repeatedly depending on the same low-level modules across many feature modules, you can define a shared composite once.

```ts
const Commons = staticModule("Commons").compose(
    ConfigModule,
    LogModule,
    StorageModule,
    DateTimeModule,
)
```

Feature modules can then depend on `Commons` for access to shared services, while the application container can include large, meaningful compositions rather than dozens or hundreds of individual modules.


-------------------
## Summary

Module composition in SpireX/DI helps keep DI configuration manageable as applications scale. It allows you to group related feature or infrastructure modules into higher-level abstractions without sacrificing modularity or reuse. Composite modules behave exactly like regular modules and can be nested or reused freely. This approach encourages clean dependency boundaries in feature modules while enabling concise and expressive container setup.
