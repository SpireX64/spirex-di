import type { Rule } from "eslint";
import type { CallExpression, Node } from "estree";
import {
    isDIBuilderCall,
    extractBuilderOptions,
    isBindFactoryCall,
    isBindInstanceCall,
    isBindSafeFactoryCall,
    extractStringToken,
    extractBindingOptions,
    isBuildCall,
} from "@spirex/di-ast-analyzer";
import { createRule } from "../utils.js";

interface BindingRecord {
    id: string;
    ifConflict?: string;
    node: Node;
}

function bindingId(token: string, name?: string): string {
    return name ? `${token}$${name}` : token;
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
                "Disallow duplicate DI bindings for the same token without a conflict resolution strategy",
            recommended: true,
        },
        messages: {
            duplicate:
                'Binding "{{id}}" is registered multiple times without an ifConflict strategy. This will throw at runtime.',
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

                const defaults = extractBuilderOptions(root);
                const defaultConflict = defaults.ifConflict ?? "throw";

                const bindings = new Map<string, BindingRecord[]>();

                // Reverse to match execution order (diBuilder first, build last)
                const execOrder = [...chain].reverse();
                for (const c of execOrder) {
                    let token: string | null = null;
                    let optIdx = -1;

                    if (isBindFactoryCall(c)) {
                        token = extractStringToken(c);
                        optIdx = 2;
                    } else if (isBindInstanceCall(c)) {
                        token = extractStringToken(c);
                        optIdx = 2;
                    } else if (isBindSafeFactoryCall(c)) {
                        token = extractStringToken(c);
                        optIdx = 3;
                    } else {
                        continue;
                    }

                    if (!token) continue;

                    const opts = extractBindingOptions(c, optIdx);
                    const id = bindingId(token, opts.name);
                    const ifConflict = opts.ifConflict ?? defaultConflict;

                    if (!bindings.has(id)) bindings.set(id, []);
                    bindings.get(id)!.push({
                        id,
                        ifConflict,
                        node: c as Node,
                    });
                }

                for (const [id, records] of bindings) {
                    if (records.length < 2) continue;
                    // Only subsequent bindings (not the first) can conflict.
                    // Report those that use "throw" (the default).
                    for (const record of records.slice(1)) {
                        if (!record.ifConflict || record.ifConflict === "throw") {
                            context.report({
                                node: record.node,
                                messageId: "duplicate",
                                data: { id },
                            });
                        }
                    }
                }
            },
        };
    },
);

export default rule;
