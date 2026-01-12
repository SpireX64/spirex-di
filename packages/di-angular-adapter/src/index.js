export function AngularAdapter() {
    return {
        name: AngularAdapter.name,
        onPreBuild: (builder) => {
            builder.bindFactory('ngAdapter', () => {}, { lifecycle: 'lazy' })
        }
    }
}