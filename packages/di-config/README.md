# SpireX/DI Config

`@spired/di-config`

A middleware for `@spirex/di` that configures services right after they are created. Configure lets you apply post-construction initialization logic without modifying the service factory or class itself, making it easier to extend and reuse modules.

![NPM Type Definitions](https://img.shields.io/npm/types/%40spirex%2Fdi-config?style=for-the-badge)
[![NPM Version](https://img.shields.io/npm/v/%40spirex%2Fdi-config?style=for-the-badge)](https://www.npmjs.com/package/@spirex/di-config)
[![Codecov](https://img.shields.io/codecov/c/github/spirex64/spirex-di?token=VXQZK5WDSY&flag=di-config&style=for-the-badge)](https://codecov.io/github/SpireX64/spirex-di)
![GitHub License](https://img.shields.io/github/license/spirex64/spirex-di?style=for-the-badge)

```ts
import { Config } from '@spirex/di-config';

const container = diBuilder()
    .include(SQLiteModule)
    .use(Config({
        sqlite: (sqlite) => { sqlite.file = "db.sqlite" }
    }));
```