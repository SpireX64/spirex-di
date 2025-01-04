import type { IInstanceResolver, TTypeEntry, TTypeMapBase } from "../types";
import { isFactoryTypeEntry } from "../utils";

export class InstanceActivator<TypeMap extends TTypeMapBase> {
    public createInstance<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
        resolver: IInstanceResolver<TypeMap>,
    ): TypeMap[Key] {
        if (isFactoryTypeEntry(entry)) return entry.factory(resolver);
        return entry.instance;
    }
}
