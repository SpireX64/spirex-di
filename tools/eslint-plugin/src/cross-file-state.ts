import type { DIBinding, DIResolution, DIBindingRef } from "@spirex/di-ast-analyzer";
import { bindingRefId, makeBindingRef } from "@spirex/di-ast-analyzer";

export interface FileBindings {
    bindings: DIBinding[];
    resolutions: DIResolution[];
}

/**
 * Shared state for cross-file analysis.
 * Rules accumulate bindings/resolutions from each file, then at a
 * post-processing stage, rules can query the aggregated data.
 *
 * Since ESLint 9 flat config doesn't natively support cross-file shared state,
 * this module provides a singleton registry that rules can import.
 * A separate "check" rule (`no-unresolved-token`, `no-unused-binding`)
 * is responsible for reporting after all files have been linted.
 *
 * Limitation: relies on ESLint linting all files in a single run.
 */
class CrossFileRegistry {
    private bindingsByFile = new Map<string, DIBinding[]>();
    private resolutionsByFile = new Map<string, DIResolution[]>();

    registerBindings(file: string, bindings: DIBinding[]): void {
        this.bindingsByFile.set(file, bindings);
    }

    registerResolutions(file: string, resolutions: DIResolution[]): void {
        this.resolutionsByFile.set(file, resolutions);
    }

    getAllBindings(): DIBinding[] {
        const all: DIBinding[] = [];
        for (const bindings of this.bindingsByFile.values()) {
            all.push(...bindings);
        }
        return all;
    }

    getAllResolutions(): DIResolution[] {
        const all: DIResolution[] = [];
        for (const resolutions of this.resolutionsByFile.values()) {
            all.push(...resolutions);
        }
        return all;
    }

    getAllBoundIds(): Set<string> {
        const ids = new Set<string>();
        for (const bindings of this.bindingsByFile.values()) {
            for (const b of bindings) {
                ids.add(bindingRefId(b.ref));
            }
        }
        return ids;
    }

    clear(): void {
        this.bindingsByFile.clear();
        this.resolutionsByFile.clear();
    }
}

export const crossFileRegistry = new CrossFileRegistry();
