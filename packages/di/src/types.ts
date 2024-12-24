export type TTypeMapBase = Record<string, unknown>;

export type TTypeEntry<K, T> = {
    type: K;
    instance: T;
};
