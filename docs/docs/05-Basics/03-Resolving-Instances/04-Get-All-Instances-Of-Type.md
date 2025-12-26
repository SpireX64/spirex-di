# Getting all instances of a type
When using **multiple bindings** for the same type, you may need to retrieve **all instances** bound to that type.

For example, suppose we have multiple handlers bound to a "handler" type:

```ts
builder
  .bindFactory(
    "handler", factoryOf(CreateUserHandler),
    { ifConflict: "append" },
  )
  .bindFactory(
    "handler", factoryOf(GetUserHandler),
    { ifConflict: "append" },
  );
```

## The problem with `get` and `maybe`
The `get` and `maybe` methods always return only **the first bound** instance:

```ts
container.get("handler");   // CreateUserHandler
container.maybe("handler"); // CreateUserHandler
```

If you want to work with **all handlers**, these methods are not sufficient.


## The solution: `getAll`
SpireX/DI provides the `getAll` method specifically for multiple bindings.
It returns **an array of all instances** bound to the requested type:

```ts
container.getAll("handler");
// [ CreateUserHandler, GetUserHandler ]
```

Works great only with multiple bindings, but can also be used with single bindings.
For single bindings, it returns a list containing just the single instance:

```ts
container.getAll("auth"); // [ IAuthService ]
```

If no bindings exist for the requested type, `getAll` returns an empty array instead of throwing an error:

```ts
container.getAll("unknown"); // []
```

## Post-processing the results
Because `getAll` returns a standard JavaScript array, you can use array methods like `map`, `filter`, `reduce` to process the instances:

```ts
const userHandlers = container
    .getAll("handlers")
    .filter(handler => handler.name.includes("User"))
    .sort(byPriority);
```

This allows you to dynamically work with multiple implementations, for example:
- applying middleware;
- registering plugins;
- executing all handlers of a specific category.

-------------------
## Summary
- `getAll` retrieves all instances bound to a type.
- Works with **multiple bindings** and **single bindings**.
- It safe to use. Returns an empty array if the type has no bindings.
- Fully compatible with JavaScript array operations for post-processing.

This method is essential when working with plugins, handlers, strategies, or any scenario where multiple implementations exist for the same type.
