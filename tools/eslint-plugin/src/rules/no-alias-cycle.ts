import type { Rule } from "eslint";
import type { CallExpression, Node } from "estree";
import {
    isDIBuilderCall,
    isBuildCall,
    isBindAliasCall,
    extractStringToken,
    extractAliasOptions,
    makeBindingRef,
    type DIBinding,
} from "@spirex/di-ast-analyzer";
import { findAliasCycles } from "@spirex/di-ast-analyzer";
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
                "Detect alias chains forming cycles in DI bindings",
            recommended: true,
        },
        messages: {
            aliasCycle:
                "Alias cycle detected: {{cycle}}",
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
                    if (!isBindAliasCall(c)) continue;

                    const aliasToken = extractStringToken(c, 0);
                    const originToken = extractStringToken(c, 1);
                    if (!aliasToken || !originToken) continue;

                    const opts = extractAliasOptions(c);

                    bindings.push({
                        ref: makeBindingRef(aliasToken, opts.name),
                        kind: "alias",
                        aliasOrigin: makeBindingRef(originToken, opts.originName),
                        dependencies: [],
                        loc: { line: c.loc?.start.line ?? 0, column: c.loc?.start.column ?? 0 },
                        node: c as Node,
                    });
                }

                const cycles = findAliasCycles(bindings);
                for (const { cycle } of cycles) {
                    const cycleStr = cycle
                        .map((ref) => ref.type)
                        .join(" -> ");
                    context.report({
                        node: node,
                        messageId: "aliasCycle",
                        data: { cycle: cycleStr },
                    });
                }
            },
        };
    },
);

export default rule;
