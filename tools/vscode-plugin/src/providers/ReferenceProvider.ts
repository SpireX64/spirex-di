import * as vscode from "vscode";
import type { ProjectIndexer } from "../indexer/ProjectIndexer.js";
import { bindingRefId, makeBindingRef } from "@spirex/di-ast-analyzer";

export class DIReferenceProvider implements vscode.ReferenceProvider {
    constructor(private readonly indexer: ProjectIndexer) {}

    provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.Location[] | undefined {
        const token = this.getTokenAtPosition(document, position);
        if (!token) return undefined;

        const id = bindingRefId(makeBindingRef(token));
        const locations: vscode.Location[] = [];

        const bindings = this.indexer.getBindings(id);
        for (const entry of bindings) {
            locations.push(
                new vscode.Location(
                    vscode.Uri.file(entry.file),
                    new vscode.Position(
                        entry.binding.loc.line - 1,
                        entry.binding.loc.column,
                    ),
                ),
            );
        }

        const resolutions = this.indexer.getResolutions(id);
        for (const entry of resolutions) {
            locations.push(
                new vscode.Location(
                    vscode.Uri.file(entry.file),
                    new vscode.Position(
                        entry.resolution.loc.line - 1,
                        entry.resolution.loc.column,
                    ),
                ),
            );
        }

        return locations.length > 0 ? locations : undefined;
    }

    private getTokenAtPosition(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): string | null {
        const range = document.getWordRangeAtPosition(position, /["'][^"']+["']/);
        if (!range) return null;
        const text = document.getText(range);
        return text.slice(1, -1);
    }
}
