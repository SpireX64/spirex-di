# Installation

SpireX/DI is easy to install and use in any JavaScript or TypeScript project.  


## Installing the library

You can install SpireX/DI using any popular package manager:

```sh
# Using npm
npm install @spirex/di

# Using yarn
yarn add @spirex/di

# Using pnpm
pnpm add @spirex/di

# Using bun
bun add @spirex/di
```

## Runtime requirements

SpireX/DI relies on modern JavaScript features such as *Map*, *Set*, and *Proxy*. Make sure your environment supports these features. If targeting older environments, include appropriate polyfills.

Minimal supported environments:

- **ECMAScript:** ES2015+
- **Browsers:** Chrome ≥ 49, Firefox ≥ 29, Safari ≥ 9
- **Node.js:** ≥ 6.0.0
- **Bun:** ≥ 0.5.0
- **Deno:** ≥ 1.0


## Module system compatibility

SpireX/DI works with different JavaScript module systems:

- **ES Modules (ESM)** – modern standard for JavaScript modules using import and export.
- **CommonJS (CJS)** – Node.js module system using require and module.exports.
- **UMD (Universal Module Definition)** – works in both browsers and Node.js, compatible with AMD and global scripts.

This ensures the library can be used in a wide range of projects, bundlers, and environments.

## TypeScript support

Although written in plain JavaScript, SpireX/DI provides **full TypeScript type definitions**. This ensures:

- Strict type checking at compile time.
- Autocompletion and helpful hints in editors.
- High runtime performance, since there is no extra overhead for type enforcement.

## No dependencies

SpireX/DI has **zero dependencies**, which means:

- The library is lightweight.
- It does not conflict with other packages in your project.
- You don’t need to worry about external updates or breaking changes from third-party dependencies.

---

Enjoy building your applications with a clean, predictable, and powerful dependency injection system — your adventure begins here!
