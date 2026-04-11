<script>
    import { setDIRootScope, setDIScope, useInject } from "../index.js";

    let { root, childScopeId, typeKey } = $props();
    setDIRootScope(root);
    setDIScope(childScopeId, {});
    const value = useInject(typeKey);
</script>

<span data-testid="nested-out">{String(value)}</span>
