# Internal Module Types

Static modules support defining a dedicated TypeMap for internal types.
These types are visible only within the module itself and are not accessible from the container or from other modules that depend on it. However, the module’s binder interface is aware of both public and internal types, allowing them to be used safely inside the module implementation.

## Declaring an Internal TypeMap

An internal TypeMap is defined as the **second generic parameter** of the `create` factory method:

```ts
const MyModule = staticModule("MyModule").create<{
  // PUBLIC
  myService: MyService
}, {
  // INTERNAL
  myServiceGateway: IMyServiceGateway
  myServiceRepo: IMyServiceRepository
}>((binder) => {
  // TypeMap: { myService, myServiceGateway, myServiceRepo }

  binder
    .bindInstance("value", 123);
});

// Not accessible from the container
container.get("value"); // TS Error
```

In this setup:
- `myService` is part of the public types.
- `myServiceGateway` and `myServiceRepo` are internal.
- All three are available inside the module binder.
- Only public types are exposed to the container type system.

This mechanism is primarily **TypeScript-level encapsulation**. It prevents external access at compile time but does not enforce restrictions at runtime.


## Runtime Enforcement with Internal Bindings

If stricter encapsulation is required—ensuring that internal services cannot be resolved at runtime—you can use the `internal` binding option.

```ts
const MyModule = staticModule("UserModule").create((binder) => {
  binder
    .bindFactory(
      "UsersRepo",
      factoryOf(UsersRepository),
      { internal: true } // Accessible only inside this module
    )

    .bindFactory(
      "UsersService",
      (r) => new UsersService(r.get("UsersRepo"))
      // OK: both bindings belong to the same module
    );
});
```

Attempting to resolve an internal binding outside the module will throw an access error:

```ts
container.get("UsersRepo");     // Access error
container.get("UsersService");  // OK
```

This provides runtime isolation in addition to TypeScript encapsulation.


## Safe Access with `maybe`
To safely attempt resolution without throwing, use the `maybe` operation.
If the binding is unavailable or inaccessible, it returns `undefined` instead of raising an error.

```ts
container.maybe("UsersRepo"); // Returns undefined
```

Despite this safety mechanism, internal services should still be hidden via the internal TypeMap whenever possible to prevent accidental usage at the type level.


## Behavior in Container Builder
The `internal` option is ignored for bindings registered directly in the container builder. Such bindings are always considered public and cannot be hidden.

```ts
const builder = diBuilder()
  // The "internal" option works only inside modules
  .bindInstance("apiKey", "AAAAA-BBBB-CCCC", { internal: true });
```

Even though `internal: true` is specified, the binding remains publicly accessible because it is defined at the container level rather than within a module.


## Architectural Implications
Using internal TypeMaps together with runtime-level `internal` bindings enables stricter architectural boundaries. Internal repositories, gateways, or infrastructure services can remain fully encapsulated, exposing only the intended public surface of the module. This reduces coupling, prevents accidental misuse, and keeps module contracts explicit and maintainable.


------------------
## Summary

Static modules allow you to define internal TypeMaps that hide implementation types from the container and dependent modules at the TypeScript level. For stronger guarantees, the `internal` binding option enforces runtime access restrictions, throwing errors when external resolution is attempted. The `maybe` operation provides a safe way to probe availability without exceptions. Note that `internal` is effective only within modules and is ignored in container-level bindings. Together, these mechanisms enable clear module boundaries and more robust architectural encapsulation.
