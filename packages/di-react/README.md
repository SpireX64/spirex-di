![NPM Type Definitions](https://img.shields.io/npm/types/%40spirex%2Fdi-react?style=for-the-badge)
[![NPM Version](https://img.shields.io/npm/v/%40spirex%2Fdi-react?style=for-the-badge)](https://www.npmjs.com/package/@spirex/di-react)
[![Codecov](https://img.shields.io/codecov/c/github/spirex64/spirex-di?token=VXQZK5WDSY&flag=di-react&style=for-the-badge)](https://codecov.io/github/SpireX64/spirex-di)
![GitHub License](https://img.shields.io/github/license/spirex64/spirex-di?style=for-the-badge)

# SpireX/DI integration for React
`@spirex/di-react`

**Type-safe React integration for SpireX/DI** — a lightweight dependency injection library for JavaScript and TypeScript applications.

`@spirex/di-react` provides React developers with a **fully typed, declarative, and scoped DI system** built on top of the **React Context API** and hooks. It brings the full power of **SpireX/DI** to React applications while keeping components decoupled, testable, and maintainable.

With a **tiny footprint** and support for modern React, this package ensures predictable dependency injection, strong TypeScript guarantees, and clean component architecture.

## Features
- **Type-safe DI:** Full TypeScript support, with IDE autocompletion
- **Root & child DI scopes:** Control lifetime and visibility of dependencies
- **Declarative injection:** `useInject` hook for functional components, `withInject` HOC for props-based injection  
- **Automatic scope disposal:** Child scopes unmount cleanly with React components
- **Lightweight:** Only 0.9kb (0.4kb gzipped)


## Installation
Install both the core DI container and React integration:

```shell
# NPM
npm install @spirex/di @spirex/di-react

# Yarn
yarn add @spirex/di @spirex/di-react

# PNPM
pnpm add @spirex/di @spirex/di-react
```


## Quickstart

```tsx
import React from "react";
import { diBuilder, factoryOf, TypeMapOf } from "@spirex/di";
import { createDIContext } from "@spirex/di-react";


// Build the core container
const buildContainer = () => diBuilder<{
    auth: AuthService;
    viewModel: SampleViewModel;
}>()
    .bindFactory('authService', factoryOf(AuthService)
    .bindFactory('viewModel', factoryOf(SampleViewModel))
    .build();

// Extract TypeMap
export type TypeMap = TypeMapOf<ReturnType<typeof buildContainer>>;

// Create typed React DI context
export const { DIRootScope, useInject } = createDIContext<TypeMap>();

// Component using hook-based injection
const MyComponent: React.VFC = () => {
    const authService = useInject('authService')
    const viewModel = useInject('viewModel')

    return (
        <div>
            <h1>{viewModel.title}</h1>
            <button onClick={() => authService.login()}>
                {authService.isAuthorized ? 'Logout' : 'Login'}
            </button>
        </div>
    );
};

// Application root with DI scope
export const App: React.VFC = () => {
    const container = React.useState(buildContainer)[0];
    return (
        <DIRootScope root={container}>
            <MyComponent />
        </DIRootScope>
    );
};
```

This small example shows:
- Creating typed DI context for React;
- Root DI scope (`DIRootScope`) attached to the React tree;
- Hook-based dependency injection (`useInject`) in a functional component

`DIRootScope` connects the container to React’s component tree.
All components inside the root scope can access injected dependencies.


## Documentation
- [Dependency Injection in React Applications](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/01-React/01-DI-in-React-Apps.md)
- [React Integration Package Installation](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/01-React/02-Installation.md)
- [Dependency Injection Context for React](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/01-React/03-Creating-Context.md)
- [Root DI Scope for React](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/01-React/04-Root-Scope.md)
- [Dependency Injection via Component Props](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/01-React/05-Injection-Via-Props.md)
- [Dependency Injection via React Hook](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/01-React/06-Injection-Via-Hook.md)
- [Nested DI Scopes](https://github.com/SpireX64/spirex-di/blob/main/docs/docs/07-Integrations/01-React/07-Child-Scope.md)


## License
`@spirex/di-react` is released under the MIT License.

You are free to use, modify, and distribute the library in both personal and commercial projects.
