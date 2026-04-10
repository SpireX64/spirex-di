import type { Rule } from "eslint";
import type { CallExpression, Node } from "estree";
import {
    isDIBuilderCall,
    isBuildCall,
    isBindFactoryCall,
    isBindInstanceCall,
    isBindSafeFactoryCall,
    isBindAliasCall,
    isResolveCall,
    getResolveMethodName,
    isUseInjectCall,
    extractStringToken,
    extractBindingOptions,
    extractAliasOptions,
    makeBindingRef,
    bindingRefId,
    type DIBindingRef,
} from "@spirex/di-ast-analyzer";
import { createRule } from "../utils.js";

interface BindingRecord {
    ref: DIBindingRef;
    internal: boolean;
    node: Node;
}

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
        type: "suggestion",
        docs: {
            description:
                "Detect bindings that are never resolved in the same file",
            recommended: false,
        },
        messages: {
            unused:
                'Binding "{{token}}" is registered but never resolved in this file.',
        },
        schema: [],
    },
    (context) => {
        const localBindings: BindingRecord[] = [];
        const localUsedIds = new Set<string>();

        return {
            CallExpression(node) {
                const call = node as CallExpression;

                if (isBuildCall(call)) {
                    const chain = walkChain(call);
                    const root = chain[chain.length - 1];
                    if (!isDIBuilderCall(root)) return;

                    for (const c of chain) {
                        let token: string | null = null;
                        let optIdx = -1;
                        let isInternal = false;

                        if (isBindFactoryCall(c) || isBindInstanceCall(c)) {
                            token = extractStringToken(c);
                            optIdx = 2;
                        } else if (isBindSafeFactoryCall(c)) {
                            token = extractStringToken(c);
                            optIdx = 3;
                        } else if (isBindAliasCall(c)) {
                            const aliasToken = extractStringToken(c, 0);
                            const originToken = extractStringToken(c, 1);
                            if (aliasToken) {
                                const opts = extractAliasOptions(c);
                                localBindings.push({
                                    ref: makeBindingRef(aliasToken, opts.name),
                                    internal: false,
                                    node: c as Node,
                                });
                            }
                            if (originToken) {
                                const opts = extractAliasOptions(c);
                                localUsedIds.add(
                                    bindingRefId(makeBindingRef(originToken, opts.originName)),
                                );
                            }
                            continue;
                        } else {
                            continue;
                        }

                        if (!token) continue;
                        const opts = extractBindingOptions(c, optIdx);
                        localBindings.push({
                            ref: makeBindingRef(token, opts.name),
                            internal: opts.internal ?? false,
                            node: c as Node,
                        });
                    }
                }

                // Track usages
                if (isResolveCall(call)) {
                    const token = extractStringToken(call);
                    if (token) {
                        const name = extractStringToken(call, 1);
                        localUsedIds.add(bindingRefId(makeBindingRef(token, name ?? undefined)));
                    }
                }

                if (isUseInjectCall(call)) {
                    const firstArg = call.arguments[0];
                    if (firstArg && firstArg.type === "Literal") {
                        const token = extractStringToken(call);
                        if (token) {
                            localUsedIds.add(bindingRefId(makeBindingRef(token)));
                        }
                    }
                }
            },

            "Program:exit"() {
                for (const binding of localBindings) {
                    if (binding.internal) continue;
                    const id = bindingRefId(binding.ref);
                    if (!localUsedIds.has(id)) {
                        context.report({
                            node: binding.node,
                            messageId: "unused",
                            data: { token: binding.ref.type },
                        });
                    }
                }
            },
        };
    },
);

export default rule;
