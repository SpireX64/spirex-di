# Module Dependencies
When using modules, it is very common to face the following situation
- A service inside one module depends on a service provided by another module.

For example:
- `AuthRepository` depends on an `HttpClient`;
- `UserService` depends on `AuthService`;
- a feature module depends on shared infrastructure.

At first glance, this looks simple — just request the dependency from the container.
But modules introduce an important constraint.

## Why this problem is not trivial?
A module in SpireX/DI:
- knows only about its **own TypeMap**;
- does **not know** which container it will be included into;
- does **not know** which other modules will be present.

This is intentional. A module must be reusable, self-contained and explicit about what it provides.

Because of this, a module **cannot directly access container-level types** or types from other modules unless they are explicitly declared as dependencies.

What happens if we try anyway?
```ts
import { staticModule } from "@spirex/di";
import { AuthRepository } from "./infra";

export const AuthModule = staticModule("auth").create<{
    authRepo: AuthRepository;
}>(binder => {
    binder.bindFactory(
        "authRepo",
        r => new AuthRepository(
            // TypeScript error: Property 'api' is missing
            r.get("api"),
        ),
    );
});
```

- `"api"` is not part of AuthModule’s TypeMap;
- TypeScript correctly reports that this key does not exist;
- allowing this would break the module contract.

This is a **good error** — it prevents accidental coupling to unknown services.


## Declaring module dependencies
To solve this problem, SpireX/DI allows a module **to include other modules as dependencies**.

This is done using the same `include(...)` operation that exists on the container builder — but with a crucial difference (explained below).

```ts
import { staticModule } from "@spirex/di";
import { NetworkModule } from "../network/network.module";
import { AuthRepository } from "./infra";

export const AuthModule = staticModule("auth").create<{
    authRepo: AuthRepository;
}>(binder => {
    binder
        // Declare dependency on NetworkModule
        .include(NetworkModule)

        .bindFactory(
            "authRepo",
            r => new AuthRepository(
                // Good! Now available
                r.get("api"),
            ),
        );
});
```

### What `include` does inside a module?
- it does NOT extend the module’s TypeMap;
- it does **extend the binder’s visible types**;
- types from the included module become available only inside this module.

In other words: _The module can use those types, but does not export them._

## Dependency visibility boundaries
Let’s see how this affects the container.

```ts
// FILE: src/di.ts
import { diBuilder } from "@spirex/di";
import { AuthModule } from "./modules/auth/auth.module";

const container = diBuilder()
    .include(AuthModule)
    .build();

// Error: "api" is not part of container TypeMap
container.get("api");
```

Even though `AuthModule` internally depends on `NetworkModule`, the container **does not automatically expose** its types.

This is a very important design rule: _Module dependencies are not automatically re-exported._


## Explicit container composition
If you want services from a dependency module to be available in the container, you must **explicitly include that module into the container**.

```ts
// FILE: src/di.ts
import { diBuilder } from "@spirex/di";
import { AuthModule } from "./modules/auth/auth.module";
import { NetworkModule } from "./modules/network/network.module";

const container = diBuilder()
    .include(AuthModule)
    .include(NetworkModule)
    .build();

container.get("api"); // ApiService
```

This explicitness gives you full control over:
- which services are public;
- which services are internal implementation details.


## Private (internal) module dependencies
This mechanism allows you to intentionally **hide internal services**.

A powerful pattern is creating internal modules that:
- are included only inside public module;
- are never included directly into the container;
- expose implementation details without leaking them.

Example: internal auth services
```ts
// FILE: src/modules/auth/auth.module.ts
import { staticModule, factoryOf } from "@spirex/di";

import { NetworkModule } from "../network/network.module";

import { AuthService } from "./domain";
import { AuthRepository, AuthGateway } from "./infra";

export const AuthModule = staticModule("auth").create<{
    auth: AuthService;
}>(binder =>
    binder
        // External dependency
        .include(NetworkModule)

        // Internal module (private)
        .include(
            staticModule("auth-internal").create<{
                authRepo: AuthRepository;
                authGateway: AuthGateway;
            }>(internal => {
                internal
                    .bindFactory("authRepo", factoryOf(AuthRepository))
                    .bindFactory("authGateway", factoryOf(AuthGateway));
            }),
        )

        // Public service
        .bindFactory(
            "auth",
            r => new AuthService(
                r.get("authRepo"),
                r.get("authGateway"),
            ),
        ),
);
```

What this achieves?
- `authRepo` and `authGateway` types:
  - are fully typed;
  - are injectable inside `AuthModule`;
  - cannot be accessed from the container.

- `auth` type:
  - is the only public service;
  - defines the module’s public API.

Resulting container behavior:
```ts
// FILE: src/di.ts
const container = diBuilder()
    .include(AuthModule)
    .include(NetworkModule)
    .build();

container.get("api");  // ApiService (via NetworkModule)
container.get("auth"); // AuthService (via AuthModule)

// Error: Argument of type '"authRepo"' is not assignable
container.get("authRepo");
```

This gives you:
- clean public APIs;
- strong encapsulation;
- explicit architectural boundaries.


## Module file structure and import rules
When working with modules, it is useful to follow a clear and consistent rule:
- A module file should only import what it owns.
- Everything external must be accessed through module dependencies.

This rule is not enforced by **SpireX/DI** at the language level, but following it leads to a much cleaner, safer, and more scalable architecture.


### What a module file usually imports
If you look closely at a well-designed module file, you may notice a clear pattern.

#### 1. Services provided by the module
All services that the module provides are imported from the same directory or its child directories.

```ts
// FILE: src/modules/auth/auth.module.ts

import { AuthService } from "./domain";
import { AuthRepository, AuthGateway } from "./infra";
```

These imports represent:
- the public API of the module;
- its internal implementation details.

They define **what this module owns**.

#### 2. External services are NOT imported directly
Services from other modules are **not imported as classes**.

Instead:
- the module declares a dependency using `include(...)`;
- and accesses those services via the resolver `r.get(...)`.

```ts
// Correct approach
binder
    .include(NetworkModule)
    .bindFactory(
        "authRepo",
        r => new AuthRepository(r.get("api")),
    );
```

If the module imported `ApiService` directly:
- it would silently couple itself to a concrete implementation;
- replacing or mocking that service would become harder;
- the dependency would not be visible at the DI level.

Using module dependencies makes relationships:
    explicit, traceable and verifiable at build time.


### Why this pattern is important?
This structure gives several important benefits:

- **Clear ownership.**
    You can immediately see which services belong to the module;

- **Explicit dependencies.**
    All external requirements are declared via `include`;

- **Loose coupling.**
    Modules depend on contracts, not implementations;

- **Better reusability.**
    The module can be reused in different containers;

- **Safer refactoring.**
    Dependencies are validated during container build.

In practice, the module file becomes **a composition root for a feature**, not a place where infrastructure leaks in.


### Allowed and expected exceptions
There are a few cases where importing external symbols is not only allowed, but expected.

#### 1. Importing external types only
Using `import type` is completely safe and encouraged.

```ts
import type { IHttpClient } from "@shared/http";
```

Why this is fine:
- it has **no runtime** dependency;
- it does not couple the module to an implementation;
- it improves type safety and readability.

This is especially useful for:
    interfaces, DTOs and generic type definitions.

### 2. Helper functions and builders
Pure functions, helpers, or builders can be imported freely.

```ts
import { createAuthConfig } from "../../helpers/createAuthConfig";
```

These functions:
- do not represent services;
- do not hold state;
- do not require lifecycle management.

They are just **tools**, not dependencies.

### 3. Module-specific extensions of external services
Sometimes a module needs to: extend, configure or adapt an external service specifically for its own needs.

In this case, importing a factory or helper related to that service is acceptable.
```ts
import { httpHeader } from "../network/factories";

binder.bindFactory(
    "httpHeader",
    r => {
        const auth = r.get("auth")
        return httpHeader(
            "Authorization",
            () => auth.credentials.token,
        ),
    },
    { ifConflict: "append" },
);
```

The key rule here is:
- The module does not own the external service — it only wraps or extends it for internal use.


### Mental model
You can think of a module file as: _A contract + composition root for a feature._

It defines:
- what the feature exposes;
- what it requires;
- and how its internal parts are wired together.

Everything else accessed explicitly through DI.

Such a file:
- reads like documentation;
- enforces architectural boundaries;
- scales well as the project grows.


---------------
## Summary
- A module only knows about its own **TypeMap**.
- Module dependencies must be declared explicitly using `include`.
- Dependencies included inside a module:
  - are available only during module configuration;
  - are NOT automatically exposed by the container.
- The container controls what is public by explicitly including modules.
- Internal modules are a powerful way to hide implementation details.

This design keeps large applications: maintainable, predictable and architecturally sound.
