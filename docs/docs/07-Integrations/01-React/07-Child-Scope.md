# Child DI Scopes
SpireX/DI supports **child container scopes**, which allow you to split an application into logical parts and tightly control the lifecycle of services. Scopes are especially useful for isolating feature-level dependencies and ensuring that resources are released when a part of the application is no longer in use.

## Creating a Child Scope with the Container
A child scope is created from an existing container using the `scope` method.
Each scope is identified by a string identifier.

```ts
const profileScope = container.scope('profile');
```

By default, a child scope can access services from its parent and can itself create further child scopes.


## Isolated and Sealed Scopes
SpireX/DI allows you to fine-tune scope behavior using options:
- `isolated`: prevents the scope from accessing services registered in the parent container.
- `sealed`: prevents the creation of further child scopes from this scope.

```ts
const profileScope = container.scope('profile', {
    isolated: true,
    sealed: true,
});
```

An isolated scope is useful when a feature must be fully self-contained,
while a sealed scope is helpful when the scope represents a final boundary in the dependency hierarchy.

## React Integration with DI scopes
When using **SpireX/DI with React**, child scopes can be created declaratively using the `DIScope` component. This component is provided by the **DI React context** factory and mirrors the behavior of creating a scope directly on the container.

```tsx
import { DIScope } from '../di/react';

const MyComponent: React.VFC = () => {
    return (
        <DIScope id="profile">
            <ProfileScreen />
        </DIScope>
    );
};
```

The `id` prop defines the string identifier of the new scope.
All components rendered inside `DIScope` will resolve their dependencies from this scope.

When the `DIScope` component is unmounted, the scope it defines is **automatically disposed**.
As a result, all services instantiated within that scope are cleaned up,
ensuring they do not continue to occupy memory.


### Scope Options
The `DIScope` component also supports the `isolated` and `sealed` options as props.

```tsx
import { DIScope } from '../di/react';

const MyComponent: React.VFC = () => {
    return (
        <DIScope id="profile" isolated sealed>
            <ProfileScreen />
        </DIScope>
    );
};
```

This creates an isolated and sealed scope for the component subtree.

## Making the Component Itself a Scope
In some cases, the current component should already belong to a new scope. This is common for feature root components or screens. Wrapping such components in an additional `DIScope` solely for scoping purposes can be inconvenient.

To address this, `@spirex/di-react` allows you to define a scope directly on a component using the `withInject` higher-order component.

```ts
import { withInject } from "../di/react";

const withProfileScope = withInject(
    r => ({
        viewModel: r.get('ProfileViewModel'),
    }),
    {
        scope: 'profile',
        isolated: true,
        sealed: true,
    }
);

const ProfileScreen = withProfileScope(({ viewModel }) => {
    // component logic
});
```

In this setup, the dependency injection for `ProfileScreen` is performed **inside the newly created profile scope**. The scope lifecycle is bound to the component: once `ProfileScreen` is unmounted, the scope is automatically disposed along with all services created within it.


------------
## Summary
**Child DI scopes** in SpireX/DI provide a powerful mechanism for structuring applications and managing service lifecycles.

Scopes can be **isolated** or **sealed** to enforce strict dependency boundaries. 

In React, scopes can be defined declaratively using `DIScope` or directly on components via `withInject`. Automatic disposal of scopes ensures efficient memory management and clean teardown of feature-level services.
