<script>
    import { setDIRootScope, useInject } from "../index.js";

    let { root, typeKey } = $props();
    setDIRootScope(root);
    const current = useInject((r, ctx) => ({
        fromCtx: ctx.current,
        val: r.get(typeKey),
    }));
</script>

<span data-testid="ctx">{String(current.fromCtx)}</span>
<span data-testid="val">{String(current.val)}</span>
