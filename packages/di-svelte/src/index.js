import { SvelteComponent, setContext, getContext } from "svelte";
import { init, onDestroy, safe_not_equal } from "svelte/internal";

var DI_CONTEXT = Symbol("di");
var noop = () => {};

function setDIRootScope(scope) {
    if (getContext(DI_CONTEXT)) 
        throw new Error('DI root scope is already set in this component tree.');
  
    setContext(DI_CONTEXT, scope);
}

function setDIScope(name, options) {
    var currentScope = getContext(DI_CONTEXT);
    var scope = currentScope.scope(name, options);
    setContext(DI_CONTEXT, scope);
    onDestroy(() => scope.dispose());
}

function useInject(selectorOrType, name) {
    var scope = getContext(DI_CONTEXT);
    return typeof selectorOrType === "string"
        ? scope.get(selectorOrType, name)
        : selectorOrType(scope);
}

// function domFragment(ctx) {
//     var slotTemplate = ctx[0].default;
//     var slot = slotTemplate && slotTemplate({});
//     return {
//         c() { 
//             if (slot && slot.c) slot.c(); 
//         },
//         m(target, anchor) { 
//             if (slot && slot.m) slot.m(target, anchor); 
//         },
//         p: noop,
//         i: noop,
//         o: noop,
//         d(detaching) { 
//             if (slot && slot.d) slot.d(detaching); 
//         }
//     };
// }

// export class DIRootScope extends SvelteComponent {
//     static instance($$self, $$props, $$invalidate) {
//         setDIRootScope($$props.root)
//         const $$slots = $$props.$$slots || {};
//         return [$$slots]
//     }

//     constructor(options) {
//         super();
//         init(this, options, DIRootScope.instance, domFragment, safe_not_equal, {});
//     }
// }

// export class DIScope extends SvelteComponent {
//     static instance($$self, $$props, $$invalidate) {
//         var { name, sealed = false, isolated = false } = $$props;
//         var $$slots = $$props.$$slots || {};
//         setDIScope(name, { sealed, isolated })
//         return [$$slots]
//     }

//     constructor(options) {
//         super();
//         init(this, options, DIScope.instance, domFragment, safe_not_equal, {});
//     }
// }

export function createDIContext() {
    return {
        useInject,
        setDIRootScope,
        setDIScope,
        // DIRootScope,
        // DIScope,
    };
}
