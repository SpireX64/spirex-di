# Root DI Scope for React

To enable dependency injection inside React components, a DI container must be attached to a root dependency injection scope within the React component tree. All components rendered under this scope gain access to injected services.

This integration is achieved using a special provider component, `DIRootScope`, which bridges the DI container (or a derived scope) with React’s rendering lifecycle.

## Defining the Root DI Scope
The `DIRootScope` component defines the root area in which dependency injection is available. It accepts a single required prop, `root`, which represents the DI scope used to resolve dependencies for all descendant React components.

The simplest approach is to pass the container itself as the root scope:

```tsx
import React from "react";
import { buildContainer } from "./di/container";
import { DIRootScope } from "./di/react";

export const AppComponent: React.VFC = () => {
    const container = React.useState(buildContainer)[0];

    return (
        <DIRootScope root={container}>
            <AppRouter />
        </DIRootScope>
    );
};
```

In this setup, the entire React application shares the container as its root DI scope, allowing any child component to request injected services.

## Using a Dedicated React Scope
Although using the container directly works, it is generally recommended to create a **dedicated DI scope for React**. This provides finer control over service lifetimes and visibility, and helps isolate React-specific dependencies from the rest of the application.

A dedicated scope can be derived from the container and memoized to ensure stability across renders:

```tsx
import React from "react";
import { buildContainer } from "./di/container";
import { DIRootScope } from "./di/react";

export const AppComponent: React.VFC = () => {
    const container = React.useState(buildContainer)[0];

    // Dedicated DI scope for React components
    const reactScope = React.useMemo(
        () => container.scope("react"),
        [container],
    );

    return (
        <DIRootScope root={reactScope}>
            <AppRouter />
        </DIRootScope>
    );
};
```

This approach makes it explicit that the scope is intended for React components and allows you to manage services specifically within the React subtree without affecting other application layers.


## Container Lifetime and Encapsulation
Creating the DI container inside the root application component intentionally limits its visibility. This design prevents direct imports of the container or ad-hoc service resolution from arbitrary modules, encouraging proper dependency injection patterns instead of global access.

As a result, services are accessed only through React-aware mechanisms rather than by pulling instances directly from the container.


## Using Dependency Injection in Components
Once DIRootScope is placed in the component tree, the React integration is considered complete. Any descendant component can now safely use React-specific injection helpers such as `useInject` or `withInject` to resolve dependencies.

------------------
## Summary

`DIRootScope` defines the root dependency injection boundary for React components. By attaching a **container** or a **derived scope** to the React tree, all child components gain access to dependency injection.

Creating a **dedicated React scope** is recommended for better control and isolation of services. After the root scope is set up, injection utilities like `useInject` and `withInject` can be used seamlessly throughout the component hierarchy.
