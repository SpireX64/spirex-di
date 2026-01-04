# Changelog — SpireX/DI for React integration

## 1.1.0
- Added the current scope context (`IScopeContext`) to the `TInjectSelector` injection function.
- Added support for opening scopes using the `withInject` HoC.
- (FIX) Fixed the props typing for `DIScope`, which previously caused TypeScript errors when using a string-based scope identifier.
- (FIX) Fixed memoization of nested scopes.
