# Injecting Dependencies into Existing Services

## External Services Outside the Container Lifecycle
In real-world applications, it is common to rely on third-party libraries or SDKs that **export already created service instances**. These services are often implemented as singletons, globals, or static objects and **do not allow consumers to control their construction**.

Even though such services already exist, they usually **still require configuration after creation**: API keys must be set, callbacks registered, or application-specific dependencies injected through setters or methods. This creates **a structural mismatch** with classical DI container APIs.

Standard container bindings are **not suitable** here.
- `bindInstance` can register an existing object but **cannot perform dependency injection** into it.
- `bindFactory` assumes responsibility for **creating** the instance and **managing** its lifecycle, which is impossible for externally owned services.

As a result, developers are left **without a formal place** to integrate these services into the DI system.


### Why External Services Break Dependency Injection
When working with external libraries, a recurring question arises:
> — "Where should dependency injection into external services actually happen if the container does not provide such a place?"

If configuration is moved outside the container, a **separate bootstrap mechanism** appears. This mechanism must be **maintained** independently and manually **coordinated with the container** after it is built. 

At that point, the container is **no longer the single source of truth** for dependency injection.

External services violate core assumptions of DI containers:
- they **already exist** before the container,
- they **require configuration** after creation,
- they often live longer than the container or entirely outside its lifecycle.

Most DI containers treat this as an edge case and offer no first-class solution. 

Libraries usually respond with vague recommendations such as:
- “configure the SDK manually at app startup”;
- “create a bootstrap function”;
- “wrap the service with an adapter”.

All of these are external protocols not understood or enforced by the container.

Architecturally, this is a **DI abstraction leak**. The container can no longer guarantee system correctness because **it does not know** when, where, or how dependencies are injected.

This leads to several concrete problems:
- There is no formal integration point, so injection into external services is no longer part of DI.
- The system loses atomicity: the container may be built, but the application is still not ready. 
- Initialization order is undefined;
- Lifecycle safety is lost — nothing prevents injecting transient or scoped services into a long-lived external singleton.


### Container-Level Injection as a First-Class Concept
To solve this correctly, a DI container **must explicitly support** this scenario. That means providing: 
- A formal post-build phase with access to a resolver;
- Making the intent of “injecting into an external service” explicit;
- Enforcing lifecycle constraints on injected dependencies.

**SpireX/DI** addresses this by allowing dependency injection into external services directly from the container configuration. The key rule is that only services with a container-owned lifecycle can be injected. In practice, this means `singleton` or `lazy` services that live for the entire lifetime of the container _(and usually the application)_.


## Using `injectInto`
Injection into **external services** is performed using the `injectInto` method. It accepts a delegate function that receives a dependency resolver. This function is executed immediately **after the container is built**.

```ts
const container = diBuilder()
    .injectInto(r => {
        ExternalService.setConfig(r.get("config"));
        ExternalService.setApiKey(r.get("extApiKey"));
    });
```
The resolver behaves the same way as during normal resolution, but lifecycle constraints are enforced to prevent unsafe injections.

You can call `injectInto` multiple times to **logically group** injections, for example by service or by external library.

```ts
const container = diBuilder()
    .injectInto(r => {
        ExternalA.setConfig(r.get("config"));
    })
    .injectInto(r => {
        ExternalB.setApiKey(r.get("apiKey"));
    });
```

All registered injections are executed atomically as part of the container build process, ensuring that the system is fully initialized once the container is ready.


## Module-Level Injection for Better Encapsulation
The `injectInto` method is also available **inside static modules**. This makes it possible to encapsulate all external service configuration inside the module **that owns the integration**, instead of spreading it across application bootstrap code.

```ts
// FILE: src/modules/payment/payment.module.ts
import { staticModule, factoryOf } from "@spirex/di";
import BillingService from "easy-pay-lib";
import { IapService } from "./IapService";

export const PaymentModule = staticModule("payment").create<{
    iap: IapService;
    billingApiKey: string;
}>(binder => {
    binder
        .bindInstance("billingApiKey", "api_pay1_ABC123XYZ789QWE456RTY")
        .bindFactory("iap", factoryOf(IapService));

    binder.injectInto(r => {
        BillingService.setKey(r.get("billingApiKey"));

        const iap = r.get("iap");
        BillingService.onReceptReceived(iap.onReceipt.bind(iap));
    });
});


// FILE: src/di.ts
const container = diBuilder()
    .include(PaymentModule)
    .build();
```
With this approach, all complexity related to configuring and wiring external services is **hidden inside the module** itself. The application-level container configuration remains clean, while the DI container remains the authoritative source of truth.


-------------
## Summary
External services that already exist outside the DI container lifecycle present a fundamental challenge for dependency injection. 

Without first-class container support, applications suffer from unclear initialization order, broken lifecycle guarantees, and abstraction leaks.

SpireX/DI solves this by introducing `injectInto`, a formal post-build injection phase that integrates external services safely and atomically. 

By enforcing singleton-only injection and supporting module-level configuration, the container retains control and architectural integrity even when dealing with third-party SDKs.
