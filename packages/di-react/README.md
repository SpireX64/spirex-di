# SpireX/DI for React
`@spirex/di-react`

 Provides **ReactJS** integration, including hooks and higher-order components (HoC) for injecting dependencies into components.

![NPM Type Definitions](https://img.shields.io/npm/types/%40spirex%2Fdi-react?style=for-the-badge)
[![NPM Version](https://img.shields.io/npm/v/%40spirex%2Fdi-react?style=for-the-badge)](https://www.npmjs.com/package/@spirex/di-react)
[![Codecov](https://img.shields.io/codecov/c/github/spirex64/spirex-di?token=VXQZK5WDSY&flag=di-react&style=for-the-badge)](https://codecov.io/github/SpireX64/spirex-di)
![GitHub License](https://img.shields.io/github/license/spirex64/spirex-di?style=for-the-badge)

```tsx
const { DIRootScope, useInject } = createDIContext<TypeMap>()

const Page: React.VFC = () => {
    const vm = useInject("pageViewModel");
    return <h1>{vm.title}</h1>
}

const App: React.VFC = () => {
    const container = createContainer();

    const reactScope = container.scope("react");
    return (
        <DIRootScope root={reactScope}>
            <DIScope id="page" sealed>
                <Page />
            </DIScope>
        </DIRootScope>
    )
}
```