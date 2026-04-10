# @spirex/di-angular-bridge — Change Log

## v1.0.1

- **Angular 22+ compatibility:** `InjectionToken` now exposes a read-only `multi` flag in recent Angular versions. The bridge no longer attaches `multi` / `named` metadata by mutating token instances.

- **Peer dependency range:** `@angular/core` is declared as `>=12.0.0 <23.0.0` so installs align with supported Angular major lines while staying compatible with the versions used in CI.
