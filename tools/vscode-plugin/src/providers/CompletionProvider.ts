import * as vscode from "vscode";
import type { ProjectIndexer } from "../indexer/ProjectIndexer.js";

const TRIGGER_PATTERNS = [
    /\.get\(\s*["']$/,
    /\.maybe\(\s*["']$/,
    /\.getAll\(\s*["']$/,
    /\.providerOf\(\s*["']$/,
    /\.phantomOf\(\s*["']$/,
    /bindAlias\(\s*["'][^"']*["']\s*,\s*["']$/,
    /useInject\(\s*["']$/,
    /setDIScope\(\s*["']$/,
    /requireType\(\s*["']$/,
];

export class DICompletionProvider implements vscode.CompletionItemProvider {
    constructor(private readonly indexer: ProjectIndexer) {}

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.CompletionItem[] | undefined {
        const lineText = document.lineAt(position.line).text;
        const textBefore = lineText.substring(0, position.character);

        const isInDIContext = TRIGGER_PATTERNS.some((p) => p.test(textBefore));
        if (!isInDIContext) return undefined;

        const items: vscode.CompletionItem[] = [];
        const allBindings = this.indexer.getAllBindings();

        for (const [tokenId, entries] of allBindings) {
            if (entries.length === 0) continue;

            const first = entries[0].binding;
            const item = new vscode.CompletionItem(
                first.ref.type,
                vscode.CompletionItemKind.Value,
            );

            const details: string[] = [];
            if (first.kind) details.push(first.kind);
            if (first.lifecycle) details.push(first.lifecycle);
            if (first.moduleId) details.push(`module: ${first.moduleId}`);
            item.detail = details.join(" | ");

            if (entries.length > 1) {
                item.detail += ` (${entries.length} bindings)`;
            }

            item.sortText = first.ref.type;
            items.push(item);
        }

        return items;
    }
}
