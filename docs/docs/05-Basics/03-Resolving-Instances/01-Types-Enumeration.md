# Type Enumeration

In many DI frameworks and projects, you can often find a pattern called type enumeration (or token enumeration).

The idea is simple:
developers define a centralized **map of keys** that are later used to resolve services from the container.

```ts
export const TYPES = {
  Logger: Symbol("Logger"),
  UserRepository: Symbol("UserRepository"),
  AuthService: Symbol("AuthService"),
  ConfigService: Symbol("ConfigService"),
} as const;
```
These keys are then used everywhere instead of raw strings.

Type enumerations appeared as a workaround for weak typing or runtime-based DI containers. In systems where the container cannot validate keys at compile time, developers are forced to centralize tokens manually.

## Why this pattern is problematic?
If SpireX/DI required such enumerations, container configuration would quickly become **painful and verbose**.

You would need to:
- maintain a separate list of keys;
- reference those keys in the **TypeMap**;
- use them again in every binding.

```ts
export const TYPES = {
    logger: "logger",
    userRepo: "userRepo",
    auth: "auth",
} as const;

export const container = diBuilder<{
    [TYPES.logger]: ILogger;
    [TYPES.userRepo]: IUserRepository;
    [TYPES.auth]: AuthService;
}>()
    .bindFactory(TYPES.logger, factoryOf(AppLogger))
    .bindFactory(TYPES.userRepo, factoryOf(UserRepository))
    .bindFactory(TYPES.auth, factoryOf(AuthService))
    .build();
```

This approach introduces several issues:
- **Duplication.**
    Every type must be declared twice (key + binding);
- **Maintenance overhead.**
    Adding a new service requires editing multiple places;
- **Poor scalability.**
    Each module would need its own enumeration;
- **Navigation complexity.**
    Developers must remember which enum contains which key.

What initially looks like a clean abstraction quickly turns into friction.


## The SpireX/DI approach
SpireX/DI intentionally **does not require type enumerations**.

Instead, it relies on two TypeScript features:
- string literal types;
- generic inference from TypeMap.

Because TypeScript treats string literals as unique types,
the container can:
- validate keys at compile time;
- provide full autocomplete;
- prevent invalid key usage.

```ts
container.get("auth");     // valid
container.get("authServ"); // compile-time error
```

This makes string keys **safe, explicit, and ergonomic**, without additional boilerplate.


## For developers who prefer dot-notation
Some developers strongly prefer dot-notation (`TYPES.auth`) over raw strings.

SpireX/DI supports this preference **without sacrificing simplicity**.
After the container is built, it exposes a special property: `container.types`

This property is **a fully typed enumeration of all keys that have bindings in the container**.


### Accessing the generated type enumeration
```ts
const container = diBuilder<{
    logger: ILogger;
    userRepo: IUserRepository;
    auth: AuthService;
}>()
    .bindFactory("logger", factoryOf(AppLogger))
    .bindFactory("userRepo", factoryOf(UserRepository))
    .bindFactory("auth", factoryOf(AuthService))
    .build();

const TYPES = container.types;
// {
//   logger: "logger",
//   userRepo: "userRepo",
//   auth: "auth"
// }
```

This object is: auto-generated, fully typed and always in sync with the container configuration.


### Using the enumeration
You can now use the generated enumeration instead of raw strings:

```ts
const TYPES = container.types;

container.get(TYPES.logger);   // ILogger
container.get(TYPES.userRepo); // IUserRepository
container.get(TYPES.auth);     // AuthService
```

This provides:
- dot-notation ergonomics;
- zero manual maintenance;
- full type safety.


### Why enumeration is not available during configuration?
During container configuration, the full list of types is not yet known.

Bindings may be added:
- conditionally;
- via modules;
- via middleware;
- based on environment.

Because of this, configuration APIs intentionally use string literals.

Only after `build()` does the container know: which bindings exist and which types are actually available. At that point, `container.types` becomes reliable.

## Types enumeration is more than just an enum
This is an important distinction.

`container.types` does **not** simply mirror the TypeMap.
Instead, it represents **only those types that actually have bindings**.

That makes it useful as a runtime availability check.

```ts
if (TYPES.auth) {
    container.get(TYPES.auth);
}
```

If a binding does not exist, the property will be missing, accessing it returns `undefined` which is a **falsy** value.

This allows `container.types` enumeration to act as **a feature flag** for optional services.

--------------
## Summary
You don’t maintain a type enumeration —
the container builds it for you.

- SpireX/DI does not require manual type enumerations;
- String keys are:
    type-safe, autocomplete-friendly and validated by TypeScript;
- After building the container, you can access:
    `container.types` — an auto-generated, typed enumeration;
- Types enumeration:
  - stays in sync automatically;
  - supports dot-notation;
  - allows runtime availability checks.
