import {
    createElement,
    createContext,
    useContext,
    useMemo,
    useEffect,
} from "react";

export function createDIContext() {
    var DIContext = createContext(null);
    var P = DIContext.Provider

    var useNestedScope = ({ id, ...opt }) => {
        var currentScope = useContext(DIContext)
        var scope = useMemo(() => currentScope.scope(id, opt), []);
        var dispose = scope.dispose.bind(scope);
        useEffect(() => dispose, []);
        return [scope, dispose]
    }

    var DIRootScope = ({ root, children }) =>
        createElement(P, { value: root }, children);

    var DIScope = ({ children, ...props }) => {
        return createElement(P, { value: useNestedScope(props)[0] }, children);
    };

    var useInject = (selector, name) => {
        var scope = useContext(DIContext);
        return useMemo(
            () =>
                typeof selector === "string"
                    ? scope.get(selector, name)
                    : selector(scope, {
                          current: scope.id,
                          path: scope.path,
                          dispose: scope.dispose.bind(scope),
                      }),
            [scope],
        );
    }

    var withInject = (selector, scopeProps) => (component) => {
        var HOC = scopeProps
            ? (props) => {
                var [ value, dispose ] = useNestedScope(scopeProps)
                var deps = selector(value, {
                    current: value.id,
                    path: value.path,
                    dispose,
                });

                return createElement(
                    P, { value },
                    createElement(component, {...deps, ...props}),
                );
            }
            : (props) => {
                var deps = useInject(selector);
                return createElement(component, {...deps, ...props});
            }

        /* istanbul ignore next */
        HOC.displayName =
            "withInject(" +
            (component.displayName || component.name || "Component") +
            ")";
        return HOC;
    };

    return {
        DIRootScope,
        DIScope,
        useInject,
        withInject,
    };
}
