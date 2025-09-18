# SpireX/DI Dynamic Modules
`@spirex/di-dynamic` 

Adds support for **dynamic modules**, allowing you to load parts of your container asynchronously at runtime. Perfect for *code-splitting* and modular applications.

![NPM Type Definitions](https://img.shields.io/npm/types/%40spirex%2Fdi-dynamic?style=for-the-badge)
[![NPM Version](https://img.shields.io/npm/v/%40spirex%2Fdi-dynamic?style=for-the-badge)](https://www.npmjs.com/package/@spirex/di-dynamic)
[![Codecov](https://img.shields.io/codecov/c/github/spirex64/spirex-di?token=VXQZK5WDSY&flag=di-dynamic&style=for-the-badge)](https://codecov.io/github/SpireX64/spirex-di)
![GitHub License](https://img.shields.io/github/license/spirex64/spirex-di?style=for-the-badge)

```ts
import type { CartService } from "./features/cart"

const CartModule = dynamicModule(
    "CartModule",
    () => import("./features/cart/index.ts"),
).create<{
    cart: CartService,
}>((binder, { CartService }) => {
    binder.bindFactory("cart", factoryOf(CartService));
});