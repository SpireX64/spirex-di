import type {
    TLifecycle,
    TTypesBindingResolveStrategy,
    TScopeOptions,
    TBindingRef,
    AnyTypeMap,
} from "@spirex/di";

import type { Node } from "estree";

/** Binding reference reused from @spirex/di, specialized for string keys */
export type DIBindingRef = TBindingRef<AnyTypeMap, string>;

export type SourceLocation = { line: number; column: number };

/** Binding kind — mirrors the bind* method that created it */
export type DIBindingKind = "instance" | "factory" | "safeFactory" | "alias";

/** Resolution method name */
export type DIResolveMethod =
    | "get"
    | "maybe"
    | "getAll"
    | "providerOf"
    | "phantomOf";

/** Source package of a resolution call */
export type DIResolveSource =
    | "di"
    | "di-react"
    | "di-svelte"
    | "di-angular-bridge";

/** Dependency discovered inside a factory callback via resolver parameter calls */
export interface DIResolverDependency {
    readonly ref: DIBindingRef;
    readonly method: DIResolveMethod;
    readonly optional: boolean;
    readonly loc: SourceLocation;
}

export interface DIBinding {
    readonly ref: DIBindingRef;
    readonly kind: DIBindingKind;
    readonly lifecycle?: TLifecycle;
    readonly ifConflict?: TTypesBindingResolveStrategy;
    readonly moduleId?: string;
    readonly internal?: boolean;
    readonly allowedScopes?: string[];
    readonly withScope?: TScopeOptions | boolean;
    readonly dependencies: readonly DIBindingRef[];
    readonly resolverDeps?: readonly DIResolverDependency[];
    readonly aliasOrigin?: DIBindingRef;
    readonly hasMeta?: boolean;
    readonly conditional?: boolean;
    readonly loc: SourceLocation;
    readonly node: Node;
}

export interface DIResolution {
    readonly ref: DIBindingRef;
    readonly method: DIResolveMethod;
    readonly source: DIResolveSource;
    readonly loc: SourceLocation;
    readonly node: Node;
}

export interface DIModuleDefinition {
    readonly id: string;
    readonly kind: "static" | "compose" | "dynamic";
    readonly bindings: readonly DIBinding[];
    readonly includes: readonly string[];
    readonly variableName?: string;
    readonly loc: SourceLocation;
}

export interface DIBuilderContext {
    readonly bindings: readonly DIBinding[];
    readonly modules: readonly string[];
    readonly requiredTypes: readonly DIBindingRef[];
    readonly middlewares: readonly string[];
    readonly defaultLifecycle: TLifecycle;
    readonly defaultConflict: TTypesBindingResolveStrategy;
    readonly hasBuild: boolean;
    readonly loc: SourceLocation;
}

export interface DIFileModel {
    readonly file: string;
    readonly imports: readonly DIImportInfo[];
    readonly builders: readonly DIBuilderContext[];
    readonly modules: readonly DIModuleDefinition[];
    readonly resolutions: readonly DIResolution[];
}

export interface DIImportInfo {
    readonly source: string;
    readonly specifiers: readonly string[];
}

export function makeBindingRef(
    type: string,
    name?: string,
): DIBindingRef {
    return { type, name } as DIBindingRef;
}

export function bindingRefId(ref: DIBindingRef): string {
    return ref.name ? `${ref.type}$${ref.name}` : ref.type;
}

export function bindingRefsEqual(a: DIBindingRef, b: DIBindingRef): boolean {
    return a.type === b.type && a.name === b.name;
}
