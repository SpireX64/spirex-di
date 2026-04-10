import * as vscode from "vscode";
import {
    type DIFileModel,
    type DIBinding,
    type DIResolution,
    type DIModuleDefinition,
    type DIBuilderContext,
    bindingRefId,
} from "@spirex/di-ast-analyzer";
import { analyzeFile } from "./FileAnalyzer.js";

export interface IndexedBinding {
    binding: DIBinding;
    file: string;
}

export interface IndexedResolution {
    resolution: DIResolution;
    file: string;
}

export interface IndexedModule {
    module: DIModuleDefinition;
    file: string;
}

export class ProjectIndexer implements vscode.Disposable {
    private fileModels = new Map<string, DIFileModel>();
    private bindingIndex = new Map<string, IndexedBinding[]>();
    private resolutionIndex = new Map<string, IndexedResolution[]>();
    private moduleIndex = new Map<string, IndexedModule>();
    private variableNameIndex = new Map<string, IndexedModule[]>();
    private watcher: vscode.FileSystemWatcher | undefined;
    private debounceTimer: ReturnType<typeof setTimeout> | undefined;

    private readonly _onDidUpdateIndex = new vscode.EventEmitter<void>();
    public readonly onDidUpdateIndex = this._onDidUpdateIndex.event;

    async initialize(): Promise<void> {
        const pattern = "**/*.{js,ts,jsx,tsx,mjs,mts}";
        this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

        this.watcher.onDidChange((uri) => this.onFileChanged(uri));
        this.watcher.onDidCreate((uri) => this.onFileChanged(uri));
        this.watcher.onDidDelete((uri) => this.onFileDeleted(uri));

        const files = await vscode.workspace.findFiles(
            pattern,
            "**/node_modules/**",
        );

        for (const file of files) {
            await this.indexFile(file);
        }

        this._onDidUpdateIndex.fire();
    }

    private async onFileChanged(uri: vscode.Uri): Promise<void> {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(async () => {
            await this.indexFile(uri);
            this._onDidUpdateIndex.fire();
        }, 100);
    }

    private onFileDeleted(uri: vscode.Uri): void {
        this.removeFile(uri.fsPath);
        this._onDidUpdateIndex.fire();
    }

    private async indexFile(uri: vscode.Uri): Promise<void> {
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const content = doc.getText();
            const model = analyzeFile(uri.fsPath, content);

            this.removeFile(uri.fsPath);

            if (model) {
                this.fileModels.set(uri.fsPath, model);
                this.addToIndices(model);
            }
        } catch {
            // skip files that can't be parsed
        }
    }

    private removeFile(filePath: string): void {
        this.fileModels.delete(filePath);

        for (const [key, entries] of this.bindingIndex) {
            const filtered = entries.filter((e) => e.file !== filePath);
            if (filtered.length === 0) {
                this.bindingIndex.delete(key);
            } else {
                this.bindingIndex.set(key, filtered);
            }
        }

        for (const [key, entries] of this.resolutionIndex) {
            const filtered = entries.filter((e) => e.file !== filePath);
            if (filtered.length === 0) {
                this.resolutionIndex.delete(key);
            } else {
                this.resolutionIndex.set(key, filtered);
            }
        }

        for (const [key, entry] of this.moduleIndex) {
            if (entry.file === filePath) {
                this.moduleIndex.delete(key);
            }
        }

        for (const [key, entries] of this.variableNameIndex) {
            const filtered = entries.filter((e) => e.file !== filePath);
            if (filtered.length === 0) {
                this.variableNameIndex.delete(key);
            } else {
                this.variableNameIndex.set(key, filtered);
            }
        }
    }

    private addToIndices(model: DIFileModel): void {
        for (const builder of model.builders) {
            for (const binding of builder.bindings) {
                const id = bindingRefId(binding.ref);
                if (!this.bindingIndex.has(id)) {
                    this.bindingIndex.set(id, []);
                }
                this.bindingIndex.get(id)!.push({
                    binding,
                    file: model.file,
                });
            }
        }

        for (const mod of model.modules) {
            for (const binding of mod.bindings) {
                const id = bindingRefId(binding.ref);
                if (!this.bindingIndex.has(id)) {
                    this.bindingIndex.set(id, []);
                }
                this.bindingIndex.get(id)!.push({
                    binding,
                    file: model.file,
                });
            }
            const indexed = { module: mod, file: model.file };
            this.moduleIndex.set(mod.id, indexed);
            if (mod.variableName) {
                if (!this.variableNameIndex.has(mod.variableName)) {
                    this.variableNameIndex.set(mod.variableName, []);
                }
                this.variableNameIndex.get(mod.variableName)!.push(indexed);
            }
        }

        for (const resolution of model.resolutions) {
            const id = bindingRefId(resolution.ref);
            if (!this.resolutionIndex.has(id)) {
                this.resolutionIndex.set(id, []);
            }
            this.resolutionIndex.get(id)!.push({
                resolution,
                file: model.file,
            });
        }
    }

    getBindings(tokenId: string): IndexedBinding[] {
        return this.bindingIndex.get(tokenId) ?? [];
    }

    getResolutions(tokenId: string): IndexedResolution[] {
        return this.resolutionIndex.get(tokenId) ?? [];
    }

    getAllBindings(): Map<string, IndexedBinding[]> {
        return this.bindingIndex;
    }

    getAllResolutions(): Map<string, IndexedResolution[]> {
        return this.resolutionIndex;
    }

    getAllModules(): Map<string, IndexedModule> {
        return this.moduleIndex;
    }

    getFileModel(filePath: string): DIFileModel | undefined {
        return this.fileModels.get(filePath);
    }

    getAllFileModels(): Map<string, DIFileModel> {
        return this.fileModels;
    }

    getAllTokenIds(): string[] {
        return [...new Set([
            ...this.bindingIndex.keys(),
            ...this.resolutionIndex.keys(),
        ])];
    }

    getModuleByVariableName(varName: string): IndexedModule[] {
        return this.variableNameIndex.get(varName) ?? [];
    }

    resolveModuleIncludes(variableNames: readonly string[]): string[] {
        const resolved: string[] = [];
        for (const varName of variableNames) {
            const modules = this.variableNameIndex.get(varName);
            if (modules && modules.length > 0) {
                resolved.push(modules[0].module.id);
            } else {
                resolved.push(varName);
            }
        }
        return resolved;
    }

    getModuleIncludedBy(
        moduleId: string,
    ): {
        modules: IndexedModule[];
        builders: { builder: DIBuilderContext; file: string }[];
    } {
        const includingModules: IndexedModule[] = [];
        const includingBuilders: { builder: DIBuilderContext; file: string }[] =
            [];

        for (const [, indexed] of this.moduleIndex) {
            const resolvedIncludes = this.resolveModuleIncludes(
                indexed.module.includes,
            );
            if (resolvedIncludes.includes(moduleId)) {
                includingModules.push(indexed);
            }
        }

        for (const [filePath, model] of this.fileModels) {
            for (const builder of model.builders) {
                const resolvedModules = this.resolveModuleIncludes(
                    builder.modules,
                );
                if (resolvedModules.includes(moduleId)) {
                    includingBuilders.push({ builder, file: filePath });
                }
            }
        }

        return { modules: includingModules, builders: includingBuilders };
    }

    async refresh(): Promise<void> {
        this.bindingIndex.clear();
        this.resolutionIndex.clear();
        this.moduleIndex.clear();
        this.variableNameIndex.clear();
        this.fileModels.clear();
        await this.initialize();
    }

    dispose(): void {
        this.watcher?.dispose();
        this._onDidUpdateIndex.dispose();
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
    }
}
