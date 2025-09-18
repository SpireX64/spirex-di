# Introduction

**SpireX/DI** is a small but powerful library that helps you manage dependencies in JavaScript and TypeScript applications.  
Instead of creating objects manually and passing them around yourself, you describe how they should be created in one place, and the library takes care of the rest.  

This approach is called **Dependency Injection (DI)**. It makes your code easier to read, easier to test, and much more flexible.


## Why use Dependency Injection?

Imagine you have a service that depends on other services.
Without DI, you would need to manually create each service and make sure they are connected correctly. As the project grows, this becomes messy and hard to maintain.  

With **SpireX/DI**, you only describe the rules once — for example, which class or factory should be used for a specific service. The container then creates and provides the right objects whenever you ask for them.  

This gives you several benefits:

- **Centralized configuration** – dependency wiring happens in one place, not scattered across the codebase.  
- **Consistency** – the same binding rules are applied everywhere.
- **Control over lifetimes** – decide how long an object should live: per container, per request scope, or freshly created every time.  
- **Flexibility** – swap one implementation for another without touching business logic.
- **Better testability** – use mock implementations for testing without changing application code.


## What makes SpireX/DI special?

**SpireX/DI** was designed to be easy to learn but powerful enough for large applications.

- Strong typing with **TypeScript** and runtime safety checks in **JavaScript**.
- **Immutable container** – once the container is built, it cannot be changed anymore. This ensures stability and predictability: you always know exactly which implementation will be provided, without surprises from late registrations.
- **Advanced scope management** with automatic disposal of resources.
- **Modules** – split your configuration into reusable pieces with their own type definitions.  
- **Middlewares** – extend the container’s behavior at any stage:   from binding a type, to resolving dependencies, to returning the final instance.
- **Deferred resolution** – create instances only when they are really needed. 
- **Conflict resolution strategies** – choose what happens if you try to bind the same key more than once.
- **Fail-fast** behavior: errors are discovered immediately during container setup in JavaScript.
- Built-in detection of **cyclic dependencies** with clear error messages.
- Zero dependencies, runs on pure JS, **only ~9KB** *without gzip*.

## When should you use it?

**Spirex/DI** can be useful when:

- Your application has many interconnected services and managing them manually is painful.  
- You want clear control over object lifetimes (global singletons, per-scope services, or always-new objects).  
- You need different bindings for different environments (development, testing, production).  
- You are building modular applications with reusable dependency configurations.

With **SpireX/DI**, you describe the rules of how objects are created once, and then simply use them anywhere in your application. This keeps your code clean, consistent, and much easier to maintain.
