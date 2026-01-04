# Dependency Injection via React Hook

The `@spirex/di-react` package provides the `useInject` hook, 
which enables dependency injection directly inside a React component body. 

This hook is conceptually similar to `withInject` HoC,
but it is built on the **React Hook API**
and therefore can only be used in **functional components**.

`useInject` allows a component to resolve its dependencies at first render time
without altering the component’s public interface or wrapping it in a higher-order component.

## Basic Usage
The hook accepts a **delegate function**. This delegate receives a **resolver** reference, which can be used to retrieve instances from the dependency container. The delegate must return either a **single** dependency or an object containing **multiple** dependencies.

```ts
import { useInject } from '../di/context';

const MyComponent: React.VFC = () => {
    const { vm, auth } = useInject(r => ({
        vm: r.get('MyComponentViewModel'),
        auth: r.get('AuthService'),
    }));

    // Component logic
};
```

The value returned by the delegate is what `useInject` returns to the component.
The hook executes only once, when the component is rendered,
and memoizes the result for the entire lifetime of the component instance.


## Lifecycle and Memoization Behavior
`useInject` performs dependency resolution only during the initial render.
Even if parameters passed to the hook change dynamically,
the **injection will not be re-executed**.
This behavior is intentional and ensures stable references to injected services.

Because of this memoization, `useInject` should not be treated as a reactive hook.
It is designed for **resolving dependencies**, not for responding to changing runtime state.


## Impact on Testing and Component Design
Using `useInject` slightly complicates testing compared to explicit dependency passing via props.

However, it has two important architectural advantages:
- The component’s public interface remains clean and free of infrastructure concerns.
- There is no need to wrap the component in a higher-order component to inject dependencies.

To further improve testability and separation of concerns,
it is recommended to move dependency resolution into a dedicated hook.


## Extracting Injection Logic into a Custom Hook
A common best practice is to extract `useInject` usage into a domain-specific hook.
This removes responsibility for dependency resolution from the component itself.

```ts
const useMyComponentInject = () =>
    useInject(r => ({
        vm: r.get('MyComponentViewModel'),
        auth: r.get('AuthService'),
    }));

const MyComponent: React.VFC = () => {
    const { vm, auth } = useMyComponentInject();

    // Component logic
};
```
This approach keeps components focused on rendering and behavior
while encapsulating dependency wiring in reusable hooks.


## Using `useInject` as a Selector
Since `useInject` returns the delegate’s result,
it can also be used as a **selector** that extracts a value from a service.

Keep in mind that the injection still occurs only once, during the first render.

```ts
const useIsAuthenticated = () =>
    useInject(r => r.get('auth').isAuthenticated);

const MyComponent: React.VFC = () => {
    const isAuthenticated = useIsAuthenticated();

    // ...
};
```

This pattern is suitable for reading static or stable values from services,
but not for reactive state that must update over time.


## Injecting a Single Dependency
If you only need a single service instance, `useInject` can be used as a simple dependency hook.

```ts
const useAuthProvider = () =>
    useInject(r => r.get('authProvider', 'email'));
```

When the delegate performs only a single `get` operation, it can be omitted entirely.
In this case, the parameters of `get` are passed directly to the hook.

```ts
const useAuthProvider = () =>
    useInject('authProvider', 'email');
```

## Type Safety
`useInject` is typed using a **TypeMap**,
which enables compile-time validation of dependency keys in TypeScript.
This helps prevent invalid or misspelled dependency identifiers
and improves overall reliability of dependency resolution.


--------------
## Summary
`useInject` provides a flexible and concise way to inject dependencies into functional React components.

It resolves dependencies once at mount time, memoizes the result, and keeps component interfaces clean. While it introduces some testing considerations, extracting injection logic into dedicated hooks mitigates this issue effectively.

Overall, `useInject` offers a powerful and ergonomic approach to dependency injection in React applications using `@spirex/di-react`.
