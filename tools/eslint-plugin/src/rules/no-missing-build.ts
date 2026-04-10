import type { Rule } from "eslint";
import type { CallExpression, Node, VariableDeclarator, Identifier } from "estree";
import { isDIBuilderCall, isBuildCall } from "@spirex/di-ast-analyzer";
import { createRule } from "../utils.js";

const rule: Rule.RuleModule = createRule(
    {
        type: "suggestion",
        docs: {
            description:
                "Require that diBuilder() calls are followed by .build()",
            recommended: true,
        },
        messages: {
            missingBuild:
                "diBuilder() is created but .build() is never called. The container will not be instantiated.",
        },
        schema: [],
    },
    (context) => {
        const builderNodes: Node[] = [];
        const buildCalled = new Set<Node>();

        function findChainRoot(node: Node): Node {
            let current = node;
            while (
                current.type === "CallExpression" &&
                (current as CallExpression).callee?.type === "MemberExpression"
            ) {
                current = (
                    (current as CallExpression).callee as {
                        object: Node;
                    }
                ).object;
            }
            return current;
        }

        return {
            CallExpression(node) {
                const call = node as CallExpression;

                if (isDIBuilderCall(call)) {
                    builderNodes.push(call as Node);
                    return;
                }

                if (isBuildCall(call)) {
                    const root = findChainRoot(call as Node);
                    if (
                        root.type === "CallExpression" &&
                        isDIBuilderCall(root as CallExpression)
                    ) {
                        buildCalled.add(root);
                    }

                    // Variable-based: b.build() where b = diBuilder()
                    if (
                        call.callee.type === "MemberExpression" &&
                        call.callee.object.type === "Identifier"
                    ) {
                        const varName = (call.callee.object as Identifier).name;
                        const scope = context.sourceCode.getScope(node);
                        const variable = scope.variables.find(
                            (v) => v.name === varName,
                        );
                        if (variable) {
                            for (const def of variable.defs) {
                                if (
                                    def.type === "Variable" &&
                                    def.node.init?.type === "CallExpression" &&
                                    isDIBuilderCall(def.node.init as CallExpression)
                                ) {
                                    buildCalled.add(def.node.init as Node);
                                }
                            }
                        }
                    }
                }
            },

            "Program:exit"() {
                for (const builderNode of builderNodes) {
                    if (!buildCalled.has(builderNode)) {
                        context.report({
                            node: builderNode,
                            messageId: "missingBuild",
                        });
                    }
                }
            },
        };
    },
);

export default rule;
