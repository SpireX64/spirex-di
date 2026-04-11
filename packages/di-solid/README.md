![NPM Type Definitions](https://img.shields.io/npm/types/%40spirex%2Fdi-solid?style=for-the-badge)
[![NPM Version](https://img.shields.io/npm/v/%40spirex%2Fdi-solid?style=for-the-badge)](https://www.npmjs.com/package/@spirex/di-solid)
[![Codecov](https://img.shields.io/codecov/c/github/spirex64/spirex-di?token=VXQZK5WDSY&flag=di-solid&style=for-the-badge)](https://codecov.io/github/SpireX64/spirex-di)
![GitHub License](https://img.shields.io/github/license/spirex64/spirex-di?style=for-the-badge)

# SpireX/DI integration for SolidJS

`@spirex/di-solid`

**Type-safe SolidJS integration for SpireX/DI** — inject dependencies into components using Solid’s **`createContext`**, **`DIRootScope`**, **`DIScope`**, and the **`useInject`** hook.

Expect a **single stable root scope** for the app: changing the `root` prop on `DIRootScope` is not a supported workflow; remount the tree if you need a new container.

## Features

- **Type-safe DI** — full TypeScript support and `getDISolid<TypeMap>()` for a strict `TypeMap`
- **Root and nested scopes** — `DIRootScope` and `DIScope` with automatic disposal on scope teardown
- **`useInject`** — resolve by token string or selector `(resolver, scopeContext) => value`
- **Shared context** — one module-level context; imports from this package share the same DI tree
- **Peer dependencies** — `@spirex/di`, `solid-js` ^1.8

## Installation

```shell
npm install @spirex/di @spirex/di-solid
# or
yarn add @spirex/di @spirex/di-solid
```

## Quickstart

### Strictly typed API

When the full `TypeMap` is known, use `getDISolid<TypeMap>()`:

```tsx
import { diBuilder, factoryOf, TypeMapOf } from "@spirex/di";
import { getDISolid } from "@spirex/di-solid";

const buildContainer = () =>
    diBuilder<{
        auth: AuthService;
    }>()
        .bindFactory("auth", factoryOf(AuthService))
        .build();

export type TypeMap = TypeMapOf<ReturnType<typeof buildContainer>>;

export const { DIRootScope, DIScope, useInject } = getDISolid<TypeMap>();

export function App() {
    const container = buildContainer();
    return (
        <DIRootScope root={container}>
            <Child />
        </DIRootScope>
    );
}

function Child() {
    const auth = useInject("auth");
    return <button onClick={() => auth.login()}>Login</button>;
}
```

### Dynamic imports with a cast

In packages that do not see the full `TypeMap`, import the defaults and narrow `useInject`:

```ts
import { useInject, DIRootScope } from "@spirex/di-solid";
import type { TUseInject } from "@spirex/di-solid";

const useTypedInject = useInject as TUseInject<MyLocalTypeMap>;
```

## API

| Export        | Description |
| ------------- | ----------- |
| `DIRootScope` | `root={IContainerScope}` — attach the built container at the app root |
| `DIScope`     | `id` + scope options — nested scope; disposed when the scope unmounts |
| `useInject`   | `useInject("token")`, `useInject("token", "name")`, or `useInject((r, ctx) => …)` |
| `getDISolid`  | Returns the same `DIRootScope`, `DIScope`, and `useInject` references |

## License

`@spirex/di-solid` is released under the MIT License.
