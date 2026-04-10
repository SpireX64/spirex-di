import type { Node, CallExpression, Program } from "estree";
import type { TLifecycle, TTypesBindingResolveStrategy } from "@spirex/di";

import type {
    DIFileModel,
    DIBuilderContext,
    DIModuleDefinition,
    DIBinding,
    DIResolution,
    DIImportInfo,
    DIBindingRef,
    DIResolverDependency,
    SourceLocation,
    DIResolveMethod,
    DIResolveSource,
} from "./types.js";

import { makeBindingRef } from "./types.js";

import {
    isDIBuilderCall,
    extractBuilderOptions,
    isBindFactoryCall,
    isBindInstanceCall,
    isBindSafeFactoryCall,
    isBindAliasCall,
    isRequireTypeCall,
    isBuildCall,
    isStaticModuleCreate,
    isStaticModuleCompose,
    isDynamicModuleCreate,
    extractModuleId,
    isResolveCall,
    getResolveMethodName,
    isUseInjectCall,
    isWithInjectCall,
    isSetDIScopeCall,
    extractStringToken,
    extractBindingOptions,
    extractAliasOptions,
    extractInjectorDeps,
    isIncludeCall,
    isUseCall,
    isWhenCall,
    isFactoryOfCall,
    extractFactoryOfDeps,
    collectFactoryResolverDeps,
} from "./patterns.js";

function locOf(node: Node): SourceLocation {
    return {
        line: node.loc?.start.line ?? 0,
        column: node.loc?.start.column ?? 0,
    };
}

/**
 * For a member-call like `obj.method(...)`, returns the loc of `.method` —
 * the actual method name, not the start of the full chain.
 * Falls back to the CallExpression's own loc.
 */
function methodLocOf(call: CallExpression): SourceLocation {
    if (
        call.callee.type === "MemberExpression" &&
        (call.callee as { property: Node }).property.loc
    ) {
        return locOf((call.callee as { property: Node }).property);
    }
    return locOf(call as Node);
}

function detectSource(imports: readonly DIImportInfo[]): DIResolveSource {
    for (const imp of imports) {
        if (imp.source === "@spirex/di-react") return "di-react";
        if (imp.source === "@spirex/di-svelte") return "di-svelte";
        if (imp.source === "@spirex/di-angular-bridge")
            return "di-angular-bridge";
    }
    return "di";
}

interface MutableBuilderContext {
    bindings: DIBinding[];
    modules: string[];
    requiredTypes: DIBindingRef[];
    middlewares: string[];
    defaultLifecycle: TLifecycle;
    defaultConflict: TTypesBindingResolveStrategy;
    hasBuild: boolean;
    loc: SourceLocation;
    conditional: boolean;
}

function createMutableBuilder(
    node: Node,
    lifecycle: TLifecycle = "singleton",
    conflict: TTypesBindingResolveStrategy = "throw",
): MutableBuilderContext {
    return {
        bindings: [],
        modules: [],
        requiredTypes: [],
        middlewares: [],
        defaultLifecycle: lifecycle,
        defaultConflict: conflict,
        hasBuild: false,
        loc: locOf(node),
        conditional: false,
    };
}

function processBindFactory(
    call: CallExpression,
    builder: MutableBuilderContext,
    moduleId?: string,
): void {
    const token = extractStringToken(call);
    if (!token) return;

    const opts = extractBindingOptions(call, 2);
    const deps: DIBindingRef[] = [];
    let resolverDeps: DIResolverDependency[] | undefined;

    const factoryArg = call.arguments[1];
    if (factoryArg) {
        if (factoryArg.type === "CallExpression") {
            const factoryCall = factoryArg as CallExpression;
            if (isFactoryOfCall(factoryCall)) {
                const fDeps = extractFactoryOfDeps(factoryCall);
                if (fDeps) deps.push(...fDeps);
            }
        }

        if (
            factoryArg.type === "ArrowFunctionExpression" ||
            factoryArg.type === "FunctionExpression"
        ) {
            const fn = factoryArg as { params: Node[]; body: Node };
            if (fn.params.length > 0 && fn.params[0].type === "Identifier") {
                const resolverParam = (fn.params[0] as { name: string }).name;
                const collected = collectFactoryResolverDeps(
                    fn.body as Node,
                    resolverParam,
                );
                if (collected.length > 0) {
                    resolverDeps = collected;
                    for (const rd of collected) {
                        deps.push(rd.ref);
                    }
                }
            }
        }
    }

    builder.bindings.push({
        ref: makeBindingRef(token, opts.name),
        kind: "factory",
        lifecycle: opts.lifecycle ?? builder.defaultLifecycle,
        ifConflict: opts.ifConflict ?? builder.defaultConflict,
        moduleId,
        internal: opts.internal,
        allowedScopes: opts.allowedScopes,
        withScope: opts.withScope,
        dependencies: deps,
        resolverDeps,
        hasMeta: opts.hasMeta,
        conditional: builder.conditional || undefined,
        loc: methodLocOf(call),
        node: call as Node,
    });
}

function processBindInstance(
    call: CallExpression,
    builder: MutableBuilderContext,
    moduleId?: string,
): void {
    const token = extractStringToken(call);
    if (!token) return;

    const opts = extractBindingOptions(call, 2);

    builder.bindings.push({
        ref: makeBindingRef(token, opts.name),
        kind: "instance",
        ifConflict: opts.ifConflict ?? builder.defaultConflict,
        moduleId,
        internal: opts.internal,
        allowedScopes: opts.allowedScopes,
        dependencies: [],
        hasMeta: opts.hasMeta,
        conditional: builder.conditional || undefined,
        loc: methodLocOf(call),
        node: call as Node,
    });
}

function processBindSafeFactory(
    call: CallExpression,
    builder: MutableBuilderContext,
    moduleId?: string,
): void {
    const token = extractStringToken(call);
    if (!token) return;

    const opts = extractBindingOptions(call, 3);
    const deps: DIBindingRef[] = [];
    let resolverDeps: DIResolverDependency[] | undefined;

    const injectorArg = call.arguments[1];
    if (injectorArg) {
        deps.push(...extractInjectorDeps(injectorArg as Node));
    }

    const factoryArg = call.arguments[2];
    if (
        factoryArg &&
        (factoryArg.type === "ArrowFunctionExpression" ||
            factoryArg.type === "FunctionExpression")
    ) {
        const fn = factoryArg as { params: Node[]; body: Node };
        if (fn.params.length > 0 && fn.params[0].type === "Identifier") {
            const resolverParam = (fn.params[0] as { name: string }).name;
            const collected = collectFactoryResolverDeps(
                fn.body as Node,
                resolverParam,
            );
            if (collected.length > 0) {
                resolverDeps = collected;
                for (const rd of collected) {
                    deps.push(rd.ref);
                }
            }
        }
    }

    builder.bindings.push({
        ref: makeBindingRef(token, opts.name),
        kind: "safeFactory",
        lifecycle: opts.lifecycle ?? builder.defaultLifecycle,
        ifConflict: opts.ifConflict ?? builder.defaultConflict,
        moduleId,
        internal: opts.internal,
        allowedScopes: opts.allowedScopes,
        withScope: opts.withScope,
        dependencies: deps,
        resolverDeps,
        hasMeta: opts.hasMeta,
        conditional: builder.conditional || undefined,
        loc: methodLocOf(call),
        node: call as Node,
    });
}

function processBindAlias(
    call: CallExpression,
    builder: MutableBuilderContext,
    moduleId?: string,
): void {
    const aliasToken = extractStringToken(call, 0);
    const originToken = extractStringToken(call, 1);
    if (!aliasToken || !originToken) return;

    const opts = extractAliasOptions(call);

    builder.bindings.push({
        ref: makeBindingRef(aliasToken, opts.name),
        kind: "alias",
        ifConflict: opts.ifConflict ?? builder.defaultConflict,
        aliasOrigin: makeBindingRef(originToken, opts.originName),
        moduleId,
        dependencies: [],
        conditional: builder.conditional || undefined,
        loc: methodLocOf(call),
        node: call as Node,
    });
}

function processBuilderCall(
    call: CallExpression,
    builder: MutableBuilderContext,
    moduleId?: string,
): void {
    if (isBindFactoryCall(call)) {
        processBindFactory(call, builder, moduleId);
    } else if (isBindInstanceCall(call)) {
        processBindInstance(call, builder, moduleId);
    } else if (isBindSafeFactoryCall(call)) {
        processBindSafeFactory(call, builder, moduleId);
    } else if (isBindAliasCall(call)) {
        processBindAlias(call, builder, moduleId);
    } else if (isRequireTypeCall(call)) {
        const token = extractStringToken(call);
        const name = extractStringToken(call, 1);
        if (token)
            builder.requiredTypes.push(
                makeBindingRef(token, name ?? undefined),
            );
    } else if (isIncludeCall(call)) {
        const arg = call.arguments[0];
        if (arg && arg.type === "Identifier") {
            builder.modules.push((arg as { name: string }).name);
        }
    } else if (isUseCall(call)) {
        const arg = call.arguments[0];
        if (arg && arg.type === "Identifier") {
            builder.middlewares.push((arg as { name: string }).name);
        }
    } else if (isBuildCall(call)) {
        builder.hasBuild = true;
    }
}

function walkNode(
    node: Node,
    visitor: (node: Node) => void,
): void {
    visitor(node);
    for (const key of Object.keys(node)) {
        if (key === "type" || key === "loc" || key === "range") continue;
        const val = (node as unknown as Record<string, unknown>)[key];
        if (val && typeof val === "object") {
            if (Array.isArray(val)) {
                for (const item of val) {
                    if (item && typeof item === "object" && "type" in item) {
                        walkNode(item as Node, visitor);
                    }
                }
            } else if ("type" in val) {
                walkNode(val as Node, visitor);
            }
        }
    }
}

function getChainRoot(node: Node): Node {
    if (node.type === "CallExpression") {
        const call = node as CallExpression;
        if (call.callee.type === "MemberExpression") {
            return getChainRoot(call.callee.object as Node);
        }
    }
    return node;
}

function collectCallsOnParam(
    body: Node,
    paramName: string,
    builder: MutableBuilderContext,
    moduleId?: string,
): void {
    walkNode(body, (node) => {
        if (node.type !== "CallExpression") return;
        const call = node as CallExpression;
        if (call.callee.type !== "MemberExpression") return;
        const root = getChainRoot(call as Node);
        if (
            root.type === "Identifier" &&
            (root as { name: string }).name === paramName
        ) {
            processBuilderCall(call, builder, moduleId);
        }
    });
}

function getDelegateParamName(
    node: Node,
): string | null {
    if (
        node.type === "ArrowFunctionExpression" ||
        node.type === "FunctionExpression"
    ) {
        const fn = node as { params: Node[] };
        if (fn.params.length > 0 && fn.params[0].type === "Identifier") {
            return (fn.params[0] as { name: string }).name;
        }
    }
    return null;
}

interface MutableModuleDefinition {
    id: string;
    kind: "static" | "compose" | "dynamic";
    bindings: DIBinding[];
    includes: string[];
    variableName?: string;
    loc: SourceLocation;
}

export function collectFileModel(
    ast: Program,
    filePath: string,
): DIFileModel {
    const imports: DIImportInfo[] = [];
    const builders: MutableBuilderContext[] = [];
    const modules: MutableModuleDefinition[] = [];
    const resolutions: DIResolution[] = [];

    const builderVarMap = new Map<string, MutableBuilderContext>();

    // First pass: collect imports
    for (const stmt of ast.body) {
        if (stmt.type === "ImportDeclaration") {
            const source =
                typeof stmt.source.value === "string"
                    ? stmt.source.value
                    : "";
            if (source.startsWith("@spirex/di")) {
                const specifiers: string[] = [];
                for (const spec of stmt.specifiers) {
                    if (spec.type === "ImportSpecifier" && spec.imported.type === "Identifier") {
                        specifiers.push(spec.imported.name);
                    } else if (spec.type === "ImportDefaultSpecifier") {
                        specifiers.push("default");
                    } else if (spec.type === "ImportNamespaceSpecifier") {
                        specifiers.push("*");
                    }
                }
                imports.push({ source, specifiers });
            }
        }
    }

    if (imports.length === 0) {
        return { file: filePath, imports, builders: [], modules: [], resolutions: [] };
    }

    const resolveSource = detectSource(imports);

    walkNode(ast as unknown as Node, (node) => {
        if (node.type !== "CallExpression") return;
        const call = node as CallExpression;

        // diBuilder() calls
        if (isDIBuilderCall(call)) {
            const opts = extractBuilderOptions(call);
            const builder = createMutableBuilder(
                call as Node,
                opts.lifecycle ?? "singleton",
                opts.ifConflict ?? "throw",
            );
            builders.push(builder);

            // Check if assigned to variable: const b = diBuilder()
            // This is handled by parent node inspection -- for now we track
            // fluent chains by walking the CallExpression chain upward.
            return;
        }

        // Module definitions
        if (isStaticModuleCreate(call)) {
            const id = extractModuleId(call);
            if (!id) return;

            const moduleBuilder = createMutableBuilder(call as Node);
            const delegate = call.arguments[0];
            if (delegate) {
                const paramName = getDelegateParamName(delegate as Node);
                if (paramName) {
                    collectCallsOnParam(
                        delegate as Node,
                        paramName,
                        moduleBuilder,
                        id,
                    );
                }
            }

            modules.push({
                id,
                kind: "static",
                bindings: moduleBuilder.bindings,
                includes: moduleBuilder.modules,
                loc: locOf(call as Node),
            });
            return;
        }

        if (isStaticModuleCompose(call)) {
            const id = extractModuleId(call);
            if (!id) return;

            const includes: string[] = [];
            for (const arg of call.arguments) {
                if (
                    (arg as Node).type === "Identifier"
                ) {
                    includes.push((arg as { name: string }).name);
                }
            }

            modules.push({
                id,
                kind: "compose",
                bindings: [],
                includes,
                loc: locOf(call as Node),
            });
            return;
        }

        if (isDynamicModuleCreate(call)) {
            const id = extractModuleId(call);
            if (!id) return;

            const moduleBuilder = createMutableBuilder(call as Node);
            const delegate = call.arguments[0];
            if (delegate) {
                const paramName = getDelegateParamName(delegate as Node);
                if (paramName) {
                    collectCallsOnParam(
                        delegate as Node,
                        paramName,
                        moduleBuilder,
                        id,
                    );
                }
            }

            modules.push({
                id,
                kind: "dynamic",
                bindings: moduleBuilder.bindings,
                includes: moduleBuilder.modules,
                loc: locOf(call as Node),
            });
            return;
        }

        // Resolution calls: scope.get(), scope.maybe(), etc.
        if (isResolveCall(call)) {
            const method = getResolveMethodName(call);
            const token = extractStringToken(call);
            if (method && token) {
                const name = extractStringToken(call, 1);
                resolutions.push({
                    ref: makeBindingRef(token, name ?? undefined),
                    method: method as DIResolveMethod,
                    source: "di",
                    loc: locOf(call as Node),
                    node: call as Node,
                });
            }
            return;
        }

        // Framework integration: useInject("token")
        if (isUseInjectCall(call)) {
            const firstArg = call.arguments[0];
            if (firstArg && firstArg.type === "Literal") {
                const token = extractStringToken(call);
                if (token) {
                    const name = extractStringToken(call, 1);
                    resolutions.push({
                        ref: makeBindingRef(token, name ?? undefined),
                        method: "get",
                        source: resolveSource,
                        loc: locOf(call as Node),
                        node: call as Node,
                    });
                }
            }
            return;
        }

        // Builder chain member calls
        if (
            call.callee.type === "MemberExpression" &&
            call.callee.object.type === "CallExpression"
        ) {
            // Fluent chain: check if this is a bind/build call on a builder chain
            let chainBuilder: MutableBuilderContext | undefined;

            // Walk down the chain to find the root diBuilder() call
            let current: Node = call as Node;
            while (
                current.type === "CallExpression" &&
                (current as CallExpression).callee.type ===
                    "MemberExpression" &&
                ((current as CallExpression).callee as { object: Node })
                    .object.type === "CallExpression"
            ) {
                current = (
                    (current as CallExpression).callee as { object: Node }
                ).object;
            }

            if (
                current.type === "CallExpression" &&
                isDIBuilderCall(current as CallExpression)
            ) {
                const rootLoc = locOf(current);
                chainBuilder = builders.find(
                    (b) =>
                        b.loc.line === rootLoc.line &&
                        b.loc.column === rootLoc.column,
                );
                if (!chainBuilder) {
                    const opts = extractBuilderOptions(
                        current as CallExpression,
                    );
                    chainBuilder = createMutableBuilder(
                        current,
                        opts.lifecycle ?? "singleton",
                        opts.ifConflict ?? "throw",
                    );
                    builders.push(chainBuilder);
                }
                processBuilderCall(call, chainBuilder);
            }
        }

        // Variable-based builder calls: b.bindFactory(...)
        if (
            call.callee.type === "MemberExpression" &&
            call.callee.object.type === "Identifier"
        ) {
            const varName = (call.callee.object as { name: string }).name;
            const builder = builderVarMap.get(varName);
            if (builder) {
                processBuilderCall(call, builder);
            }
        }
    });

    // Second pass: detect variable assignments of diBuilder()
    walkNode(ast as unknown as Node, (node) => {
        if (node.type === "VariableDeclaration") {
            const decl = node as {
                declarations: Array<{
                    id: Node;
                    init: Node | null;
                }>;
            };
            for (const d of decl.declarations) {
                if (
                    d.init &&
                    d.id.type === "Identifier" &&
                    d.init.type === "CallExpression" &&
                    isDIBuilderCall(d.init as CallExpression)
                ) {
                    const varName = (d.id as { name: string }).name;
                    const existingBuilder = builders.find(
                        (b) =>
                            b.loc.line ===
                                (d.init!.loc?.start.line ?? 0) &&
                            b.loc.column ===
                                (d.init!.loc?.start.column ?? 0),
                    );
                    if (existingBuilder) {
                        builderVarMap.set(varName, existingBuilder);
                    }
                }
            }
        }
    });

    // Third pass: collect variable-based builder method calls
    walkNode(ast as unknown as Node, (node) => {
        if (node.type !== "CallExpression") return;
        const call = node as CallExpression;
        if (call.callee.type !== "MemberExpression") return;
        const root = getChainRoot(call as Node);
        if (root.type === "Identifier") {
            const varName = (root as { name: string }).name;
            const builder = builderVarMap.get(varName);
            if (builder) {
                processBuilderCall(call, builder);
            }
        }
    });

    // Fourth pass: detect variable assignments of module definitions
    walkNode(ast as unknown as Node, (node) => {
        if (node.type !== "VariableDeclaration") return;
        const decl = node as {
            declarations: Array<{
                id: Node;
                init: Node | null;
            }>;
        };
        for (const d of decl.declarations) {
            if (
                !d.init ||
                d.id.type !== "Identifier" ||
                d.init.type !== "CallExpression"
            ) continue;
            const call = d.init as CallExpression;
            if (
                isStaticModuleCreate(call) ||
                isStaticModuleCompose(call) ||
                isDynamicModuleCreate(call)
            ) {
                const varName = (d.id as { name: string }).name;
                const initLoc = locOf(d.init);
                const mod = modules.find(
                    (m) =>
                        m.loc.line === initLoc.line &&
                        m.loc.column === initLoc.column,
                );
                if (mod) {
                    mod.variableName = varName;
                }
            }
        }
    });

    return {
        file: filePath,
        imports,
        builders: builders.map((b) => ({
            bindings: b.bindings,
            modules: b.modules,
            requiredTypes: b.requiredTypes,
            middlewares: b.middlewares,
            defaultLifecycle: b.defaultLifecycle,
            defaultConflict: b.defaultConflict,
            hasBuild: b.hasBuild,
            loc: b.loc,
        })),
        modules,
        resolutions,
    };
}
