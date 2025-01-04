import type { TTypeMapBase } from "../types";

export class InstancesStorage<TypeMap extends TTypeMapBase> {
    private readonly _instancesMap = new Map<
        keyof TypeMap,
        TypeMap[keyof TypeMap]
    >();

    public get isEmpty(): boolean {
        return this._instancesMap.size === 0;
    }

    public getInstance<Key extends keyof TypeMap>(
        type: Key,
    ): TypeMap[Key] | null {
        return (this._instancesMap.get(type) as TypeMap[Key]) ?? null;
    }

    public storeInstance<Key extends keyof TypeMap>(
        type: Key,
        instance: TypeMap[Key],
    ): void {
        this._instancesMap.set(type, instance);
    }
}
