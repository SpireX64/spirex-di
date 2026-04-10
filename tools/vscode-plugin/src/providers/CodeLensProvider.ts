import * as vscode from "vscode";
import type { ProjectIndexer } from "../indexer/ProjectIndexer.js";
import { bindingRefId } from "@spirex/di-ast-analyzer";

export class DICodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    constructor(private readonly indexer: ProjectIndexer) {
        indexer.onDidUpdateIndex(() => this._onDidChangeCodeLenses.fire());
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const config = vscode.workspace.getConfiguration("spirexDI");
        if (!config.get("enableCodeLens", true)) return [];

        const model = this.indexer.getFileModel(document.uri.fsPath);
        if (!model) return [];

        const lenses: vscode.CodeLens[] = [];
        const addBindingLenses = (
            bindings: readonly { ref: { type: string; name?: string }; loc: { line: number; column: number } }[],
        ) => {
            for (const binding of bindings) {
                const id = bindingRefId(binding.ref);
                const resolutions = this.indexer.getResolutions(id);
                const refCount = resolutions.length;

                const range = new vscode.Range(
                    new vscode.Position(binding.loc.line - 1, binding.loc.column),
                    new vscode.Position(binding.loc.line - 1, binding.loc.column),
                );

                if (refCount === 0) {
                    lenses.push(new vscode.CodeLens(range, { title: "0 references", command: "" }));
                    continue;
                }

                const locations = resolutions.map(
                    (r) =>
                        new vscode.Location(
                            vscode.Uri.file(r.file),
                            new vscode.Position(r.resolution.loc.line - 1, r.resolution.loc.column),
                        ),
                );

                lenses.push(
                    new vscode.CodeLens(range, {
                        title: `${refCount} reference${refCount !== 1 ? "s" : ""}`,
                        command: "editor.action.peekLocations",
                        arguments: [
                            document.uri,
                            new vscode.Position(binding.loc.line - 1, binding.loc.column),
                            locations,
                            "peek",
                        ],
                    }),
                );
            }
        };

        for (const builder of model.builders) {
            addBindingLenses(builder.bindings);
        }
        for (const mod of model.modules) {
            addBindingLenses(mod.bindings);
        }

        return lenses;
    }

    dispose(): void {
        this._onDidChangeCodeLenses.dispose();
    }
}
