# Static Modules

## Why modules exist?
Even a relatively small application usually contains dozens of services:
repositories, gateways, use cases, domain services, helpers, adapters, etc.

If all of these services are defined in a single DI configuration file, several problems quickly appear:
- the file becomes large and visually overloaded;
- it becomes hard to understand which services belong to which feature;
- the file accumulates many imports of types and implementations;
- reusing part of the configuration becomes difficult, because bindings have to be copied one by one.

To solve these problems, **SpireX/DI introduces a module system**.

A module is **a logical unit of DI configuration** that groups related services together.
In practice, modules often correspond to:
- bounded contexts;
- application features (Auth, Users, Payments);
- infrastructure layers (API, persistence, messaging).

Many teams use **Feature-Sliced Design**, and the module concept fits naturally into that approach.


## Static modules overview
The core package `@spirex/di` provides **static modules**.

Static modules are:
- fully defined at build time;
- intended for services that are part of the main application bundle;
- not loaded dynamically at runtime.

Think of a static module as: _“A reusable piece of DI configuration that can be plugged into a container.”_

## Step 1: Creating a module shell
A static module is created using the `staticModule(...)` function.
This function requires **a module name**.

```ts
// FILE: src/modules/auth/auth.module.ts
import { staticModule } from "@spirex/di";

export const AuthModule = staticModule("auth");
```

At this stage, the module exists, but it does not yet define:
- which services it provides;
- how those services are created.


### Why the module name is required?
The module name serves several important purposes:

1. **Debugging and analysis.** 
    Every binding created inside the module is associated with this name.
    This makes it easier to inspect and understand container configuration.

2. **Unique module identity.** 
    The name is used as a unique identifier.
    If the same module is included multiple times, SpireX/DI will detect this and ignore duplicates.

3. **Error reporting.**
    When configuration errors occur,
    the module name helps identify where the problem originated.


## Step 2: Defining what the module provides (TypeMap)
Next, the module must declare **which types it provides**.
This is done by defining the module’s **TypeMap**.

You do this using the `create<TypeMap>(...)` operation.

```ts
// FILE: src/modules/auth/auth.module.ts
import { staticModule } from "@spirex/di";

import { AuthService, IAuthRepository, IAuthGateway } from "./domain";

export const AuthModule = staticModule("auth").create<{
    auth: AuthService;
    authRepo: IAuthRepository;
    authGateway: IAuthGateway;
}>();
```
This step is purely declarative:
- no instances are created;
- no bindings are configured yet.

At this point, the module knows what it is responsible for, but not how to create those services.

### What is a module TypeMap?
A module **TypeMap** is a TypeScript mapping between:
- string keys (used to request services from the container);
- actual service types.

It answers the question: _“Which services does this module provide, and under which keys?”_

It allows TypeScript to:
- validate bindings inside the module;
- infer types when services are requested later.

Defining **a module TypeMap** is identical to defining a **TypeMap** on `diBuilder<TypeMap>()`.


## Step 3: Configuring module bindings
Now we define **how the services are provided**.

The `create<TypeMap>(...)` operation accept a function.
This function receives a special **binder object** as its first argument.

```ts
// FILE: src/modules/auth/auth.module.ts
import { staticModule, factoryOf } from "@spirex/di";

import { AuthService, IAuthRepository, IAuthGateway } from "./domain";
import { AuthRepository, AuthGateway } from "./infra";

export const AuthModule = staticModule("auth").create<{
    auth: AuthService;
    authRepo: IAuthRepository;
    authGateway: IAuthGateway;
}>(binder => {
    // Bind AuthService under the "auth" key
    binder.bindFactory(
        "auth",
        factoryOf(AuthService),
    );

    // Bind repository implementation
    binder.bindFactory(
        "authRepo",
        factoryOf(AuthRepository),
    );

    // Bind gateway implementation
    binder.bindFactory(
        "authGateway",
        factoryOf(AuthGateway),
    );
});
```

Configuring a module feels the same as configuring via container builder — just scoped to that module.


## Step 4: Including a module in the container
Once the module is fully defined, it can be included in the container builder.

```ts
// FILE: src/di.ts
import { diBuilder } from "@spirex/di";
import { AuthModule } from "./modules/auth/auth.module";

const container = diBuilder()
    .include(AuthModule)
    .build();
```

When you call `.include(AuthModule)`:
- The module’s TypeMap is merged into the builder’s TypeMap;
- The module’s bindings are merged into the container configuration.

Duplicate inclusion of the same module is **ignored**.

Because of this, it is common (and recommended) to:
- keep the root DI file minimal;
- define most bindings inside modules.

In many projects, the root builder **has no own TypeMap at all** and only aggregates modules.


## Type visibility: No namespaces by design
Modules in SpireX/DI **do not create namespaces** for types.

That means:
- a type key defined in a module becomes available directly on the container;
- you do not need to reference the module when requesting a service.

```ts
// ❌ BAD: module-based access is not needed
// container.get(AuthModule, "repo");

// ✅ GOOD: simple and direct
const authRepo = container.get("authRepo");
```

This design has several advantages:
- no ambiguity between “module types” and “container types”;
- each key is globally unique in the final TypeMap;
- TypeScript can infer types instantly from the key;
- no casts, no generic noise.

Potential key conflicts are treated as a configuration concern, not a runtime one.


## Extending module bindings from outside
One of the most powerful aspects of this design is that **module bindings can be extended externally**.

A module may intentionally expose an extensible binding, such as a list of handlers.

```ts
// FILE: src/modules/mediator.module.ts
import { staticModule } from "@spirex/di";
import { 
    mediatorBuilder,
    IMediator,
    TMediatorRequestHandler,
} from "@spirex/mediator";

export const MediatorModule = staticModule("mediator").create<{
    mediator: IMediator;
    handler: TMediatorRequestHandler<unknown>;
}>(binder => {
    binder.bindFactory(
        "mediator",
        r =>
            mediatorBuilder()
                // Collect all handlers bound under "handler"
                .registerHandler(r.getAll("handler"))
                .build(),
    );
});
```

Now we can extend this module bindings without modifying its source.

```ts
// FILE: src/di.ts
import { diBuilder } from "@spirex/di";
import { MediatorModule } from "./modules/mediator.module";
import { makeGetCurrentUserHandler } from "./modules/users/handlers";

const container = diBuilder()
    .include(MediatorModule)

    // Append a new handler to the module-defined list
    .bindFactory(
        "handler",
        () => makeGetCurrentUserHandler(),
        { ifConflict: "append" },
    )
    .build();
```

Why this is important? 
- modules remain closed for modification but open for extension;
- cross-feature integrations become trivial;
- no tight coupling between modules is required.


------------
## Summary
Modules in SpireX/DI are designed to:
- reduce configuration complexity;
- improve readability and structure;
- enable reuse parts of DI configuration;
- support feature-oriented architecture;
- provide strong type safety without namespaces;
- allow safe and flexible extension of bindings.

They are a **core architectural tool** for building scalable applications with **SpireX/DI**.
