import {
    createElement,
    createContext,
    useContext,
    useMemo,
    useRef,
    useEffect,
    forwardRef,
} from "react";

var DIContext = createContext(null);
var Provider = DIContext.Provider;

var assertScope = (scope) => {
    if (scope === null)
        throw new Error("No DIRootScope found");
}

var disposer = (scope) => scope.dispose.bind(scope);

var makeCtx = (scope, dispose) => ({
    current: scope.id,
    path: scope.path,
    dispose: dispose || disposer(scope),
})

var useNestedScope = ({ id, ...opt }) => {
    var currentScope = useContext(DIContext);
    assertScope(currentScope);
    var ref = useRef(null);
    var rc = ref.current;

    if (!rc || rc.isDisposed) {
        ref.current = currentScope.scope(id, opt);
    }

    var scope = ref.current;
    var dispose = disposer(scope);
    useEffect(() => dispose, []);
    return [scope, dispose];
}

export var DIRootScope = ({ root, children }) =>
    createElement(Provider, { value: root }, children);

export var DIScope = ({ children, ...props }) => {
    return createElement(Provider, { value: useNestedScope(props)[0] }, children);
};

export var useInject = (selector, name) => {
    var scope = useContext(DIContext);
    assertScope(scope);
    return useMemo(
        () =>
            typeof selector === "string"
                ? scope.get(selector, name)
                : selector(scope, makeCtx(scope)),
        [scope],
    );
}

export var withInject = (selector, scopeProps) => (component) => {
    var HOC = forwardRef(
        scopeProps
            ? (props, ref) => {
                var [ value, dispose ] = useNestedScope(scopeProps)
                var deps = selector(value, makeCtx(value, dispose));

                return createElement(
                    Provider, { value },
                    createElement(component, {...deps, ...props, ref}),
                );
            }
            : (props, ref) => {
                var deps = useInject(selector);
                return createElement(component, {...deps, ...props, ref});
            }
    );

    /* istanbul ignore next */
    HOC.displayName =
        "withInject(" +
        (component.displayName || component.name || "") +
        ")";
    return HOC;
};

export function getDIReact() {
    return { DIRootScope, DIScope, useInject, withInject }
} 

/** @deprecated (since 1.2.0) */
export var createDIContext = getDIReact;
