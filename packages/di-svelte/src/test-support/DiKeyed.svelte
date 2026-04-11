<script>
    import { setDIRootScope, useInject } from "../index.js";

    let { root, typeKey } = $props();
    setDIRootScope(root);
    const value = useInject(typeKey);
</script>

<span data-testid="out">{String(value)}</span>
