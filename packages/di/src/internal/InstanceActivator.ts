import type { IInstanceResolver, TTypeEntry, TTypeMapBase } from "../types";
import { isInstanceTypeEntry } from "../utils";

const Errors = {
    DependenciesCycle: (entryType: string, chain: readonly string[]) => {
        const sep = " -> ";
        const chainString =
            chain.length > 2
                ? chain
                      .map((it) => (it === entryType ? `[${it}]` : it))
                      .join(sep)
                : entryType + sep + entryType;
        return `Activation failed: A cyclic dependency was detected while resolving type '${entryType}'. Ensure that your dependencies do not form a circular reference. (Activation chain: ${chainString})`;
    },
};

export class InstanceActivator<TypeMap extends TTypeMapBase> {
    private _currentActivationStack: string[] = [];

    public createInstance<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
        resolver: IInstanceResolver<TypeMap>,
    ): TypeMap[Key] {
        if (isInstanceTypeEntry(entry)) return entry.instance;

        const entryType = entry.type.toString();
        const hasDependencyCycle =
            this._currentActivationStack.includes(entryType);
        this._currentActivationStack.push(entryType);
        if (hasDependencyCycle) {
            const error = new Error(
                Errors.DependenciesCycle(
                    entryType,
                    this._currentActivationStack,
                ),
            );
            this._currentActivationStack.length = 0;
            throw error;
        }

        const instance = entry.factory(resolver);
        this._currentActivationStack.pop();
        return instance;
    }
}
