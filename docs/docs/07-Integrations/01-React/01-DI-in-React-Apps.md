# Dependency Injection in React Applications

**React** is currently one of the **most widely used** libraries for building JavaScript applications across multiple platforms, including the web, mobile, and desktop. Like any non-trivial application, React-based systems rely on services and shared logic that must be created, managed, and injected in a controlled way.

However, React applications are built around **components**, and this significantly influences how dependency injection (DI) is typically approached. While React provides several mechanisms for passing dependencies, many of them introduce **architectural and maintainability problems** when used at scale.

## Approaches to DI in React Applications

This section reviews common dependency injection approaches in React, highlights their drawbacks, and introduces **SpireX/DI** as a solution designed to **integrate DI containers into React** without falling into common anti-patterns.


### Passing Dependencies via Props
The simplest way to inject dependencies into a React component is by **passing them through props**. In this model, a component explicitly declares which services it needs, and its parent is responsible for providing them.

```tsx
export type MyComponentProps = {
    authService: IAuthService;
    viewModel: IMyComponentViewModel;
};

export const MyComponent: React.VFC<MyComponentProps> = ({
    authService,
    viewModel,
}) => {
    return <div>...</div>;
};
```

This approach is explicit and easy to reason about in small component trees. 

However, it quickly becomes problematic in larger applications. Parent components that do not actually use these services are still forced to accept and forward them, creating the well-known props drilling anti-pattern.

Over time, this leads to bloated component interfaces and tight coupling between distant parts of the component tree.


### Dependency Injection via React Context
With the introduction of the **Context API** in React 16.3, it became possible to avoid passing dependencies through every level of the component tree. Dependencies can be **provided once at the application root** and consumed wherever needed.

```tsx
const ServicesContext = createContext<{
    authService: AuthService;
    viewModel: ComponentViewModel;
} | null>(null);

const AppRoot: React.VFC = () => {
    return (
        <ServicesContext.Provider
            value={{
                authService: new AuthService(),
                viewModel: new ComponentViewModel(),
            }}
        >
            <AppContent />
        </ServicesContext.Provider>
    );
};

const MyComponent: React.VFC = () => {
    const services = useContext(ServicesContext);
    if (!services)
        throw new Error('ServicesContext is not provided');

    const { authService, viewModel } = services;

    // ...
};
```

This approach is a significant improvement over props drilling.

However, it still leaves several responsibilities with the application developer:
- creating services;
- managing their lifecycle;
- ensuring correct initialization order.

Additionally, this form of injection is **only available inside the React component tree** and cannot be easily reused by non-React services.


### Global Exports and Singletons
A very common—but **highly problematic—approach in React applications** is the use of **globally exported services**. Instead of managing contexts or props, services are imported directly wherever they are needed.

```tsx
// FILE: ./services/auth.ts
import { anotherService } from './another';

class AuthService {
    doAuth() {
        // ...
        anotherService.notify();
    }
    // ...
}

export const authService = new AuthService();


// FILE: ./components/MyComponent.tsx
import { authService } from '../services/auth';

export const MyComponent: React.VFC = () => {
    const [isAuth, setIsAuth] = useState(authService.isAuthorized);

    useEffect(() => {
        const dispose = authService.onAuthChanged((authorized) => {
            setIsAuth(authorized);
        });

        return dispose;
    }, []);

    // ...
};
```

While this approach is convenient and fast to implement, it introduces serious long-term issues. 
- The application becomes difficult or impossible to test due to hidden dependencies.
- Initialization order becomes implicit and fragile, leading to potential undefined values at import time.
- Even worse, global exports often create implicit circular dependencies that are extremely hard to debug.

This pattern combines two major anti-patterns: **global state** and **the service locator**.


### DI Containers Used as Service Locators

Some projects attempt to address these problems by introducing a full-featured DI container. However, they often misuse it by **importing the container directly into components** and resolving dependencies manually.

```tsx
import { container, TYPES } from '../../di';

export const MyComponent: React.VFC = () => {
    const auth = container.resolve<AuthService>(TYPES.auth);
    const viewModel = container.resolve<ViewModel>(TYPES.viewModel);

    // ...
};
```

In this scenario, the component gains **unrestricted access** to the container and becomes **responsible for resolving** its own dependencies. This again turns the DI container into a service locator, reintroducing tight coupling and making components harder to reason about, test, and refactor.

## Dependency Injection with SpireX/DI in React
To avoid these common pitfalls, **SpireX/DI** provides a dedicated integration layer for React applications. Instead of exposing the container directly, it offers **strictly typed hooks and higher-order components** that allow dependencies to be injected declaratively.

```tsx
export const MyComponent: React.VFC = () => {
    const auth = useInject('auth');
    const viewModel = useInject('viewModel');

    // ...
};
```

In this model, the component has **no direct knowledge** of the DI container or how dependencies are created. The container remains fully responsible for instantiation, lifecycle management, and scoping. This design makes it trivial to replace the container in tests, allowing fake or mock services to be injected without modifying component code.

The integration preserves strong TypeScript typing without requiring explicit casts or manual type annotations. Additionally, **SpireX/DI** allows applications to be **split into isolated scopes**, limiting the lifetime and visibility of dependencies and enabling more predictable and maintainable architectures.


--------------
## Summary
Dependency injection in React can be implemented in several ways, but many common approaches lead to scalability and maintainability issues. Props drilling, global exports, and container-as-service-locator patterns all introduce tight coupling and hidden dependencies. 
React Context improves the situation but still leaves lifecycle management to the developer.

SpireX/DI provides a structured, type-safe integration that keeps dependency management inside the container while offering clean, declarative injection for React components.
