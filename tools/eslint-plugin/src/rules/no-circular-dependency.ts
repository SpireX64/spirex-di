import type { Rule } from "eslint";
import type { CallExpression, Node, Identifier, ArrayExpression } from "estree";
import {
    isDIBuilderCall,
    isBuildCall,
    isBindFactoryCall,
    isBindSafeFactoryCall,
    extractStringToken,
    extractBindingOptions,
    extractInjectorDeps,
    isFactoryOfCall,
    extractFactoryOfDeps,
    makeBindingRef,
    bindingRefId,
    type DIBinding,
    type DIBindingRef,
} from "@spirex/di-ast-analyzer";
import { findDependencyCycles } from "@spirex/di-ast-analyzer";
import { createRule } from "../utils.js";

function walkChain(node: CallExpression): CallExpression[] {
    const calls: CallExpression[] = [node];
    let current: Node = node;
    while (
        current.type === "CallExpression" &&
        (current as CallExpression).callee?.type === "MemberExpression"
    ) {
        const obj = ((current as CallExpression).callee as { object: Node }).object;
        if (obj.type === "CallExpression") {
            calls.push(obj as CallExpression);
            current = obj;
        } else {
            break;
        }
    }
    return calls;
}

const rule: Rule.RuleModule = createRule(
    {
        type: "problem",
        docs: {
            description:
                "Detect dependency cycles in DI container bindings",
            recommended: true,
        },
        messages: {
            circular:
                "Circular dependency detected: {{cycle}}",
        },
        schema: [],
    },
    (context) => {
        return {
            CallExpression(node) {
                const call = node as CallExpression;
                if (!isBuildCall(call)) return;

                const chain = walkChain(call);
                const root = chain[chain.length - 1];
                if (!isDIBuilderCall(root)) return;

                const bindings: DIBinding[] = [];

                for (const c of chain) {
                    let token: string | null = null;
                    const deps: DIBindingRef[] = [];

                    if (isBindFactoryCall(c)) {
                        token = extractStringToken(c);
                        const opts = extractBindingOptions(c, 2);
                        const factoryArg = c.arguments[1];
                        if (factoryArg && factoryArg.type === "CallExpression") {
                            if (isFactoryOfCall(factoryArg as CallExpression)) {
                                const fDeps = extractFactoryOfDeps(factoryArg as CallExpression);
                                if (fDeps) deps.push(...fDeps);
                            }
                        }
                        if (token) {
                            bindings.push({
                                ref: makeBindingRef(token, opts.name),
                                kind: "factory",
                                dependencies: deps,
                                loc: { line: c.loc?.start.line ?? 0, column: c.loc?.start.column ?? 0 },
                                node: c as Node,
                            });
                        }
                    } else if (isBindSafeFactoryCall(c)) {
                        token = extractStringToken(c);
                        const opts = extractBindingOptions(c, 3);
                        const injectorArg = c.arguments[1];
                        if (injectorArg) {
                            deps.push(...extractInjectorDeps(injectorArg as Node));
                        }
                        if (token) {
                            bindings.push({
                                ref: makeBindingRef(token, opts.name),
                                kind: "safeFactory",
                                dependencies: deps,
                                loc: { line: c.loc?.start.line ?? 0, column: c.loc?.start.column ?? 0 },
                                node: c as Node,
                            });
                        }
                    }
                }

                const cycles = findDependencyCycles(bindings);
                for (const { cycle } of cycles) {
                    const cycleStr = cycle
                        .map((ref) => ref.type)
                        .join(" -> ");
                    context.report({
                        node: node,
                        messageId: "circular",
                        data: { cycle: cycleStr },
                    });
                }
            },
        };
    },
);

export default rule;
