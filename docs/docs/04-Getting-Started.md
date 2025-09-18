# Getting Started

Let's see how **SpireX/DI** works in a simple example.  
By the end of this example, you'll see how a few lines of configuration can give you a fully working dependency container.

## 1. Define your classes

First, we define the classes that will be used in our container:

```ts
export class Logger {
  log(message: string) {
    console.log('[LOG]', message);
  }
}

export class MyService {
  // Declare dependencies for factoryOf
  static inject = ['logger', 'value'] as const;

  public constructor(
    private logger: Logger,
    private value: number,
  ) {}

  public doSomething() {
    this.logger.log(`The value is ${this.value}`);
  }
}
```

## 2. Define a TypeMap

Now we declare the TypeMap, mapping keys to the types we want to manage:

```ts
type TypeMap = {
  value: number;
  logger: Logger;
  service: MyService;
}
```

Here, "value" is a `number`, "logger" is a `Logger` instance, and "service" is a `MyService` instance.

## 3. Bind a value

```ts
import { diBuilder } from '@spirex/di';

const builder = diBuilder<TypeMap>()
  .bindInstance('value', 42); // bind a constant value
```

Here TypeScript checks that 42 is compatible with the type of value (number) from the TypeMap.

## 4. Bind a factories

Factories create objects, possibly depending on other services.

We can use `factoryOf` to automatically inject dependencies declared in a static inject field:

```ts
import { diBuilder, factoryOf } from '@spirex/di';

// ...

builder
  .bindFactory('logger', () => new Logger());
  .bindFactory('service', factoryOf(MyService));
```

`factoryOf(MyService)` automatically reads the dependencies from `MyService.inject` and resolves them from the container. It also **validates types and the order of parameters**, ensuring that every key in inject exists in the TypeMap and matches the constructor signature.


## 5. Build the container

Once all bindings are configured, we build the container:
```ts
const container = builder.build();
```


## 6. Retrieve instances

Now we can get our services from the container:

```ts
const logger = container.get('logger');
logger.log('Hello from the container!');

const service = container.get('service');
service.doSomething();
// Logs: "The value is 42"
```


## Final compact version

Here’s the same example in its simplest form — everything in one place:

```ts
import { diBuilder, factoryOf } from '@spirex/di';

class Logger {
  public log(message: string) {
    console.log('[LOG]', message);
  }
}

class MyService {
  static inject = ['logger', 'value'] as const;

  public constructor(
    private logger: Logger,
    private value: number,
  ) {}
  
  public doSomething(): void {
    this.logger.log(`The value is ${this.value}`);
  }
}

const container = diBuilder<{
  value: number;
  logger: Logger;
  service: MyService;
}>()
  .bindInstance('value', 42)
  .bindFactory('logger', () => new Logger())
  .bindFactory('service', factoryOf(MyService))
  .build();

container.get('service').doSomething();
// Logs: "The value is 42"
```

---

That’s it! You’ve just built a working dependency container with type safety, zero boilerplate, and complete clarity.
