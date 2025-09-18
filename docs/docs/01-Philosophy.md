# Philosophy of SpireX/DI

**SpireX/DI** was created with one simple goal: provide **powerful dependency injection** capabilities while **minimally affecting the projects** that use it.


Unlike many other DI libraries, SpireX/DI focuses on predictability, safety, and flexibility without forcing developers to change their code or rely on additional tools.

## Minimal impact on your code

> Dependency injection should not become a dependency on injections.

Many DI libraries require **decorators** or **reflect-metadata** to automatically detect types and inject dependencies.  
This often means extra dependencies, TypeScript/Babel configuration, and changes in service classes.  

**SpireX/DI** does not require any changes in your application code.
All bindings are defined only in the container configuration, keeping your services clean and portable. This makes it suitable even for older projects where configuring TypeScript or Babel for decorators is difficult.

## Strict typing and verifications

> I do not turn your code into a mystery. I make it predictable.

In SpireX/DI, every key and type must be declared in a TypeMap.
This ensures:

- Key existence is checked at compile time.
- Type compatibility is verified both when registering bindings and when resolving dependencies.
- Mistakes are caught early, making your code safer and more predictable.

This strict typing prevents runtime surprises and helps maintain large codebases reliably.

## Immutable container

> A container, once set, becomes a silent guardian of certainty.

Once a SpireX/DI container is built, it **cannot be modified**:

- You cannot add new bindings or replace existing implementations after the container is created.
- All rules for dependency resolution are defined **in one place**, making behavior predictable.
- Flexible configuration during container setup allows different implementations for different conditions without changing the container later.

This design contrasts with many libraries that allow dynamic registration at runtime, which can lead to unpredictable behavior.

## Reusable modules

> Modules are not magic – They are a way to share architecture.

SpireX/DI promotes **modular configuration** through reusable modules.  

A module defines a set of bindings once, including all necessary types, and can be included in any container. This means you don’t need to repeatedly configure DI from project to project—just write a module once and reuse it.  

Modules reduce boilerplate and let you focus on the **core application logic** rather than wiring dependencies.
They also work seamlessly with TypeMap, ensuring all types are correctly added to the container.


## Extensibility through middleware

> I do not control your application. I give you control over it.

Many DI containers provide a simple dependency resolution mechanism or allow only limited control over the resolution process.  

SpireX/DI takes a different approach: the container should **work for your application, not force your application to adapt to it**.  

The middleware system gives you **full control over every stage** of the container’s work—from binding types, through instance creation, to delivering objects to the caller.  
This allows you to shape the behavior of the container exactly to your project’s needs, adding logging, decoration, validation, or any custom logic, without being limited by the container itself.


## Explicit control over visibility and scopes

> I do not interfere with your code, I respect it.

SpireX/DI does not create a **global** container by default.
Only developers can decide:

- Whether a container is local to a function, a module, or exported globally.
- How instances are shared using scopes, limiting access to certain areas of the application.

This prevents accidental service leaks and reduces the risk of implicit cyclic dependencies that often occur in large projects.

