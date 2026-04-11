# @spirex/di-shared

> ⚠️ Transitional tool for adopting @spirex/di in large codebases
> Make global access visible, controlled, and temporary

`@spirex/di-shared` is a migration tool, not a final architecture. It exists to:
- help adopt DI incrementally
- reduce refactoring conflicts
- make global usage visible


## 🧠 When to use?
- you are migrating an existing app
- you cannot refactor everything at once
- you need a temporary global access layer

**Do NOT use it in new projects!**

## 🚀 Quick Start
```ts
import { diBuilder, factoryOf, TypeMapOf } from '@spirex/di';

export function buildContainer() {
  return diBuilder<{
    myServiceA: IServiceA;
    myServiceB: IServiceB;
  }>()
    .bindFactory('myServiceA', factoryOf(ServiceA))
    .bindFactory('myServiceB', factoryOf(ServiceB))
    .build();
}

export type TypeMap = TypeMapOf<ReturnType<typeof buildContainer>>;

// Later in app bootstrap
import { diShared } from '@spirex/di-shared';

export const Shared = diShared<TypeMap>();
const container = buildContainer()

Shared.attach(container);

// Use it anywhere
const svcA = Shared.get('myServiceA');
```

## 🚨 The Problem
In a perfect world, all dependencies live inside a DI container.

But in reality:
- your app is already large
- services are created during import
- dependencies are accessed globally
- refactoring everything at once is too risky

So teams fall back to this:
```ts
export const container = buildContainer();
```

It works… but creates a hidden problem:
- no visibility of global usage
- breaks scoped architecture
- encourages anti-patterns
- makes migration harder over time

## 💡 The Idea
`@spirex/di-shared` provides a **controlled global access point**:
```ts
const Shared = diShared();
```
It acts as a **Proxy facade** over your container:
- exists before container is created
- attaches later
- forwards all DI calls
- optionally warns about global usage

### Why it's better than global export:
| Raw container export        |	With `@spirex/di-shared`           |
| --------------------------- | ---------------------------------- |
| ❌ Invisible global usage   |	✅ Can log every access           |
| ❌ Tight coupling           |	✅ Decoupled proxy                |
| ❌ Hard to migrate away     |	✅ Designed for gradual migration |
| ❌ No safety before init    |	✅ Controlled attach lifecycle    |
| ❌ Encourages anti-patterns |	⚠️ Explicitly warns about them    |


### How it works
- `Shared` instance is exists **before** the container
- once ready → `attach(container)`
- all calls are forwarded to the container
- optional warnings highlight global usage


## Migration Mode (recommended)
Enable warnings to track global DI usage:
```ts
const Shared = diShared({
  warn: true,
});
```

Now every call like `Shared.get('api');` will log a warning.

This helps you:
- understand how much code bypasses DI scopes
- identify services that should move into proper modules
- gradually eliminate global access

Before `Shared.attach(container)`, calling `get`, `maybe`, `getAll`, `phantomOf` will throw error.
Use `Shared.providerOf` to resolve a provider function of the required dependency, before container attach.

To check is container attached to the Shared instance, use: `Shared.isAttached`

## Configuration
```ts
const Shared = diShared({
  warn: true,
  warnIgnore: ['logger'],
  warnLog(context) {
    console.warn(context.message);
  },
});
```
Options:
- `warn` — enable warnings when resolving via Shared
- `warnIgnore` — ignore specific type keys
- `warnLog` — custom logger

## 🧩 Cross-package usage
Create a shared instance:
```ts
export const Shared = diShared();
```
Then narrow types locally:
```ts
import type { DIShared } from '@spirex/di-shared';

const TypedShared = Shared as DIShared<LocalTypeMap>;
```

## License
`@spirex/di-shared` is released under the MIT License.

You are free to use, modify, and distribute the library in both personal and commercial projects.
