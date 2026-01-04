# React Integration Package Installation
**SpireX/DI** is designed as a framework-agnostic dependency injection container.
It can be used across different types of applications and does not depend on React or any other UI library.
Because of this, React-specific integration is intentionally kept out of the core package.

To support idiomatic usage in React applications,
the React integration is provided as a separate package.


## Installing the React Integration
React support is implemented in the dedicated package `@spirex/di-react`.
You can install it using any common package manager:

```shell
# NPM
npm install @spirex/di-react

# Yarn
yarn add @spirex/di-react

# PNPM
pnpm add @spirex/di-react
```

The React integration package does not include the core DI container itself.
For the integration to work correctly, you must install the main package alongside it:

```shell
npm install @spirex/di
```
or the equivalent command for your package manager.


## React Version and Technical Approach
The React integration is built on top of the **React Context API** and **React hooks**.
Dependencies are injected into components through context providers
and custom hooks rather than through manual container access.

Because hooks are required, the integration supports React versions `16.8.0` and newer.

## Module System Support
Like the core `@spirex/di` package, the React integration is distributed in multiple module formats.
It can be consumed in environments that rely on **ESM**, **CommonJS**,
or **UMD** without additional configuration.
