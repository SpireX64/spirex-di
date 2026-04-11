import {
    createContext,
    useContext,
    onCleanup,
    splitProps,
    createComponent,
} from "solid-js";

import { ensureChildScopeRef, scopeOptionsFromProps } from "./scope-internal.js";

var DIContext = createContext(null);

var assertScope = (scope) => {
    if (scope === null) throw new Error("No DIRootScope found");
};

var disposer = (scope) => scope.dispose.bind(scope);

var makeCtx = (scope) => ({
    current: scope.id,
    path: scope.path,
    dispose: disposer(scope),
});

var useNestedScope = (props) => {
    var currentScope = useContext(DIContext);
    assertScope(currentScope);
    var ref = { current: null };
    var id = props.id;
    var opt = scopeOptionsFromProps(props);
    ensureChildScopeRef(currentScope, id, opt, ref);
    var scope = ref.current;
    var dispose = disposer(scope);
    onCleanup(dispose);
    return [scope, dispose];
};

export var DIRootScope = (props) =>
    createComponent(DIContext.Provider, {
        get value() {
            return props.root;
        },
        get children() {
            return props.children;
        },
    });

export var DIScope = (props) => {
    var split = splitProps(props, ["children"]);
    var rest = split[1];
    return createComponent(DIContext.Provider, {
        value: useNestedScope(rest)[0],
        get children() {
            return split[0].children;
        },
    });
};

export var useInject = (selector, name) => {
    var scope = useContext(DIContext);
    assertScope(scope);
    return typeof selector === "string"
        ? scope.get(selector, name)
        : selector(scope, makeCtx(scope));
};

export function getDISolid() {
    return { DIRootScope, DIScope, useInject };
}
