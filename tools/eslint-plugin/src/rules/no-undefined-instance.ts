import type { Rule } from "eslint";
import type { CallExpression, Identifier, Node } from "estree";
import { isBindInstanceCall, extractStringToken } from "@spirex/di-ast-analyzer";
import { createRule } from "../utils.js";

const rule: Rule.RuleModule = createRule(
    {
        type: "problem",
        docs: {
            description:
                "Disallow binding undefined as an instance value in the DI container",
            recommended: true,
        },
        messages: {
            undefinedInstance:
                'bindInstance("{{token}}", undefined) will throw TypeError at runtime.',
            possiblyUndefined:
                'bindInstance("{{token}}", ...) receives a variable that may be undefined.',
        },
        schema: [],
    },
    (context) => {
        return {
            CallExpression(node) {
                const call = node as CallExpression;
                if (!isBindInstanceCall(call)) return;

                const token = extractStringToken(call);
                if (!token) return;

                const instanceArg = call.arguments[1];
                if (!instanceArg) return;

                if (
                    instanceArg.type === "Identifier" &&
                    (instanceArg as Identifier).name === "undefined"
                ) {
                    context.report({
                        node: instanceArg as Node,
                        messageId: "undefinedInstance",
                        data: { token },
                    });
                    return;
                }

                if (
                    instanceArg.type === "UnaryExpression" &&
                    (instanceArg as { operator: string }).operator === "void"
                ) {
                    context.report({
                        node: instanceArg as Node,
                        messageId: "undefinedInstance",
                        data: { token },
                    });
                }
            },
        };
    },
);

export default rule;
