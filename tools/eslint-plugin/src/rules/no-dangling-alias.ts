import type { Rule } from "eslint";
import type { CallExpression, Node } from "estree";
import {
    isDIBuilderCall,
    isBuildCall,
    isBindFactoryCall,
    isBindInstanceCall,
    isBindSafeFactoryCall,
    isBindAliasCall,
    extractStringToken,
    extractBindingOptions,
    extractAliasOptions,
    makeBindingRef,
    bindingRefId,
    type DIBinding,
} from "@spirex/di-ast-analyzer";
import { findDanglingAliases } from "@spirex/di-ast-analyzer";
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
                "Detect aliases pointing to non-existent bindings in the same builder scope",
            recommended: true,
        },
        messages: {
            dangling:
                'Alias "{{alias}}" points to "{{origin}}" which is not bound in this builder.',
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
                    if (isBindFactoryCall(c) || isBindInstanceCall(c)) {
                        const token = extractStringToken(c);
                        if (!token) continue;
                        const opts = extractBindingOptions(c, 2);
                        bindings.push({
                            ref: makeBindingRef(token, opts.name),
                            kind: isBindFactoryCall(c) ? "factory" : "instance",
                            dependencies: [],
                            loc: { line: c.loc?.start.line ?? 0, column: c.loc?.start.column ?? 0 },
                            node: c as Node,
                        });
                    } else if (isBindSafeFactoryCall(c)) {
                        const token = extractStringToken(c);
                        if (!token) continue;
                        const opts = extractBindingOptions(c, 3);
                        bindings.push({
                            ref: makeBindingRef(token, opts.name),
                            kind: "safeFactory",
                            dependencies: [],
                            loc: { line: c.loc?.start.line ?? 0, column: c.loc?.start.column ?? 0 },
                            node: c as Node,
                        });
                    } else if (isBindAliasCall(c)) {
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
                }

                const dangling = findDanglingAliases(bindings);
                for (const { alias, missingOrigin } of dangling) {
                    context.report({
                        node: alias.node as Node,
                        messageId: "dangling",
                        data: {
                            alias: alias.ref.type,
                            origin: missingOrigin.type,
                        },
                    });
                }
            },
        };
    },
);

export default rule;
