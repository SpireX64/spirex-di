import type { Rule } from "eslint";
import type { CallExpression, Node } from "estree";
import {
    isDIBuilderCall,
    extractBuilderOptions,
    isBindFactoryCall,
    isBindSafeFactoryCall,
    extractStringToken,
    extractBindingOptions,
} from "@spirex/di-ast-analyzer";
import { createRule } from "../utils.js";

interface AppendRecord {
    token: string;
    name?: string;
    lifecycle: string;
    node: Node;
}

function bindingId(token: string, name?: string): string {
    return name ? `${token}$${name}` : token;
}

const rule: Rule.RuleModule = createRule(
    {
        type: "problem",
        docs: {
            description:
                'Disallow mixed lifecycles when using ifConflict: "append" for the same token',
            recommended: true,
        },
        messages: {
            mismatch:
                'Binding "{{id}}" uses ifConflict: "append" with conflicting lifecycles: {{lifecycles}}. This will throw at runtime.',
        },
        schema: [],
    },
    (context) => {
        const appendBindings = new Map<string, AppendRecord[]>();

        function trackAppendBinding(
            call: CallExpression,
            optionsArgIdx: number,
            defaultLifecycle: string,
        ): void {
            const token = extractStringToken(call);
            if (!token) return;

            const opts = extractBindingOptions(call, optionsArgIdx);
            if (opts.ifConflict !== "append") return;

            const lifecycle = opts.lifecycle ?? defaultLifecycle;
            const id = bindingId(token, opts.name);

            if (!appendBindings.has(id)) appendBindings.set(id, []);
            appendBindings.get(id)!.push({
                token,
                name: opts.name,
                lifecycle,
                node: call as Node,
            });
        }

        let defaultLifecycle = "singleton";

        return {
            CallExpression(node) {
                const call = node as CallExpression;

                if (isDIBuilderCall(call)) {
                    const opts = extractBuilderOptions(call);
                    if (opts.lifecycle) defaultLifecycle = opts.lifecycle;
                    return;
                }

                if (isBindFactoryCall(call)) {
                    trackAppendBinding(call, 2, defaultLifecycle);
                } else if (isBindSafeFactoryCall(call)) {
                    trackAppendBinding(call, 3, defaultLifecycle);
                }
            },

            "Program:exit"() {
                for (const [id, records] of appendBindings) {
                    if (records.length < 2) continue;

                    const lifecycles = new Set(records.map((r) => r.lifecycle));
                    if (lifecycles.size > 1) {
                        for (const record of records.slice(1)) {
                            context.report({
                                node: record.node,
                                messageId: "mismatch",
                                data: {
                                    id,
                                    lifecycles: [...lifecycles].join(", "),
                                },
                            });
                        }
                    }
                }
            },
        };
    },
);

export default rule;
