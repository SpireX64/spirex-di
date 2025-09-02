import {
    createElement,
    createContext,
    useContext,
    useMemo,
    useEffect,
} from "react";

export function createDIContext() {
    const DIContext = createContext(null);

    const DIRootScope = ({ root, children }) => {
        return createElement(DIContext.Provider, { value: root }, children);
    };

    const DIScope = ({ id, sealed, isolated, children }) => {
        var currentScope = useContext(DIContext);
        var scope = currentScope.scope(id, { sealed, isolated });
        useEffect(() => scope.dispose.bind(scope));
        return createElement(DIContext.Provider, { value: scope }, children);
    };

    function useInject(selector, name) {
        var scope = useContext(DIContext);
        return useMemo(() => {
            var result =
                typeof selector === "string"
                    ? scope.get(selector, name)
                    : selector(scope);

            return result;
        }, []);
    }

    function withInject(selector) {
        return (component) => {
            var HOC = (props) => {
                var deps = useInject(selector);
                return createElement(component, Object.assign(deps, props));
            };
            /* istanbul ignore next */
            HOC.displayName =
                "withInject(" +
                (component.displayName || component.name || "Component") +
                ")";
            return HOC;
        };
    }

    return {
        DIRootScope,
        DIScope,
        useInject,
        withInject,
    };
}
