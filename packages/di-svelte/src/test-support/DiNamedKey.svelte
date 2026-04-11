<script>
    import { setDIRootScope, useInject } from "../index.js";

    let { root, typeKey, bindingName } = $props();
    setDIRootScope(root);
    const value = useInject(typeKey, bindingName);
</script>

<span data-testid="named-out">{String(value)}</span>
