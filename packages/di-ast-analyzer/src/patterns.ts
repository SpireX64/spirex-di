import type {
    Node,
    CallExpression,
    MemberExpression,
    Identifier,
    Literal,
    Property,
    ObjectExpression,
    SpreadElement,
    ArrayExpression,
    ArrowFunctionExpression,
    FunctionExpression,
    AssignmentExpression,
    ExpressionStatement,
} from "estree";

import type { TLifecycle, TTypesBindingResolveStrategy } from "@spirex/di";
import type { DIBindingRef, DIResolverDependency, DIResolveMethod, SourceLocation } from "./types.js";
import { makeBindingRef } from "./types.js";

// -- Helpers ----------------------------------------------------------------

function isIdentifier(node: Node | null | undefined): node is Identifier {
    return node != null && node.type === "Identifier";
}

function isLiteral(node: Node | null | undefined): node is Literal {
    return node != null && node.type === "Literal";
}

function isCallExpression(
    node: Node | null | undefined,
): node is CallExpression {
    return node != null && node.type === "CallExpression";
}

function isMemberExpression(
    node: Node | null | undefined,
): node is MemberExpression {
    return node != null && node.type === "MemberExpression";
}

function isObjectExpression(
    node: Node | null | undefined,
): node is ObjectExpression {
    return node != null && node.type === "ObjectExpression";
}

function isArrayExpression(
    node: Node | null | undefined,
): node is ArrayExpression {
    return node != null && node.type === "ArrayExpression";
}

function getCalleeName(node: CallExpression): string | null {
    if (isIdentifier(node.callee)) return node.callee.name;
    return null;
}

function getMemberCallName(node: CallExpression): string | null {
    if (
        isMemberExpression(node.callee) &&
        !node.callee.computed &&
        isIdentifier(node.callee.property)
    ) {
        return node.callee.property.name;
    }
    return null;
}

function getMemberCallObject(node: CallExpression): Node | null {
    if (isMemberExpression(node.callee)) {
        return node.callee.object;
    }
    return null;
}

function getStringValue(
    node: Node | SpreadElement | null | undefined,
): string | null {
    if (node == null) return null;
    if (isLiteral(node) && typeof node.value === "string") return node.value;
    return null;
}

function getObjectProperty(
    obj: ObjectExpression,
    key: string,
): Node | undefined {
    for (const prop of obj.properties) {
        if (prop.type !== "Property") continue;
        const p = prop as Property;
        if (isIdentifier(p.key) && p.key.name === key) return p.value as Node;
        if (isLiteral(p.key) && p.key.value === key) return p.value as Node;
    }
    return undefined;
}

// -- Builder creation -------------------------------------------------------

export function isDIBuilderCall(node: CallExpression): boolean {
    return getCalleeName(node) === "diBuilder";
}

export interface BuilderOptions {
    lifecycle?: TLifecycle;
    ifConflict?: TTypesBindingResolveStrategy;
}

export function extractBuilderOptions(
    node: CallExpression,
): BuilderOptions {
    const result: BuilderOptions = {};
    const arg = node.arguments[0];
    if (!isObjectExpression(arg as Node)) return result;
    const obj = arg as unknown as ObjectExpression;

    const lc = getObjectProperty(obj, "lifecycle");
    if (lc) {
        const val = getStringValue(lc);
        if (val) result.lifecycle = val as TLifecycle;
    }

    const ic = getObjectProperty(obj, "ifConflict");
    if (ic) {
        const val = getStringValue(ic);
        if (val) result.ifConflict = val as TTypesBindingResolveStrategy;
    }

    return result;
}

// -- Binding method detection -----------------------------------------------

const BIND_METHODS = new Set([
    "bindFactory",
    "bindInstance",
    "bindSafeFactory",
    "bindAlias",
]);

export function isBindCall(node: CallExpression): boolean {
    const name = getMemberCallName(node);
    return name !== null && BIND_METHODS.has(name);
}

export function isBindFactoryCall(node: CallExpression): boolean {
    return getMemberCallName(node) === "bindFactory";
}

export function isBindInstanceCall(node: CallExpression): boolean {
    return getMemberCallName(node) === "bindInstance";
}

export function isBindSafeFactoryCall(node: CallExpression): boolean {
    return getMemberCallName(node) === "bindSafeFactory";
}

export function isBindAliasCall(node: CallExpression): boolean {
    return getMemberCallName(node) === "bindAlias";
}

export function isRequireTypeCall(node: CallExpression): boolean {
    return getMemberCallName(node) === "requireType";
}

export function isIncludeCall(node: CallExpression): boolean {
    return getMemberCallName(node) === "include";
}

export function isUseCall(node: CallExpression): boolean {
    return getMemberCallName(node) === "use";
}

export function isWhenCall(node: CallExpression): boolean {
    return getMemberCallName(node) === "when";
}

export function isInjectIntoCall(node: CallExpression): boolean {
    return getMemberCallName(node) === "injectInto";
}

export function isBuildCall(node: CallExpression): boolean {
    return getMemberCallName(node) === "build";
}

// -- Module definitions -----------------------------------------------------

export function isStaticModuleCreate(node: CallExpression): boolean {
    const methodName = getMemberCallName(node);
    if (methodName !== "create") return false;
    const obj = getMemberCallObject(node);
    return isCallExpression(obj) && getCalleeName(obj) === "staticModule";
}

export function isStaticModuleCompose(node: CallExpression): boolean {
    const methodName = getMemberCallName(node);
    if (methodName !== "compose") return false;
    const obj = getMemberCallObject(node);
    return isCallExpression(obj) && getCalleeName(obj) === "staticModule";
}

export function isDynamicModuleCreate(node: CallExpression): boolean {
    const methodName = getMemberCallName(node);
    if (methodName !== "create") return false;
    const obj = getMemberCallObject(node);
    return isCallExpression(obj) && getCalleeName(obj) === "dynamicModule";
}

export function extractModuleId(node: CallExpression): string | null {
    const obj = getMemberCallObject(node);
    if (!isCallExpression(obj)) return null;
    return getStringValue(obj.arguments[0] as Node);
}

// -- Factory helpers --------------------------------------------------------

export function isFactoryOfCall(node: CallExpression): boolean {
    return getCalleeName(node) === "factoryOf";
}

export function extractFactoryOfDeps(
    node: CallExpression,
): DIBindingRef[] | null {
    const secondArg = node.arguments[1];
    if (secondArg && isArrayExpression(secondArg as Node)) {
        return extractStringArray(secondArg as unknown as ArrayExpression);
    }
    return null;
}

// -- Resolution methods -----------------------------------------------------

const RESOLVE_METHODS = new Set([
    "get",
    "maybe",
    "getAll",
    "providerOf",
    "phantomOf",
]);

export function isResolveCall(node: CallExpression): boolean {
    const name = getMemberCallName(node);
    return name !== null && RESOLVE_METHODS.has(name);
}

export function getResolveMethodName(node: CallExpression): string | null {
    const name = getMemberCallName(node);
    if (name !== null && RESOLVE_METHODS.has(name)) return name;
    return null;
}

// -- Framework integrations -------------------------------------------------

export function isUseInjectCall(node: CallExpression): boolean {
    return getCalleeName(node) === "useInject";
}

export function isWithInjectCall(node: CallExpression): boolean {
    return getCalleeName(node) === "withInject";
}

export function isSetDIScopeCall(node: CallExpression): boolean {
    return getCalleeName(node) === "setDIScope";
}

export function isSetDIRootScopeCall(node: CallExpression): boolean {
    return getCalleeName(node) === "setDIRootScope";
}

// -- Extractors -------------------------------------------------------------

export function extractStringToken(
    node: CallExpression,
    argIndex: number = 0,
): string | null {
    const arg = node.arguments[argIndex];
    return arg ? getStringValue(arg as Node) : null;
}

export interface BindingOptionsResult {
    name?: string;
    lifecycle?: TLifecycle;
    ifConflict?: TTypesBindingResolveStrategy;
    internal?: boolean;
    allowedScopes?: string[];
    withScope?: boolean;
    hasMeta?: boolean;
}

export function extractBindingOptions(
    node: CallExpression,
    optionsArgIndex: number,
): BindingOptionsResult {
    const result: BindingOptionsResult = {};
    const arg = node.arguments[optionsArgIndex];
    if (!arg || !isObjectExpression(arg as Node)) return result;
    const obj = arg as unknown as ObjectExpression;

    const name = getObjectProperty(obj, "name");
    if (name) result.name = getStringValue(name) ?? undefined;

    const lc = getObjectProperty(obj, "lifecycle");
    if (lc) {
        const val = getStringValue(lc);
        if (val) result.lifecycle = val as TLifecycle;
    }

    const ic = getObjectProperty(obj, "ifConflict");
    if (ic) {
        const val = getStringValue(ic);
        if (val) result.ifConflict = val as TTypesBindingResolveStrategy;
    }

    const internal = getObjectProperty(obj, "internal");
    if (internal && isLiteral(internal) && internal.value === true) {
        result.internal = true;
    }

    const allowedScopes = getObjectProperty(obj, "allowedScopes");
    if (allowedScopes && isArrayExpression(allowedScopes)) {
        const scopes = extractStringArrayValues(allowedScopes);
        if (scopes.length > 0) result.allowedScopes = scopes;
    }

    const withScope = getObjectProperty(obj, "withScope");
    if (withScope) result.withScope = true;

    const meta = getObjectProperty(obj, "meta");
    if (meta) result.hasMeta = true;

    return result;
}

export interface AliasOptionsResult {
    name?: string;
    originName?: string;
    ifConflict?: TTypesBindingResolveStrategy;
}

export function extractAliasOptions(
    node: CallExpression,
): AliasOptionsResult {
    const result: AliasOptionsResult = {};
    const arg = node.arguments[2];
    if (!arg || !isObjectExpression(arg as Node)) return result;
    const obj = arg as unknown as ObjectExpression;

    const name = getObjectProperty(obj, "name");
    if (name) result.name = getStringValue(name) ?? undefined;

    const originName = getObjectProperty(obj, "originName");
    if (originName) result.originName = getStringValue(originName) ?? undefined;

    const ic = getObjectProperty(obj, "ifConflict");
    if (ic) {
        const val = getStringValue(ic);
        if (val) result.ifConflict = val as TTypesBindingResolveStrategy;
    }

    return result;
}

export function extractInjectArray(node: Node): DIBindingRef[] | null {
    if (
        node.type === "ExpressionStatement" &&
        (node as ExpressionStatement).expression.type ===
            "AssignmentExpression"
    ) {
        const assign = (node as ExpressionStatement)
            .expression as AssignmentExpression;
        if (
            isMemberExpression(assign.left) &&
            isIdentifier(assign.left.property) &&
            assign.left.property.name === "inject" &&
            isArrayExpression(assign.right)
        ) {
            return extractStringArray(assign.right);
        }
    }
    return null;
}

export function extractInjectorDeps(
    node: Node,
): DIBindingRef[] {
    const deps: DIBindingRef[] = [];
    collectResolveCallsFromBody(node, deps);
    return deps;
}

// -- Factory resolver dependency collection ---------------------------------

const OPTIONAL_RESOLVE_METHODS = new Set(["maybe", "getAll", "phantomOf"]);

function locOfNode(node: Node): SourceLocation {
    return {
        line: node.loc?.start.line ?? 0,
        column: node.loc?.start.column ?? 0,
    };
}

/**
 * Walk a factory/callback body, collecting resolver calls on a named parameter.
 *
 * Detects patterns like:
 *   (r) => r.get("token")
 *   (r) => r.getAll("token")
 *   (r) => { const x = r.maybe("token"); ... }
 */
export function collectFactoryResolverDeps(
    factoryNode: Node,
    resolverParamName: string,
): DIResolverDependency[] {
    const deps: DIResolverDependency[] = [];
    walkForResolverCalls(factoryNode, resolverParamName, deps);
    return deps;
}

function walkForResolverCalls(
    node: Node,
    paramName: string,
    deps: DIResolverDependency[],
): void {
    if (node.type === "CallExpression") {
        const call = node as CallExpression;
        if (isMemberExpression(call.callee)) {
            const me = call.callee;
            if (
                isIdentifier(me.object) &&
                me.object.name === paramName &&
                !me.computed &&
                isIdentifier(me.property)
            ) {
                const method = me.property.name;
                if (RESOLVE_METHODS.has(method)) {
                    const token = extractStringToken(call);
                    if (token) {
                        const nameArg = getStringValue(call.arguments[1] as Node);
                        deps.push({
                            ref: makeBindingRef(token, nameArg ?? undefined),
                            method: method as DIResolveMethod,
                            optional: OPTIONAL_RESOLVE_METHODS.has(method),
                            loc: locOfNode(call as Node),
                        });
                    }
                }
            }
        }
    }

    for (const key of Object.keys(node)) {
        if (key === "type" || key === "loc" || key === "range") continue;
        const val = (node as unknown as Record<string, unknown>)[key];
        if (val && typeof val === "object") {
            if (Array.isArray(val)) {
                for (const item of val) {
                    if (item && typeof item === "object" && "type" in item) {
                        walkForResolverCalls(item as Node, paramName, deps);
                    }
                }
            } else if ("type" in val) {
                walkForResolverCalls(val as Node, paramName, deps);
            }
        }
    }
}

// -- Internal helpers -------------------------------------------------------

function extractStringArray(arr: ArrayExpression): DIBindingRef[] {
    const result: DIBindingRef[] = [];
    for (const el of arr.elements) {
        const str = getStringValue(el as Node);
        if (str) result.push(makeBindingRef(str));
    }
    return result;
}

function extractStringArrayValues(arr: ArrayExpression): string[] {
    const result: string[] = [];
    for (const el of arr.elements) {
        const str = getStringValue(el as Node);
        if (str) result.push(str);
    }
    return result;
}

function collectResolveCallsFromBody(
    node: Node,
    deps: DIBindingRef[],
): void {
    if (node.type === "CallExpression") {
        const call = node as CallExpression;
        const methodName = getMemberCallName(call);
        if (
            methodName === "get" ||
            methodName === "providerOf" ||
            methodName === "phantomOf"
        ) {
            const token = extractStringToken(call);
            const nameArg = getStringValue(call.arguments[1] as Node);
            if (token) deps.push(makeBindingRef(token, nameArg ?? undefined));
        }
    }

    for (const key of Object.keys(node)) {
        if (key === "type" || key === "loc" || key === "range") continue;
        const val = (node as unknown as Record<string, unknown>)[key];
        if (val && typeof val === "object") {
            if (Array.isArray(val)) {
                for (const item of val) {
                    if (item && typeof item === "object" && "type" in item) {
                        collectResolveCallsFromBody(item as Node, deps);
                    }
                }
            } else if ("type" in val) {
                collectResolveCallsFromBody(val as Node, deps);
            }
        }
    }
}

export type {
    ArrowFunctionExpression,
    FunctionExpression,
    CallExpression,
    MemberExpression,
    Identifier,
    Node,
};
