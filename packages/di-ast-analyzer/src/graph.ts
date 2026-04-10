import type { DIBinding, DIBindingRef, DIResolution } from "./types.js";
import { bindingRefId, bindingRefsEqual } from "./types.js";

export interface CycleResult {
    readonly cycle: readonly DIBindingRef[];
}

export interface ConflictResult {
    readonly ref: DIBindingRef;
    readonly bindings: readonly DIBinding[];
}

export interface LifecycleMismatchResult {
    readonly ref: DIBindingRef;
    readonly bindings: readonly DIBinding[];
    readonly lifecycles: readonly string[];
}

export interface DanglingAliasResult {
    readonly alias: DIBinding;
    readonly missingOrigin: DIBindingRef;
}

export interface UnresolvedResult {
    readonly resolution: DIResolution;
}

export interface UnusedResult {
    readonly binding: DIBinding;
}

export interface MissingRequiredResult {
    readonly ref: DIBindingRef;
}

// -- Dependency cycle detection (Tarjan's SCC) ------------------------------

export function findDependencyCycles(
    bindings: readonly DIBinding[],
): CycleResult[] {
    const results: CycleResult[] = [];
    const adjMap = new Map<string, DIBindingRef[]>();

    for (const b of bindings) {
        const id = bindingRefId(b.ref);
        if (!adjMap.has(id)) adjMap.set(id, []);
        for (const dep of b.dependencies) {
            adjMap.get(id)!.push(dep);
        }
    }

    let index = 0;
    const indices = new Map<string, number>();
    const lowlinks = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const refMap = new Map<string, DIBindingRef>();

    for (const b of bindings) {
        refMap.set(bindingRefId(b.ref), b.ref);
        for (const d of b.dependencies) {
            refMap.set(bindingRefId(d), d);
        }
    }

    function strongconnect(id: string): void {
        indices.set(id, index);
        lowlinks.set(id, index);
        index++;
        stack.push(id);
        onStack.add(id);

        const neighbors = adjMap.get(id) ?? [];
        for (const dep of neighbors) {
            const depId = bindingRefId(dep);
            if (!indices.has(depId)) {
                strongconnect(depId);
                lowlinks.set(
                    id,
                    Math.min(lowlinks.get(id)!, lowlinks.get(depId)!),
                );
            } else if (onStack.has(depId)) {
                lowlinks.set(
                    id,
                    Math.min(lowlinks.get(id)!, indices.get(depId)!),
                );
            }
        }

        if (lowlinks.get(id) === indices.get(id)) {
            const component: DIBindingRef[] = [];
            let w: string;
            do {
                w = stack.pop()!;
                onStack.delete(w);
                const ref = refMap.get(w);
                if (ref) component.push(ref);
            } while (w !== id);

            if (component.length > 1) {
                results.push({ cycle: component.reverse() });
            }
        }
    }

    for (const id of adjMap.keys()) {
        if (!indices.has(id)) {
            strongconnect(id);
        }
    }

    return results;
}

// -- Alias cycle detection --------------------------------------------------

export function findAliasCycles(
    bindings: readonly DIBinding[],
): CycleResult[] {
    const results: CycleResult[] = [];
    const aliases = bindings.filter((b) => b.kind === "alias" && b.aliasOrigin);

    const aliasMap = new Map<string, DIBindingRef>();
    for (const a of aliases) {
        aliasMap.set(bindingRefId(a.ref), a.aliasOrigin!);
    }

    const visited = new Set<string>();

    for (const a of aliases) {
        const startId = bindingRefId(a.ref);
        if (visited.has(startId)) continue;

        const path: string[] = [];
        const pathSet = new Set<string>();
        let current: string | undefined = startId;

        while (current && !visited.has(current)) {
            if (pathSet.has(current)) {
                const cycleStart = path.indexOf(current);
                const cyclePath = path.slice(cycleStart);
                cyclePath.push(current);
                const cycleRefs: DIBindingRef[] = [];
                for (const id of cyclePath) {
                    const binding = aliases.find(
                        (b) => bindingRefId(b.ref) === id,
                    );
                    if (binding) cycleRefs.push(binding.ref);
                }
                if (cycleRefs.length > 1) {
                    results.push({ cycle: cycleRefs });
                }
                break;
            }

            path.push(current);
            pathSet.add(current);
            const origin = aliasMap.get(current);
            current = origin ? bindingRefId(origin) : undefined;
        }

        for (const id of path) visited.add(id);
    }

    return results;
}

// -- Binding conflict detection ---------------------------------------------

export function findConflicts(
    bindings: readonly DIBinding[],
): ConflictResult[] {
    const results: ConflictResult[] = [];
    const groups = new Map<string, DIBinding[]>();

    for (const b of bindings) {
        if (b.kind === "alias") continue;
        const id = bindingRefId(b.ref);
        if (!groups.has(id)) groups.set(id, []);
        groups.get(id)!.push(b);
    }

    for (const [, group] of groups) {
        if (group.length < 2) continue;

        const hasConflict = group.some(
            (b) => !b.ifConflict || b.ifConflict === "throw",
        );
        if (hasConflict) {
            results.push({ ref: group[0].ref, bindings: group });
        }
    }

    return results;
}

// -- Lifecycle mismatch detection -------------------------------------------

export function findLifecycleMismatches(
    bindings: readonly DIBinding[],
): LifecycleMismatchResult[] {
    const results: LifecycleMismatchResult[] = [];
    const groups = new Map<string, DIBinding[]>();

    for (const b of bindings) {
        if (b.kind === "alias" || b.kind === "instance") continue;
        if (b.ifConflict !== "append") continue;
        const id = bindingRefId(b.ref);
        if (!groups.has(id)) groups.set(id, []);
        groups.get(id)!.push(b);
    }

    for (const [, group] of groups) {
        if (group.length < 2) continue;

        const lifecycles = new Set(
            group.map((b) => b.lifecycle).filter(Boolean) as string[],
        );
        if (lifecycles.size > 1) {
            results.push({
                ref: group[0].ref,
                bindings: group,
                lifecycles: [...lifecycles],
            });
        }
    }

    return results;
}

// -- Dangling alias detection -----------------------------------------------

export function findDanglingAliases(
    bindings: readonly DIBinding[],
): DanglingAliasResult[] {
    const results: DanglingAliasResult[] = [];
    const boundIds = new Set<string>();

    for (const b of bindings) {
        boundIds.add(bindingRefId(b.ref));
    }

    for (const b of bindings) {
        if (b.kind !== "alias" || !b.aliasOrigin) continue;
        const originId = bindingRefId(b.aliasOrigin);
        if (!boundIds.has(originId)) {
            results.push({ alias: b, missingOrigin: b.aliasOrigin });
        }
    }

    return results;
}

// -- Unresolved token detection ---------------------------------------------

export function findUnresolved(
    resolutions: readonly DIResolution[],
    bindings: readonly DIBinding[],
): UnresolvedResult[] {
    const results: UnresolvedResult[] = [];
    const boundIds = new Set<string>();

    for (const b of bindings) {
        boundIds.add(bindingRefId(b.ref));
    }

    for (const r of resolutions) {
        if (r.method === "maybe") continue;
        const id = bindingRefId(r.ref);
        if (!boundIds.has(id)) {
            results.push({ resolution: r });
        }
    }

    return results;
}

// -- Unused binding detection -----------------------------------------------

export function findUnused(
    bindings: readonly DIBinding[],
    resolutions: readonly DIResolution[],
): UnusedResult[] {
    const results: UnusedResult[] = [];
    const usedIds = new Set<string>();

    for (const r of resolutions) {
        usedIds.add(bindingRefId(r.ref));
    }

    // Also count alias origins and dependencies as "used"
    for (const b of bindings) {
        if (b.aliasOrigin) usedIds.add(bindingRefId(b.aliasOrigin));
        for (const dep of b.dependencies) {
            usedIds.add(bindingRefId(dep));
        }
    }

    for (const b of bindings) {
        if (b.internal) continue;
        const id = bindingRefId(b.ref);
        if (!usedIds.has(id)) {
            results.push({ binding: b });
        }
    }

    return results;
}

// -- Missing required types -------------------------------------------------

export function findMissingRequired(
    requiredTypes: readonly DIBindingRef[],
    bindings: readonly DIBinding[],
): MissingRequiredResult[] {
    const results: MissingRequiredResult[] = [];
    const boundIds = new Set<string>();

    for (const b of bindings) {
        boundIds.add(bindingRefId(b.ref));
    }

    for (const req of requiredTypes) {
        if (!boundIds.has(bindingRefId(req))) {
            results.push({ ref: req });
        }
    }

    return results;
}
