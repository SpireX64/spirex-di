# Angular Bridge Setup

Integrating the **SpireX/DI** ↔ **Angular** bridge is straightforward and can be done in a few simple steps.


## 1. Connect to the SpireX/DI Container

Before building your DI container, include the `AngularBridge()` as a middleware in the container configuration:

```ts
import { diBuilder } from '@spirex/di';
import { AngularBridge } from '@spirex/di-angular-bridge';

// Build the container with modules
const container = diBuilder()
    .include(AuthModule)
    .include(PaymentModule)
    .include(ProfileModule)

    // Integrate the Angular bridge
    .use(AngularBridge())
    
    .build();
```

This step prepares the SpireX/DI container for Angular integration. The bridge automatically generates Angular-compatible `InjectionTokens` based on the container bindings.


> ⚠️ Tip: Although the bridge works if added early in the container configuration, including it right before `build()` allows TypeScript to infer types accurately. This ensures full type checking and auto-completion when injecting services in Angular components.


## 2. Retrieve the Bridge Instance and Tokens
Once the bridge has been integrated and the container is built, you can retrieve the bridge instance and extract tokens for easy access:

```ts
// Get the configured bridge
export const bridge = container.get("AngularBridge");

// Retrieve all service tokens
export const TOKENS = bridge.tokens;
```

The bridge automatically prepares tokens for Angular injection. Each `InjectionToken` references the corresponding service binding in the **SpireX/DI** container.

For example, if an authentication service was bound in the container:
```ts
builder.bindFactory("auth", factoryOf(AuthService));
```

Its token can be accessed via the bridge:
```ts
const token = TOKENS.auth; // InjectionToken<IAuthService>
```

This token can then be used in Angular components or services for dependency injection.


## 3. Register Providers in Angular
Finally, register the **providers** in your Angular application so that Angular knows **how to resolve** the requested services. The bridge provides a convenient method `providersForRoot()` to obtain all required providers:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { bridge, TOKENS } from './domain/di';

bootstrapApplication(AppComponent, {
    providers: [
        ...bridge.providersForRoot(),
    ]
});
```

At this point, the integration between **Angular DI** and **SpireX/DI** is **complete**. All services defined in the SpireX/DI container are now accessible through Angular’s standard injection API.


--------------
## Summary
The Angular bridge simplifies cross-framework dependency management by exposing SpireX/DI services via Angular DI. 

Integration involves three main steps:
- including the bridge in the container configuration;
- retrieving tokens from the bridge;
- registering providers in Angular.

This setup ensures fully typed, Angular-native access to all pre-configured services without duplicating DI configuration.
