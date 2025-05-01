import type {
    TLifecycle,
    TTypeEntry,
    TTypeFactoryEntry,
    TTypeMapBase,
} from "../types";
import type { DIScope } from "../DIScope";
import { compareLifecycles, isInstanceTypeEntry } from "../utils";

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
    LifecycleMismatch: (
        dependentType: string,
        dependentLifecycle: TLifecycle,
        dependencyType: string,
        dependencyLifecycle: TLifecycle,
    ) => {
        return (
            `Dependency lifecycle mismatch: The lifecycle '${dependentLifecycle}' of type '${dependentType}' is incompatible with the lifecycle '${dependencyLifecycle}' of its dependency '${dependencyType}'. ` +
            `A '${dependentLifecycle}' cannot depend on a '${dependencyLifecycle}' as this violates lifecycle constraints. ` +
            `Ensure that dependencies do not extend the lifetime of their parent type, and adjust lifecycle configurations to align correctly.`
        );
    },
};

export class InstanceActivator<TypeMap extends TTypeMapBase> {
    private _currentActivationStack: TTypeFactoryEntry<
        TypeMap,
        keyof TypeMap
    >[] = [];

    public createInstance<Key extends keyof TypeMap>(
        entry: TTypeEntry<TypeMap, Key>,
        scope: DIScope<TypeMap>,
    ): TypeMap[Key] {
        if (isInstanceTypeEntry(entry)) return entry.instance;

        this.validateDependencyLifecycle(entry);

        const entryType = entry.type.toString();
        const hasDependencyCycle = this._currentActivationStack.includes(entry);
        this._currentActivationStack.push(entry);
        if (hasDependencyCycle) {
            const error = new Error(
                Errors.DependenciesCycle(
                    entryType,
                    this._currentActivationStack.map((it) =>
                        it.type.toString(),
                    ),
                ),
            );
            this._currentActivationStack.length = 0;
            throw error;
        }

        const instance = entry.factory(scope, scope.nest);
        this._currentActivationStack.pop();
        return instance;
    }

    private validateDependencyLifecycle(
        factoryEntry: TTypeFactoryEntry<TypeMap, keyof TypeMap>,
    ): void {
        if (this._currentActivationStack.length <= 0) return;

        const lastActivatedEntry =
            this._currentActivationStack[
                this._currentActivationStack.length - 1
            ];

        if (
            compareLifecycles(
                lastActivatedEntry.lifecycle,
                factoryEntry.lifecycle,
            ) > 0 // singleton -> lazy
        ) {
            throw new Error(
                Errors.LifecycleMismatch(
                    lastActivatedEntry.type.toString(),
                    lastActivatedEntry.lifecycle,
                    factoryEntry.type.toString(),
                    factoryEntry.lifecycle,
                ),
            );
        }
    }
}
