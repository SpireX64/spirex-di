import type { TTypeEntry, TTypeMapBase } from "../types";

export class InstancesStorage<TypeMap extends TTypeMapBase> {
    private readonly _instancesMap = new Map<
        TTypeEntry<TypeMap, keyof TypeMap>,
        TypeMap[keyof TypeMap]
    >();

    public get isEmpty(): boolean {
        return this._instancesMap.size === 0;
    }

    public getInstance<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
    ): TypeMap[Key] | null {
        return (this._instancesMap.get(entry) as TypeMap[Key]) ?? null;
    }

    public storeInstance<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
        instance: TypeMap[Key],
    ): void {
        this._instancesMap.set(entry, instance);
    }

    public forEach(fn: (instance: unknown) => void): void {
        this._instancesMap.forEach(fn);
    }

    public clear(): void {
        this._instancesMap.clear();
    }
}
