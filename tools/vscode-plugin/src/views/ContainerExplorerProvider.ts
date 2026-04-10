import * as vscode from "vscode";
import type { ProjectIndexer, IndexedBinding } from "../indexer/ProjectIndexer.js";
import { bindingRefId, type DIBinding } from "@spirex/di-ast-analyzer";

type TreeItem = ContainerNode | ModuleNode | ComposeModuleNode | BindingNode | IncludedModuleRefNode;

class ContainerNode extends vscode.TreeItem {
    constructor(file?: string, line?: number, column?: number) {
        super("Container", vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon("package");
        this.contextValue = "container";
        if (file) {
            this.command = {
                command: "vscode.open",
                title: "Go to Container",
                arguments: [
                    vscode.Uri.file(file),
                    {
                        selection: new vscode.Range(
                            new vscode.Position((line ?? 1) - 1, column ?? 0),
                            new vscode.Position((line ?? 1) - 1, column ?? 0),
                        ),
                    },
                ],
            };
        }
    }
}

class ModuleNode extends vscode.TreeItem {
    constructor(
        public readonly moduleId: string,
        public readonly bindingCount: number,
        public readonly internalCount: number,
        file?: string,
        line?: number,
        column?: number,
    ) {
        super(moduleId, vscode.TreeItemCollapsibleState.Collapsed);
        const desc = internalCount > 0
            ? `${bindingCount} bindings (${internalCount} internal)`
            : `${bindingCount} binding${bindingCount !== 1 ? "s" : ""}`;
        this.description = desc;
        this.iconPath = new vscode.ThemeIcon("symbol-module");
        this.contextValue = "module";
        if (file) {
            this.command = {
                command: "vscode.open",
                title: "Go to Module",
                arguments: [
                    vscode.Uri.file(file),
                    {
                        selection: new vscode.Range(
                            new vscode.Position((line ?? 1) - 1, column ?? 0),
                            new vscode.Position((line ?? 1) - 1, column ?? 0),
                        ),
                    },
                ],
            };
        }
    }
}

class ComposeModuleNode extends vscode.TreeItem {
    public readonly includedModuleIds: string[];

    constructor(
        public readonly moduleId: string,
        includedModuleIds: string[],
        file?: string,
        line?: number,
        column?: number,
    ) {
        super(moduleId, vscode.TreeItemCollapsibleState.Collapsed);
        this.includedModuleIds = includedModuleIds;
        this.description = `compose (${includedModuleIds.length} modules)`;
        this.iconPath = new vscode.ThemeIcon("symbol-namespace");
        this.contextValue = "composeModule";
        if (file) {
            this.command = {
                command: "vscode.open",
                title: "Go to Module",
                arguments: [
                    vscode.Uri.file(file),
                    {
                        selection: new vscode.Range(
                            new vscode.Position((line ?? 1) - 1, column ?? 0),
                            new vscode.Position((line ?? 1) - 1, column ?? 0),
                        ),
                    },
                ],
            };
        }
    }
}

class IncludedModuleRefNode extends vscode.TreeItem {
    constructor(
        moduleId: string,
        file?: string,
        line?: number,
        column?: number,
    ) {
        super(moduleId, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon("symbol-module");
        this.contextValue = "includedModuleRef";
        if (file) {
            this.command = {
                command: "vscode.open",
                title: "Go to Module",
                arguments: [
                    vscode.Uri.file(file),
                    {
                        selection: new vscode.Range(
                            new vscode.Position((line ?? 1) - 1, column ?? 0),
                            new vscode.Position((line ?? 1) - 1, column ?? 0),
                        ),
                    },
                ],
            };
        }
    }
}

class BindingNode extends vscode.TreeItem {
    constructor(
        public readonly binding: DIBinding,
        public readonly file: string,
    ) {
        super(binding.ref.type, vscode.TreeItemCollapsibleState.None);

        const parts: string[] = [binding.kind];
        if (binding.lifecycle) parts.push(binding.lifecycle);
        if (binding.ref.name) parts.push(`name: ${binding.ref.name}`);
        if (binding.internal) parts.push("internal");
        this.description = parts.join(" | ");

        const kindIcons: Record<string, string> = {
            factory: "symbol-method",
            instance: "symbol-constant",
            safeFactory: "symbol-method",
            alias: "symbol-reference",
        };

        if (binding.internal) {
            this.iconPath = new vscode.ThemeIcon("lock", new vscode.ThemeColor("editorWarning.foreground"));
        } else {
            this.iconPath = new vscode.ThemeIcon(kindIcons[binding.kind] ?? "symbol-variable");
        }

        this.command = {
            command: "vscode.open",
            title: "Go to Binding",
            arguments: [
                vscode.Uri.file(file),
                {
                    selection: new vscode.Range(
                        new vscode.Position(binding.loc.line - 1, binding.loc.column),
                        new vscode.Position(binding.loc.line - 1, binding.loc.column),
                    ),
                },
            ],
        };

        this.contextValue = "binding";
    }
}

export class ContainerExplorerProvider
    implements vscode.TreeDataProvider<TreeItem>
{
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | void>();
    public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _showInternal = true;

    constructor(private readonly indexer: ProjectIndexer) {
        indexer.onDidUpdateIndex(() => this._onDidChangeTreeData.fire());
    }

    get showInternal(): boolean {
        return this._showInternal;
    }

    toggleInternal(): void {
        this._showInternal = !this._showInternal;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): TreeItem[] {
        if (!element) {
            let file: string | undefined;
            let line: number | undefined;
            let column: number | undefined;
            for (const [fp, model] of this.indexer.getAllFileModels()) {
                if (model.builders.length > 0) {
                    file = fp;
                    line = model.builders[0].loc.line;
                    column = model.builders[0].loc.column;
                    break;
                }
            }
            return [new ContainerNode(file, line, column)];
        }

        if (element instanceof ContainerNode) {
            return this.getModuleNodes();
        }

        if (element instanceof ModuleNode) {
            return this.getBindingNodesForModule(element.moduleId);
        }

        if (element instanceof ComposeModuleNode) {
            return this.getIncludedModuleRefs(element.includedModuleIds);
        }

        return [];
    }

    private getModuleNodes(): TreeItem[] {
        const nodes: TreeItem[] = [];
        const allModules = this.indexer.getAllModules();
        const allBindings = this.indexer.getAllBindings();

        const standaloneBindings: IndexedBinding[] = [];
        const moduleBindingCounts = new Map<string, number>();
        const moduleInternalCounts = new Map<string, number>();

        for (const [, entries] of allBindings) {
            for (const entry of entries) {
                if (!this._showInternal && entry.binding.internal) continue;

                if (entry.binding.moduleId) {
                    const count = moduleBindingCounts.get(entry.binding.moduleId) ?? 0;
                    moduleBindingCounts.set(entry.binding.moduleId, count + 1);
                    if (entry.binding.internal) {
                        const ic = moduleInternalCounts.get(entry.binding.moduleId) ?? 0;
                        moduleInternalCounts.set(entry.binding.moduleId, ic + 1);
                    }
                } else {
                    standaloneBindings.push(entry);
                }
            }
        }

        if (standaloneBindings.length > 0) {
            nodes.push(new ModuleNode("(standalone)", standaloneBindings.length, 0));
        }

        for (const [moduleId, indexed] of allModules) {
            const mod = indexed.module;

            if (mod.kind === "compose") {
                const resolvedIncludes = this.indexer.resolveModuleIncludes(mod.includes);
                nodes.push(new ComposeModuleNode(
                    moduleId,
                    resolvedIncludes,
                    indexed.file,
                    mod.loc.line,
                    mod.loc.column,
                ));
            } else {
                const count = moduleBindingCounts.get(moduleId) ?? 0;
                const internalCount = moduleInternalCounts.get(moduleId) ?? 0;
                nodes.push(new ModuleNode(
                    moduleId,
                    count,
                    internalCount,
                    indexed.file,
                    mod.loc.line,
                    mod.loc.column,
                ));
            }
        }

        return nodes;
    }

    private getIncludedModuleRefs(moduleIds: string[]): TreeItem[] {
        return moduleIds.map((id) => {
            const indexed = this.indexer.getAllModules().get(id);
            if (indexed) {
                return new IncludedModuleRefNode(
                    id,
                    indexed.file,
                    indexed.module.loc.line,
                    indexed.module.loc.column,
                );
            }
            return new IncludedModuleRefNode(id);
        });
    }

    private getBindingNodesForModule(moduleId: string): TreeItem[] {
        const nodes: BindingNode[] = [];
        const allBindings = this.indexer.getAllBindings();

        for (const [, entries] of allBindings) {
            for (const entry of entries) {
                if (!this._showInternal && entry.binding.internal) continue;

                const isMatch =
                    moduleId === "(standalone)"
                        ? !entry.binding.moduleId
                        : entry.binding.moduleId === moduleId;

                if (isMatch) {
                    nodes.push(new BindingNode(entry.binding, entry.file));
                }
            }
        }

        return nodes.sort((a, b) => a.binding.ref.type.localeCompare(b.binding.ref.type));
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
