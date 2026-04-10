import * as vscode from "vscode";
import type { ProjectIndexer } from "../indexer/ProjectIndexer.js";
import { bindingRefId, makeBindingRef } from "@spirex/di-ast-analyzer";

export class DIRenameProvider implements vscode.RenameProvider {
    constructor(private readonly indexer: ProjectIndexer) {}

    prepareRename(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.Range | { range: vscode.Range; placeholder: string } | undefined {
        const range = document.getWordRangeAtPosition(position, /["'][^"']+["']/);
        if (!range) return undefined;

        const text = document.getText(range);
        const token = text.slice(1, -1);

        const innerRange = new vscode.Range(
            range.start.translate(0, 1),
            range.end.translate(0, -1),
        );

        return { range: innerRange, placeholder: token };
    }

    provideRenameEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        newName: string,
    ): vscode.WorkspaceEdit | undefined {
        const token = this.getTokenAtPosition(document, position);
        if (!token) return undefined;

        const id = bindingRefId(makeBindingRef(token));
        const edit = new vscode.WorkspaceEdit();

        const bindings = this.indexer.getBindings(id);
        for (const entry of bindings) {
            const uri = vscode.Uri.file(entry.file);
            this.replaceTokenInFile(uri, token, newName, edit);
        }

        const resolutions = this.indexer.getResolutions(id);
        for (const entry of resolutions) {
            const uri = vscode.Uri.file(entry.file);
            this.replaceTokenInFile(uri, token, newName, edit);
        }

        return edit;
    }

    private async replaceTokenInFile(
        uri: vscode.Uri,
        oldToken: string,
        newToken: string,
        edit: vscode.WorkspaceEdit,
    ): Promise<void> {
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const text = doc.getText();

            const patterns = [
                new RegExp(`(["'])${this.escapeRegex(oldToken)}\\1`, "g"),
            ];

            for (const pattern of patterns) {
                let match: RegExpExecArray | null;
                while ((match = pattern.exec(text)) !== null) {
                    const startPos = doc.positionAt(match.index + 1);
                    const endPos = doc.positionAt(
                        match.index + 1 + oldToken.length,
                    );
                    edit.replace(uri, new vscode.Range(startPos, endPos), newToken);
                }
            }
        } catch {
            // skip files that can't be opened
        }
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
