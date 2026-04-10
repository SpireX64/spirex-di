import type { Rule } from "eslint";
import type { CallExpression, Node } from "estree";
import {
    isDIBuilderCall,
    isBuildCall,
    isBindFactoryCall,
    isBindInstanceCall,
    isBindSafeFactoryCall,
    isRequireTypeCall,
    extractStringToken,
    extractBindingOptions,
    makeBindingRef,
    bindingRefId,
    type DIBindingRef,
} from "@spirex/di-ast-analyzer";
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
        type: "suggestion",
        docs: {
            description:
                "Detect requireType() references to tokens not bound in the same builder scope",
            recommended: true,
        },
        messages: {
            missing:
                'Required type "{{token}}" is not bound in this builder.',
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

                const boundIds = new Set<string>();
                const required: Array<{ ref: DIBindingRef; node: Node }> = [];

                for (const c of chain) {
                    if (
                        isBindFactoryCall(c) ||
                        isBindInstanceCall(c)
                    ) {
                        const token = extractStringToken(c);
                        if (!token) continue;
                        const opts = extractBindingOptions(c, 2);
                        boundIds.add(bindingRefId(makeBindingRef(token, opts.name)));
                    } else if (isBindSafeFactoryCall(c)) {
                        const token = extractStringToken(c);
                        if (!token) continue;
                        const opts = extractBindingOptions(c, 3);
                        boundIds.add(bindingRefId(makeBindingRef(token, opts.name)));
                    } else if (isRequireTypeCall(c)) {
                        const token = extractStringToken(c);
                        if (!token) continue;
                        const name = extractStringToken(c, 1);
                        required.push({
                            ref: makeBindingRef(token, name ?? undefined),
                            node: c as Node,
                        });
                    }
                }

                for (const { ref, node: reqNode } of required) {
                    if (!boundIds.has(bindingRefId(ref))) {
                        context.report({
                            node: reqNode,
                            messageId: "missing",
                            data: { token: ref.type },
                        });
                    }
                }
            },
        };
    },
);

export default rule;
