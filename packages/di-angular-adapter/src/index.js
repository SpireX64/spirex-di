export function AngularAdapter() {
    return {
        name: AngularAdapter.name,
        onPreBuild: (builder) => {
            builder.bindFactory('angularAdapter', () => {
                return Object.freeze({ tokens: [] })
            }, { lifecycle: 'lazy' })
        }
    }
}