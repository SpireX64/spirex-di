import * as vscode from "vscode";
import type { ProjectIndexer } from "../indexer/ProjectIndexer.js";
import {
    bindingRefId,
    makeBindingRef,
    type DIBinding,
} from "@spirex/di-ast-analyzer";

export class DIHoverProvider implements vscode.HoverProvider {
    constructor(private readonly indexer: ProjectIndexer) {}

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.Hover | undefined {
        const token = this.getTokenAtPosition(document, position);
        if (token) {
            return this.buildTokenHover(token);
        }

        const moduleVarName = this.getModuleIdentifierAtPosition(
            document,
            position,
        );
        if (moduleVarName) {
            return this.buildModuleHover(moduleVarName);
        }

        return undefined;
    }

    private buildTokenHover(token: string): vscode.Hover | undefined {
        const id = bindingRefId(makeBindingRef(token));
        const bindings = this.indexer.getBindings(id);
        const resolutions = this.indexer.getResolutions(id);

        if (bindings.length === 0 && resolutions.length === 0)
            return undefined;

        const lines: string[] = [];
        lines.push(`### \`"${token}"\``);

        if (bindings.length > 0) {
            lines.push("");
            lines.push(`**Bindings** (${bindings.length})`);
            for (const entry of bindings) {
                lines.push(this.formatBinding(entry.binding, entry.file));
            }
        }

        if (resolutions.length > 0) {
            lines.push("");
            lines.push(`**Usages** (${resolutions.length})`);
            for (const entry of resolutions) {
                const loc = `${this.shortPath(entry.file)}:${entry.resolution.loc.line}`;
                lines.push(
                    `| \`${entry.resolution.method}()\` | [${loc}](${vscode.Uri.file(entry.file).toString()}#L${entry.resolution.loc.line}) |`,
                );
            }
        }

        const contents = new vscode.MarkdownString(lines.join("\n"));
        contents.isTrusted = true;
        return new vscode.Hover(contents);
    }

    private buildModuleHover(varName: string): vscode.Hover | undefined {
        const modules = this.indexer.getModuleByVariableName(varName);
        if (modules.length === 0) return undefined;

        const indexed = modules[0];
        const mod = indexed.module;

        const lines: string[] = [];
        lines.push(`### Module \`"${mod.id}"\` *(${mod.kind})*`);

        const exportedBindings: { binding: DIBinding; file: string }[] = [];
        for (const [, entries] of this.indexer.getAllBindings()) {
            for (const entry of entries) {
                if (entry.binding.moduleId === mod.id) {
                    exportedBindings.push(entry);
                }
            }
        }

        if (exportedBindings.length > 0) {
            lines.push("");
            lines.push(`**Bindings** (${exportedBindings.length})`);
            lines.push("");
            lines.push("| Token | Kind | Lifecycle | Scope |");
            lines.push("|-------|------|-----------|-------|");
            for (const entry of exportedBindings) {
                const b = entry.binding;
                const flags: string[] = [];
                if (b.internal) flags.push("🔒 internal");
                if (b.ifConflict && b.ifConflict !== "throw") flags.push(`${b.ifConflict}`);
                const scope = flags.length > 0 ? flags.join(", ") : "public";
                lines.push(
                    `| \`${b.ref.type}\` | ${b.kind} | ${b.lifecycle ?? "—"} | ${scope} |`,
                );
            }
        }

        if (mod.includes.length > 0) {
            const resolved = this.indexer.resolveModuleIncludes(mod.includes);
            lines.push("");
            lines.push(
                `**Includes:** ${resolved.map((r) => `\`${r}\``).join(", ")}`,
            );
        }

        const includedBy = this.indexer.getModuleIncludedBy(mod.id);
        if (
            includedBy.modules.length > 0 ||
            includedBy.builders.length > 0
        ) {
            lines.push("");
            lines.push("**Included by**");
            for (const m of includedBy.modules) {
                const loc = `${this.shortPath(m.file)}:${m.module.loc.line}`;
                lines.push(`| Module \`${m.module.id}\` | [${loc}](${vscode.Uri.file(m.file).toString()}#L${m.module.loc.line}) |`);
            }
            for (const b of includedBy.builders) {
                const loc = `${this.shortPath(b.file)}:${b.builder.loc.line}`;
                lines.push(`| Container | [${loc}](${vscode.Uri.file(b.file).toString()}#L${b.builder.loc.line}) |`);
            }
        }

        lines.push("");
        const moduleLoc = `${this.shortPath(indexed.file)}:${mod.loc.line}`;
        lines.push(
            `*Defined at [${moduleLoc}](${vscode.Uri.file(indexed.file).toString()}#L${mod.loc.line})*`,
        );

        const contents = new vscode.MarkdownString(lines.join("\n"));
        contents.isTrusted = true;
        return new vscode.Hover(contents);
    }

    private formatBinding(binding: DIBinding, file: string): string {
        const loc = `${this.shortPath(file)}:${binding.loc.line}`;
        const link = `[${loc}](${vscode.Uri.file(file).toString()}#L${binding.loc.line})`;

        const tags: string[] = [];
        tags.push(`**${binding.kind}**`);
        if (binding.lifecycle) tags.push(`\`${binding.lifecycle}\``);
        if (binding.moduleId) tags.push(`in \`${binding.moduleId}\``);
        if (binding.internal) tags.push("**🔒 internal**");
        if (binding.ifConflict && binding.ifConflict !== "throw")
            tags.push(`*${binding.ifConflict}*`);

        const line = `| ${tags.join(" · ")} | ${link} |`;

        const extras: string[] = [];
        if (binding.resolverDeps && binding.resolverDeps.length > 0) {
            for (const rd of binding.resolverDeps) {
                const opt = rd.optional ? " *(optional)*" : "";
                extras.push(`|   ↳ \`r.${rd.method}("${rd.ref.type}")\`${opt} | |`);
            }
        } else if (binding.dependencies.length > 0) {
            const deps = binding.dependencies.map((d) => `\`${d.type}\``).join(", ");
            extras.push(`|   ↳ deps: ${deps} | |`);
        }
        if (binding.aliasOrigin) {
            extras.push(`|   ↳ alias for \`${binding.aliasOrigin.type}\` | |`);
        }

        return extras.length > 0 ? line + "\n" + extras.join("\n") : line;
    }

    private shortPath(filePath: string): string {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            for (const folder of folders) {
                if (filePath.startsWith(folder.uri.fsPath)) {
                    return filePath.slice(folder.uri.fsPath.length + 1);
                }
            }
        }
        return filePath;
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
