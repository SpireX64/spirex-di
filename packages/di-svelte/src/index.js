import { getContext, onDestroy, setContext } from "svelte";

var DI_CONTEXT = Symbol("spirex-di");

var assertScope = (scope) => {
    if (scope == null)
        throw new Error("No DI scope in context");
};

var disposer = (scope) => scope.dispose.bind(scope);

var makeCtx = (scope, dispose) => ({
    current: scope.id,
    path: scope.path,
    dispose: dispose || disposer(scope),
});

export function setDIRootScope(scope) {
    setContext(DI_CONTEXT, scope);
}

export function setDIScope(id, options) {
    var currentScope = getContext(DI_CONTEXT);
    assertScope(currentScope);
    var child = currentScope.scope(id, options);
    setContext(DI_CONTEXT, child);
    onDestroy(() => child.dispose());
}

export function useInject(selector, name) {
    var scope = getContext(DI_CONTEXT);
    assertScope(scope);
    return typeof selector === "string"
        ? scope.get(selector, name)
        : selector(scope, makeCtx(scope));
}

export function getDISvelte() {
    return {
        setDIRootScope,
        setDIScope,
        useInject,
    };
}
