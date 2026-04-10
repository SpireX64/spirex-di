# @spirex/di-dynamic — Change Log

## v1.0.1

- **Internal module types (TypeScript):** `dynamicModule(...).create` now accepts an optional second type parameter, `InternalTypeMap`, matching `staticModule().create<TypeMap, InternalTypeMap>` from `@spirex/di@1.2.x`. The delegate’s binder is typed with the merged public + internal map so you can register `{ internal: true }` bindings and keep internal keys off the container’s exported `TypeMap`.

Runtime behavior for `internal` was already consistent with `@spirex/di`; this release makes the typing explicit and locks in behavior with tests.
