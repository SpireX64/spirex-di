# Dependency Injection via Component Props in React

In React applications, tightly coupling components to a dependency container can reduce maintainability and testability. A more robust approach is to pass dependencies explicitly through **component props**. 

The `@spirex/di-react` facilitates this pattern by allowing dependency injection directly into component props via the `withInject` higher-order component (HOC).

This design keeps components declarative, testable, and independent of the DI container, as dependencies are supplied externally.


## Defining a Component
Components declare their dependencies as props, just like any other input:

```tsx
export type MyComponentProps = {
    viewModel: MyComponentViewModel;
};

export const MyComponent: React.VFC<MyComponentProps> = ({ viewModel }) => {
    // Component logic using viewModel
    return <div>{/* render using viewModel */}</div>;
};
```

At this stage, the component is fully decoupled from the DI container and can be tested in isolation by passing mock props.


## Injecting Dependencies
`withInject` is a higher-order component that maps DI-resolved values to component props.

```ts
import { withInject } from "../di/react";

export const MyComponentInjected = withInject(resolver => ({
    viewModel: resolver.get("MyComponentViewModel"),
}))(MyComponent);
```
- The delegate function receives a reference to the DI resolver, which can fetch dependencies from the current DI scope.
- The delegate must return an object mapping prop names to dependencies.
- `withInject` returns a new component that automatically injects the specified dependencies. The wrapped component must have props compatible with the injected values.

This pattern allows dependencies to be supplied declaratively, without the component querying the container itself.

## TypeScript Integration
`withInject` improves the developer experience by automatically **removing injected props** from the external type signature of the wrapped component. This means TypeScript will **not require injected props to be passed manually**.

When `withInject` is created from a fully typed DI context:
- TypeScript ensures all dependency keys used in the delegate exist in the container.
- TypeScript verifies that injected values are compatible with the component’s prop types.

This prevents runtime type mismatches and ensures strong type safety.


## Architectural Benefits
Prop-based injection provides several advantages:
- **Purity and testability:** Components remain declarative and independent of the DI container.
- **Explicit dependency ports:** Props act as clear interfaces for dependencies.
- **Predictable data flow:** Dependencies are injected externally, avoiding hidden coupling.

The way `withInject` is applied may vary by project conventions:
- Export both the pure component and its injected version.
- Separate component definition and injection logic into different files, then re-export via a barrel file.
- Wrap the component immediately with `withInject` without exporting a non-injected version.



## Functional and Class Component Support
`withInject` works with both **functional** and **class-based** components, making it a versatile solution for prop-based dependency injection across different component styles.


-------------
## Summary
The `withInject` HOC enables clean, type-safe dependency injection into React component props.

- Components remain decoupled from the DI container and fully testable, with injected props automatically removed from the public interface.
- TypeScript verifies both the existence of dependency keys and the compatibility of injected values with the component’s props.
- The HOC works with both functional and class components, providing a flexible and maintainable approach to dependency injection in React.
