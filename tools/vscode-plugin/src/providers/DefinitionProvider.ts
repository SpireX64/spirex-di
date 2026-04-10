import * as vscode from "vscode";
import type { ProjectIndexer } from "../indexer/ProjectIndexer.js";
import { bindingRefId, makeBindingRef } from "@spirex/di-ast-analyzer";

export class DIDefinitionProvider implements vscode.DefinitionProvider {
    constructor(private readonly indexer: ProjectIndexer) {}

    provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.Definition | undefined {
        const token = this.getTokenAtPosition(document, position);
        if (token) {
            const id = bindingRefId(makeBindingRef(token));
            const bindings = this.indexer.getBindings(id);
            if (bindings.length > 0) {
                return bindings.map(
                    (entry) =>
                        new vscode.Location(
                            vscode.Uri.file(entry.file),
                            new vscode.Position(
                                entry.binding.loc.line - 1,
                                entry.binding.loc.column,
                            ),
                        ),
                );
            }
            return undefined;
        }

        const moduleVarName = this.getModuleIdentifierAtPosition(
            document,
            position,
        );
        if (moduleVarName) {
            const modules = this.indexer.getModuleByVariableName(moduleVarName);
            if (modules.length > 0) {
                return modules.map(
                    (entry) =>
                        new vscode.Location(
                            vscode.Uri.file(entry.file),
                            new vscode.Position(
                                entry.module.loc.line - 1,
                                entry.module.loc.column,
                            ),
                        ),
                );
            }
        }

        return undefined;
    }

    private getTokenAtPosition(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): string | null {
        const range = document.getWordRangeAtPosition(
            position,
            /["'][^"']+["']/,
        );
        if (!range) return null;
        const text = document.getText(range);
        return text.slice(1, -1);
    }

    private getModuleIdentifierAtPosition(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): string | null {
        const range = document.getWordRangeAtPosition(
            position,
            /\b[a-zA-Z_$][\w$]*\b/,
        );
        if (!range) return null;
        const word = document.getText(range);
        const modules = this.indexer.getModuleByVariableName(word);
        return modules.length > 0 ? word : null;
    }
}
