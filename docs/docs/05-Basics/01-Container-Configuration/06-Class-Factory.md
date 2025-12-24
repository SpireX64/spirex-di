# Class Factory

When working with classes, factory bindings often become repetitive.
In most cases, the factory does the same thing: it requests dependencies from the resolver using `get` operation and then passes them into the class constructor.

```ts
import { diBuilder } from "@spirex/di";

const container = diBuilder<{
  blogService: BlogService;
  // postsRepo, usersRepo, authRepo, notifier...
}>()
  .bindFactory("blogService", r => new BlogService(
    r.get("postsRepo"),
    r.get("usersRepo"),
    r.get("authRepo"),
    r.get("notifier"),
  ))
  .build();
```

This approach works, but it quickly becomes verbose and repetitive, especially when services have many dependencies.

Other DI libraries often solve this problem using decorators and reflection.

```ts
import "reflect-metadata";
import { Injectable, Inject } from "di-library";

@Injectable()
export class MyService {
  public constructor(
    @Inject("postsRepo") private readonly _posts: IPostsRepository,
    @Inject("usersRepo") private readonly _users: IUsersRepository,
    @Inject("authRepo") private readonly _auth: IAuthRepository,
    @Inject("notifier") private readonly _notifier: INotifier,
  )
}
```

However, that approach has serious drawbacks:
- it weakens type inference
- it hides dependencies from the type system
- the compiler can no longer warn about incorrect injections

SpireX/DI deliberately avoids decorators and runtime reflection.
Instead, it introduces a different solution: **Class Factory**.


## Goals of the Class Factory Design
The class factory feature was designed with the following goals in mind:
1. No decorators or reflection for class injection;
2. No new binding concepts — reuse `bindFactory` and `bindSafeFactory`;
3. Classes must remain portable and framework-agnostic;
4. Strict type safety must be preserved;
5. Usage should be simple and explicit.


## Declaring Dependencies Inside the Class
With a class factory, dependency keys are declared **directly** on the class using a static field called `inject`.

**To ensure correct type inference, the list must be marked with `as const`.**
This tells TypeScript to treat it as a tuple of specific keys instead of a generic string array.

The constructor must then accept the dependencies **in the same order**.

```ts
class BlogService {
  // Dependency keys
  public static inject = [
    "postsRepo",
    "usersRepo",
    "authRepo",
    "notifier",
  ] as const;

  public constructor(
    private readonly _posts: IPostsRepository,
    private readonly _users: IUsersRepository,
    private readonly _auth: IAuthRepository,
    private readonly _notifier: INotifier,
  ) {}
}
```

At this point:
- The dependencies are explicitly declared;
- The constructor remains a normal constructor;
- The class has no imports from `@spirex/di`;
- The class can be reused in other projects without modification

The static `inject` field does not affect the runtime behavior of the class itself. It only provides metadata for the container.


## Binding a Class Using a Class Factory
Once the class is prepared, it can be bound using a class factory.

```ts
import { diBuilder, factoryOf } from "@spirex/di";

const container = diBuilder<{
  blogService: BlogService;
  // postsRepo, usersRepo, authRepo, notifier...
}>()
  .bindFactory("blogService", factoryOf(BlogService))
  .build();

```
The `factoryOf` helper is provided by SpireX/DI. It creates a factory function compatible with `bindFactory`. From the container’s point of view, this is no different from a manually written factory.

Performance-wise, there is virtually no difference either. Creating an instance through a generated factory is almost identical to calling new directly. _(Thanks to JS runtime)_

This significantly reduces boilerplate while keeping everything explicit and type-safe.

## What Class Factory Validates?
The class factory does more than just generate a factory function.

It performs several important validations:

First, it verifies that the provided value **is actually a class** that can be instantiated using `new`.

Second, it checks that the class has a static `inject` field and that all listed **type keys are available** in the container configuration.

Third, it ensures that:
- the constructor parameter order matches the order of keys in `inject`;
- the constructor parameter types are compatible with the injected types.

All of these checks are performed by TypeScript during compilation or static analysis, not at runtime.
This provides strong guarantees without introducing runtime overhead or side effects.


## Classes Without Dependencies
If a class has **no dependencies**, it can still be used with `factoryOf`.
```ts
import { diBuilder, factoryOf } from "@spirex/di";

class MyService {}

diBuilder<{ service: MyService }>()
  // .bindFactory("service", () => new MyService())
  .bindFactory("service", factoryOf(MyService));
```
This allows you to keep a consistent binding style even for simple services.


## Trade-offs and Limitations
Class factories are not free of drawbacks:
- Container type keys leak into the class via the `inject` field;
- Dependencies must be listed twice: in `inject` and in the constructor;
- Dependencies are resolved only via `get` operation;
- You cannot see a class’s dependencies from the container configuration.

These are conscious trade-offs made to preserve type safety and portability.


## Unexpected Advantages
Despite the limitations, class factories offer some notable benefits:
- Changing the implementation does not require rewriting the factory;
- Container configuration becomes cleaner and shorter;
- During prototyping, dependencies can be added or reordered without constantly switching to container configuration files.

In practice, this often leads to faster iteration and clearer service definitions.

-----------
## Summary
The class factory feature provides a structured way to bind classes without decorators or reflection.

- Dependencies are declared explicitly on the class;
- Classes remain portable and framework-agnostic;
- Strict type safety is preserved;
- Factories are generated automatically via `factoryOf`;
- Boilerplate in container configuration is significantly reduced;

This approach strikes a balance between convenience, safety, and explicitness, making it well suited for large and evolving codebases.


## Related Topics
> - Philosophy of SpireX/DI
> - Type Map
> - Factory Binding
