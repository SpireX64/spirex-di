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
    extractStringToken,
    extractBindingOptions,
    extractAliasOptions,
    makeBindingRef,
    bindingRefId,
    type DIBindingRef,
} from "@spirex/di-ast-analyzer";
import { createRule } from "../utils.js";
import { crossFileRegistry } from "../cross-file-state.js";

interface ResolutionRecord {
    ref: DIBindingRef;
    method: string;
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
        type: "problem",
        docs: {
            description:
                "Detect resolution calls for tokens not bound in any analyzed file",
            recommended: false,
        },
        messages: {
            unresolved:
                'Token "{{token}}" is resolved via {{method}}() but not bound in any analyzed file.',
        },
        schema: [],
    },
    (context) => {
        const localBindings = new Set<string>();
        const localResolutions: ResolutionRecord[] = [];

        return {
            CallExpression(node) {
                const call = node as CallExpression;

                // Collect bindings for cross-file registry
                if (isBuildCall(call)) {
                    const chain = walkChain(call);
                    const root = chain[chain.length - 1];
                    if (!isDIBuilderCall(root)) return;

                    for (const c of chain) {
                        let token: string | null = null;
                        let optIdx = -1;

                        if (isBindFactoryCall(c) || isBindInstanceCall(c)) {
                            token = extractStringToken(c);
                            optIdx = 2;
                        } else if (isBindSafeFactoryCall(c)) {
                            token = extractStringToken(c);
                            optIdx = 3;
                        } else if (isBindAliasCall(c)) {
                            const aliasToken = extractStringToken(c, 0);
                            if (aliasToken) {
                                const opts = extractAliasOptions(c);
                                localBindings.add(
                                    bindingRefId(makeBindingRef(aliasToken, opts.name)),
                                );
                            }
                            continue;
                        } else {
                            continue;
                        }

                        if (!token) continue;
                        const opts = extractBindingOptions(c, optIdx);
                        localBindings.add(
                            bindingRefId(makeBindingRef(token, opts.name)),
                        );
                    }
                }

                // Collect resolutions
                if (isResolveCall(call)) {
                    const method = getResolveMethodName(call);
                    const token = extractStringToken(call);
                    if (method && token && method !== "maybe") {
                        const name = extractStringToken(call, 1);
                        localResolutions.push({
                            ref: makeBindingRef(token, name ?? undefined),
                            method,
                            node: call as Node,
                        });
                    }
                }
            },

            "Program:exit"() {
                const filename = context.filename ?? context.getFilename();

                // Register with cross-file state
                crossFileRegistry.registerBindings(filename, []);
                crossFileRegistry.registerResolutions(filename, []);

                // Check against local + cross-file bindings
                const allBoundIds = crossFileRegistry.getAllBoundIds();
                for (const id of localBindings) {
                    allBoundIds.add(id);
                }

                for (const res of localResolutions) {
                    const id = bindingRefId(res.ref);
                    if (!allBoundIds.has(id)) {
                        context.report({
                            node: res.node,
                            messageId: "unresolved",
                            data: {
                                token: res.ref.type,
                                method: res.method,
                            },
                        });
                    }
                }
            },
        };
    },
);

export default rule;
