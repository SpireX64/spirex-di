import * as vscode from "vscode";
import { ProjectIndexer } from "./indexer/ProjectIndexer.js";
import { DIDefinitionProvider } from "./providers/DefinitionProvider.js";
import { DIReferenceProvider } from "./providers/ReferenceProvider.js";
import { DIHoverProvider } from "./providers/HoverProvider.js";
import { DICompletionProvider } from "./providers/CompletionProvider.js";
import { DICodeLensProvider } from "./providers/CodeLensProvider.js";
import { DIRenameProvider } from "./providers/RenameProvider.js";
import { ContainerExplorerProvider } from "./views/ContainerExplorerProvider.js";
import { DependencyGraphPanel } from "./views/DependencyGraphPanel.js";
import { DiagnosticsManager } from "./diagnostics/DiagnosticsManager.js";

const LANGUAGE_SELECTOR: vscode.DocumentSelector = [
    { scheme: "file", language: "javascript" },
    { scheme: "file", language: "typescript" },
    { scheme: "file", language: "javascriptreact" },
    { scheme: "file", language: "typescriptreact" },
];

let indexer: ProjectIndexer | undefined;

export async function activate(
    context: vscode.ExtensionContext,
): Promise<void> {
    indexer = new ProjectIndexer();
    context.subscriptions.push(indexer);

    await indexer.initialize();

    vscode.commands.executeCommand(
        "setContext",
        "spirexDI.hasProject",
        true,
    );

    // Phase 1: Core language features
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            LANGUAGE_SELECTOR,
            new DIDefinitionProvider(indexer),
        ),
    );

    context.subscriptions.push(
        vscode.languages.registerReferenceProvider(
            LANGUAGE_SELECTOR,
            new DIReferenceProvider(indexer),
        ),
    );

    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            LANGUAGE_SELECTOR,
            new DIHoverProvider(indexer),
        ),
    );

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            LANGUAGE_SELECTOR,
            new DICompletionProvider(indexer),
            '"', "'",
        ),
    );

    // Phase 2: CodeLens, Container Explorer, Rename
    const codeLensProvider = new DICodeLensProvider(indexer);
    context.subscriptions.push(codeLensProvider);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            LANGUAGE_SELECTOR,
            codeLensProvider,
        ),
    );

    context.subscriptions.push(
        vscode.languages.registerRenameProvider(
            LANGUAGE_SELECTOR,
            new DIRenameProvider(indexer),
        ),
    );

    const containerExplorer = new ContainerExplorerProvider(indexer);
    context.subscriptions.push(containerExplorer);
    const treeView = vscode.window.createTreeView("spirexDI.containerExplorer", {
        treeDataProvider: containerExplorer,
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    context.subscriptions.push(
        vscode.commands.registerCommand("spirexDI.toggleInternalBindings", () => {
            containerExplorer.toggleInternal();
            vscode.commands.executeCommand(
                "setContext",
                "spirexDI.showInternal",
                containerExplorer.showInternal,
            );
        }),
    );
    vscode.commands.executeCommand("setContext", "spirexDI.showInternal", true);

    // Phase 3: Dependency Graph, Diagnostics
    const graphPanel = new DependencyGraphPanel(indexer, context.extensionUri);
    context.subscriptions.push(graphPanel);

    const diagnosticsManager = new DiagnosticsManager(indexer);
    context.subscriptions.push(diagnosticsManager);

    // Commands
    context.subscriptions.push(
        vscode.commands.registerCommand("spirexDI.showDependencyGraph", () => {
            graphPanel.show();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("spirexDI.refreshIndex", async () => {
            await indexer?.refresh();
            vscode.window.showInformationMessage(
                "SpireX DI: Index refreshed",
            );
        }),
    );
}

export function deactivate(): void {
    indexer?.dispose();
    indexer = undefined;
}
