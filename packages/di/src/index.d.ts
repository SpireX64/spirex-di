type TTypeMapBase = object;

interface IContainer {}

interface IContainerBuilder<TypeMap extends TTypeMapBase> {
    bindInstance<T extends keyof TypeMap>(
        type: T,
        instance: TypeMap[T],
    ): IContainerBuilder<TypeMap>;

    hasEntry(type: string, name?: string): IContainerBuilder<TypeMap>;

    build(): IContainer;
}

export declare function createContainerBuilder<
    TypeMap extends TTypeMapBase,
>(): IContainerBuilder<TypeMap>;
