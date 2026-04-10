import * as vscode from "vscode";
import type { ProjectIndexer } from "../indexer/ProjectIndexer.js";
import {
    bindingRefId,
    findConflicts,
    findLifecycleMismatches,
    findDanglingAliases,
    findAliasCycles,
    findDependencyCycles,
    type DIBinding,
} from "@spirex/di-ast-analyzer";

export class DiagnosticsManager implements vscode.Disposable {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor(private readonly indexer: ProjectIndexer) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection("spirex-di");
        indexer.onDidUpdateIndex(() => this.refresh());
    }

    refresh(): void {
        const config = vscode.workspace.getConfiguration("spirexDI");
        if (!config.get("enableDiagnostics", true)) {
            this.diagnosticCollection.clear();
            return;
        }

        this.diagnosticCollection.clear();
        const diagnosticsByFile = new Map<string, vscode.Diagnostic[]>();

        function addDiagnostic(
            file: string,
            line: number,
            col: number,
            message: string,
            severity: vscode.DiagnosticSeverity,
        ): void {
            if (!diagnosticsByFile.has(file)) {
                diagnosticsByFile.set(file, []);
            }
            const range = new vscode.Range(
                new vscode.Position(line - 1, col),
                new vscode.Position(line - 1, col + 1),
            );
            const diagnostic = new vscode.Diagnostic(range, message, severity);
            diagnostic.source = "SpireX DI";
            diagnosticsByFile.get(file)!.push(diagnostic);
        }

        for (const [filePath, model] of this.indexer.getAllFileModels()) {
            for (const builder of model.builders) {
                const bindings = [...builder.bindings] as DIBinding[];

                // Duplicate bindings
                const conflicts = findConflicts(bindings);
                for (const { ref, bindings: conflictBindings } of conflicts) {
                    for (const b of conflictBindings.slice(1)) {
                        addDiagnostic(
                            filePath,
                            b.loc.line,
                            b.loc.column,
                            `Duplicate binding "${ref.type}" without ifConflict strategy`,
                            vscode.DiagnosticSeverity.Error,
                        );
                    }
                }

                // Lifecycle mismatches
                const mismatches = findLifecycleMismatches(bindings);
                for (const { ref, lifecycles } of mismatches) {
                    addDiagnostic(
                        filePath,
                        builder.loc.line,
                        builder.loc.column,
                        `Binding "${ref.type}" uses append with mixed lifecycles: ${lifecycles.join(", ")}`,
                        vscode.DiagnosticSeverity.Error,
                    );
                }

                // Dangling aliases
                const dangling = findDanglingAliases(bindings);
                for (const { alias, missingOrigin } of dangling) {
                    addDiagnostic(
                        filePath,
                        alias.loc.line,
                        alias.loc.column,
                        `Alias "${alias.ref.type}" points to "${missingOrigin.type}" which is not bound`,
                        vscode.DiagnosticSeverity.Error,
                    );
                }

                // Alias cycles
                const aliasCycles = findAliasCycles(bindings);
                for (const { cycle } of aliasCycles) {
                    const cycleStr = cycle.map((r) => r.type).join(" → ");
                    addDiagnostic(
                        filePath,
                        builder.loc.line,
                        builder.loc.column,
                        `Alias cycle detected: ${cycleStr}`,
                        vscode.DiagnosticSeverity.Error,
                    );
                }

                // Dependency cycles
                const depCycles = findDependencyCycles(bindings);
                for (const { cycle } of depCycles) {
                    const cycleStr = cycle.map((r) => r.type).join(" → ");
                    addDiagnostic(
                        filePath,
                        builder.loc.line,
                        builder.loc.column,
                        `Circular dependency: ${cycleStr}`,
                        vscode.DiagnosticSeverity.Error,
                    );
                }

                // Missing build
                if (!builder.hasBuild) {
                    addDiagnostic(
                        filePath,
                        builder.loc.line,
                        builder.loc.column,
                        "diBuilder() is created but .build() is never called",
                        vscode.DiagnosticSeverity.Warning,
                    );
                }
            }
        }

        for (const [filePath, diagnostics] of diagnosticsByFile) {
            this.diagnosticCollection.set(
                vscode.Uri.file(filePath),
                diagnostics,
            );
        }
    }

    dispose(): void {
        this.diagnosticCollection.dispose();
    }
}
