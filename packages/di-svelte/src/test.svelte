<script lang="ts">
    import { createDIContext } from './index'
    import { diBuilder, TypeMapOf } from '@spirex/di'

    var container = diBuilder<{ foo: string }>()
        .bindInstance('foo', 'Hello Svelte')
        .build();

    type TypeMap = TypeMapOf<typeof container>;

    var { setDIRootScope, DIScope, useInject } = createDIContext<TypeMap>();

    setDIRootScope(container.scope('ui'))

    var foo = useInject("foo")
</script>

<DIScope name="screen">
    <div>

    </div>
</DIScope>