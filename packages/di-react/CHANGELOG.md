# Changelog — SpireX/DI for React integration

## 1.2.0
- **Shared context architecture:** All exports now share a single module-level React context. Packages no longer create isolated contexts — `DIRootScope` provided at the application root is accessible from any package.
- **Static typed API:** Added `getDIReact<TypeMap>()` — returns strictly typed `DIRootScope`, `DIScope`, `useInject`, and `withInject` when the full TypeMap is available.
- **Dynamic typed API:** `DIRootScope`, `DIScope`, `useInject`, and `withInject` are now exported directly at the module level with `AnyTypeMap` typing. Can be narrowed via type casts using new `TUseInject<T>` and `TWithInject<T>` utility types.
- **StrictMode support:** Nested scope management (`DIScope`, `withInject` with scope) now uses `useRef` with `isDisposed` guard instead of `useMemo`, preventing stale references to disposed scopes after StrictMode's unmount/remount cycle.
- `useInject` and `withInject` now throw a descriptive error when used outside `DIRootScope`.
- `withInject` now forwards `ref` to the wrapped component via `React.forwardRef`.
- (DEPRECATED) `createDIContext()` — use `getDIReact()` instead. Still works as an alias but no longer creates isolated contexts.

## 1.1.0
- Added the current scope context (`IScopeContext`) to the `TInjectSelector` injection function.
- Added support for opening scopes using the `withInject` HoC.
- (FIX) Fixed the props typing for `DIScope`, which previously caused TypeScript errors when using a string-based scope identifier.
- (FIX) Fixed memoization of nested scopes.
