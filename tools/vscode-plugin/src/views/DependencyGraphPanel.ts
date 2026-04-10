import * as vscode from "vscode";
import type { ProjectIndexer } from "../indexer/ProjectIndexer.js";
import {
    bindingRefId,
    findDependencyCycles,
    type DIBinding,
} from "@spirex/di-ast-analyzer";

interface CyNodeData {
    id: string;
    parent?: string;
    label: string;
    nodeType: "binding" | "module";
    kind: string;
    lifecycle?: string;
    isCyclic: boolean;
    isInternal?: boolean;
    file?: string;
    line?: number;
    column?: number;
    tooltip?: string;
}

interface CyEdgeData {
    id: string;
    source: string;
    target: string;
    edgeType: "dependency" | "alias" | "includes" | "resolves";
    optional?: boolean;
    resolveMethod?: string;
}

type CyElement =
    | { group: "nodes"; data: CyNodeData }
    | { group: "edges"; data: CyEdgeData };

export class DependencyGraphPanel {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private readonly indexer: ProjectIndexer,
        private readonly extensionUri: vscode.Uri,
    ) {}

    show(): void {
        if (this.panel) {
            this.panel.reveal();
            this.update();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            "spirexDI.dependencyGraph",
            "SpireX DI Graph",
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            },
        );

        this.disposables.push(
            this.panel.webview.onDidReceiveMessage((msg) => {
                if (msg.command === "navigate" && msg.file) {
                    const uri = vscode.Uri.file(msg.file);
                    const pos = new vscode.Position(
                        (msg.line ?? 1) - 1,
                        msg.column ?? 0,
                    );
                    vscode.window.showTextDocument(uri, {
                        selection: new vscode.Range(pos, pos),
                    });
                }
            }),
        );

        this.disposables.push(
            this.panel.onDidDispose(() => {
                this.panel = undefined;
            }),
        );

        this.disposables.push(
            this.indexer.onDidUpdateIndex(() => this.update()),
        );

        this.update();
    }

    private update(): void {
        if (!this.panel) return;
        const data = this.buildGraphData();
        this.panel.webview.html = this.getHtml(data);
    }

    private esc(text: string): string {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    private tag(text: string, cls: string): string {
        return `<span class="${cls}">${this.esc(text)}</span>`;
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

    private buildGraphData(): {
        elements: CyElement[];
    } {
        const elements: CyElement[] = [];
        const nodeIds = new Set<string>();

        const allBindingEntries: { binding: DIBinding; file: string }[] = [];
        for (const [, entries] of this.indexer.getAllBindings()) {
            for (const entry of entries) {
                allBindingEntries.push(entry);
            }
        }

        const allBindings = allBindingEntries.map((e) => e.binding);
        const cycles = findDependencyCycles(allBindings);
        const cyclicIds = new Set<string>();
        for (const { cycle } of cycles) {
            for (const ref of cycle) {
                cyclicIds.add(bindingRefId(ref));
            }
        }

        // --- Pass 1: ALL module nodes ---
        for (const [, indexed] of this.indexer.getAllModules()) {
            const mod = indexed.module;
            const moduleNodeId = `module:${mod.id}`;
            if (nodeIds.has(moduleNodeId)) continue;
            nodeIds.add(moduleNodeId);

            const bindingsInModule: DIBinding[] = [];
            for (const entry of allBindingEntries) {
                if (entry.binding.moduleId === mod.id) {
                    bindingsInModule.push(entry.binding);
                }
            }

            const resolvedIncludes = this.indexer.resolveModuleIncludes(
                mod.includes,
            );
            const includedBy = this.indexer.getModuleIncludedBy(mod.id);

            const tooltipParts: string[] = [];
            tooltipParts.push(
                `<div class="tt-title">${this.esc(mod.id)} ${this.tag(mod.kind, "tt-tag tt-tag-kind")}</div>`,
            );

            if (bindingsInModule.length > 0) {
                tooltipParts.push(`<div class="tt-section"><div class="tt-section-title">Bindings (${bindingsInModule.length})</div>`);
                for (const b of bindingsInModule) {
                    const tags: string[] = [this.tag(b.kind, "tt-tag tt-tag-kind")];
                    if (b.lifecycle) tags.push(this.tag(b.lifecycle, "tt-tag tt-tag-lifecycle"));
                    if (b.internal) tags.push(this.tag("internal", "tt-tag tt-tag-internal"));
                    tooltipParts.push(`<div class="tt-item">${this.esc(b.ref.type)} ${tags.join("")}</div>`);
                }
                tooltipParts.push(`</div>`);
            }

            if (resolvedIncludes.length > 0) {
                tooltipParts.push(
                    `<div class="tt-section"><div class="tt-section-title">Includes</div><div class="tt-item">${resolvedIncludes.map(i => this.esc(i)).join(", ")}</div></div>`,
                );
            }

            if (
                includedBy.modules.length > 0 ||
                includedBy.builders.length > 0
            ) {
                const byParts: string[] = [];
                for (const m of includedBy.modules)
                    byParts.push(this.esc(m.module.id));
                for (const b of includedBy.builders)
                    byParts.push(
                        `Container <span class="tt-dim">${this.esc(this.shortPath(b.file))}:${b.builder.loc.line}</span>`,
                    );
                tooltipParts.push(
                    `<div class="tt-section"><div class="tt-section-title">Included by</div><div class="tt-item">${byParts.join(", ")}</div></div>`,
                );
            }

            tooltipParts.push(
                `<div class="tt-loc">${this.esc(this.shortPath(indexed.file))}:${mod.loc.line}</div>`,
            );

            const tooltipHtml = tooltipParts.join("");

            elements.push({
                group: "nodes",
                data: {
                    id: moduleNodeId,
                    label: mod.id,
                    nodeType: "module",
                    kind: mod.kind,
                    isCyclic: false,
                    file: indexed.file,
                    line: mod.loc.line,
                    column: mod.loc.column,
                    tooltip: tooltipHtml,
                },
            });
        }

        // --- Pass 2: ALL binding nodes (with parent for compound nodes) ---
        for (const entry of allBindingEntries) {
            const { binding, file } = entry;
            const id = bindingRefId(binding.ref);
            if (nodeIds.has(id)) continue;
            nodeIds.add(id);

            const tooltipParts: string[] = [];

            const titleTags: string[] = [this.tag(binding.kind, "tt-tag tt-tag-kind")];
            if (binding.lifecycle) titleTags.push(this.tag(binding.lifecycle, "tt-tag tt-tag-lifecycle"));
            if (binding.internal) titleTags.push(this.tag("internal", "tt-tag tt-tag-internal"));
            if (binding.ifConflict && binding.ifConflict !== "throw")
                titleTags.push(this.tag(binding.ifConflict, "tt-tag tt-tag-optional"));
            tooltipParts.push(`<div class="tt-title">${this.esc(binding.ref.type)} ${titleTags.join("")}</div>`);

            if (binding.moduleId)
                tooltipParts.push(`<div class="tt-dim" style="font-size:11px">Module: ${this.esc(binding.moduleId)}</div>`);

            if (binding.resolverDeps && binding.resolverDeps.length > 0) {
                tooltipParts.push(`<div class="tt-section"><div class="tt-section-title">Dependencies</div>`);
                for (const rd of binding.resolverDeps) {
                    const optTag = rd.optional ? ` ${this.tag("optional", "tt-tag tt-tag-optional")}` : "";
                    tooltipParts.push(
                        `<div class="tt-item">r.${this.esc(rd.method)}("${this.esc(rd.ref.type)}")${optTag}</div>`,
                    );
                }
                tooltipParts.push(`</div>`);
            } else if (binding.dependencies.length > 0) {
                tooltipParts.push(`<div class="tt-section"><div class="tt-section-title">Dependencies</div>`);
                for (const dep of binding.dependencies) {
                    tooltipParts.push(`<div class="tt-item">${this.esc(dep.type)}</div>`);
                }
                tooltipParts.push(`</div>`);
            }

            if (binding.aliasOrigin) {
                tooltipParts.push(
                    `<div class="tt-section"><div class="tt-section-title">Alias for</div><div class="tt-item">${this.esc(binding.aliasOrigin.type)}</div></div>`,
                );
            }

            tooltipParts.push(
                `<div class="tt-loc">${this.esc(this.shortPath(file))}:${binding.loc.line}</div>`,
            );

            const tooltipHtml = tooltipParts.join("");

            const parentId = binding.moduleId
                ? `module:${binding.moduleId}`
                : undefined;

            elements.push({
                group: "nodes",
                data: {
                    id,
                    parent: parentId && nodeIds.has(parentId)
                        ? parentId
                        : undefined,
                    label: binding.ref.type,
                    nodeType: "binding",
                    kind: binding.kind,
                    lifecycle: binding.lifecycle,
                    isCyclic: cyclicIds.has(id),
                    isInternal: binding.internal ?? false,
                    file,
                    line: binding.loc.line,
                    column: binding.loc.column,
                    tooltip: tooltipHtml,
                },
            });
        }

        // --- Pass 3: dependency + alias edges ---
        let edgeCounter = 0;
        for (const entry of allBindingEntries) {
            const { binding } = entry;
            const sourceId = bindingRefId(binding.ref);

            const resolverDepMap = new Map<string, { optional: boolean; method: string }>();
            if (binding.resolverDeps) {
                for (const rd of binding.resolverDeps) {
                    resolverDepMap.set(bindingRefId(rd.ref), {
                        optional: rd.optional,
                        method: rd.method,
                    });
                }
            }

            for (const dep of binding.dependencies) {
                const depId = bindingRefId(dep);
                if (!nodeIds.has(depId)) {
                    nodeIds.add(depId);
                    elements.push({
                        group: "nodes",
                        data: {
                            id: depId,
                            label: dep.type,
                            nodeType: "binding",
                            kind: "unknown",
                            isCyclic: cyclicIds.has(depId),
                            tooltip: `<div class="tt-title">${this.esc(dep.type)}</div><div class="tt-dim">Unresolved — no binding found</div>`,
                        },
                    });
                }
                const rdInfo = resolverDepMap.get(depId);
                elements.push({
                    group: "edges",
                    data: {
                        id: `e${edgeCounter++}`,
                        source: sourceId,
                        target: depId,
                        edgeType: "dependency",
                        optional: rdInfo?.optional,
                        resolveMethod: rdInfo?.method,
                    },
                });
            }

            if (binding.aliasOrigin) {
                const originId = bindingRefId(binding.aliasOrigin);
                elements.push({
                    group: "edges",
                    data: {
                        id: `e${edgeCounter++}`,
                        source: sourceId,
                        target: originId,
                        edgeType: "alias",
                    },
                });
            }
        }

        // --- Pass 4: inclusion edges (module -> module) ---
        for (const [, indexed] of this.indexer.getAllModules()) {
            const mod = indexed.module;
            const moduleNodeId = `module:${mod.id}`;

            const resolvedIncludes = this.indexer.resolveModuleIncludes(
                mod.includes,
            );
            for (const includedId of resolvedIncludes) {
                const targetId = `module:${includedId}`;
                if (!nodeIds.has(targetId)) {
                    nodeIds.add(targetId);
                    elements.push({
                        group: "nodes",
                        data: {
                            id: targetId,
                            label: includedId,
                            nodeType: "module",
                            kind: "unknown",
                            isCyclic: false,
                            tooltip: `<div class="tt-title">${this.esc(includedId)}</div><div class="tt-dim">Unresolved — module not found in index</div>`,
                        },
                    });
                }
                elements.push({
                    group: "edges",
                    data: {
                        id: `e${edgeCounter++}`,
                        source: moduleNodeId,
                        target: targetId,
                        edgeType: "includes",
                    },
                });
            }
        }

        return { elements };
    }

    private getHtml(data: {
        elements: CyElement[];
    }): string {
        const webview = this.panel!.webview;
        const cyUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "dist", "cytoscape.min.js"),
        );
        const coseBilkentUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                this.extensionUri,
                "dist",
                "cytoscape-cose-bilkent.js",
            ),
        );

        const graphJson = JSON.stringify(data);

        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpireX DI Graph</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            overflow: hidden;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
        }
        #cy {
            width: 100vw;
            height: 100vh;
        }
        #controls {
            position: fixed;
            top: 10px;
            left: 10px;
            background: var(--vscode-editorWidget-background);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            border: 1px solid var(--vscode-editorWidget-border, transparent);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10;
            flex-wrap: wrap;
        }
        #controls label {
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
        }
        #controls button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 3px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }
        #controls button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        #legend {
            position: fixed;
            top: 10px;
            right: 10px;
            background: var(--vscode-editorWidget-background);
            padding: 10px;
            border-radius: 4px;
            font-size: 11px;
            border: 1px solid var(--vscode-editorWidget-border, transparent);
            z-index: 10;
        }
        .legend-section {
            font-weight: bold;
            margin-top: 6px;
            margin-bottom: 2px;
            opacity: 0.8;
        }
        .legend-section:first-child { margin-top: 0; }
        .legend-item {
            display: flex;
            align-items: center;
            margin: 3px 0;
        }
        .legend-dot {
            width: 10px;
            height: 10px;
            min-width: 10px;
            min-height: 10px;
            border-radius: 50%;
            margin-right: 6px;
            flex-shrink: 0;
        }
        .legend-rect {
            width: 14px;
            height: 9px;
            min-width: 14px;
            min-height: 9px;
            border-radius: 3px;
            margin-right: 6px;
            flex-shrink: 0;
        }
        
        .lc-singleton { background-color: #4fc3f7; }
        .lc-lazy { background-color: #81c784; }
        .lc-scope { background-color: #ffb74d; }
        .lc-transient { background-color: #e57373; }
        .lc-unknown { background-color: #90a4ae; }
        .module-bg { background-color: #ff9800; }
        #tooltip {
            position: absolute;
            display: none;
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border, #555);
            padding: 8px 12px;
            border-radius: 4px;
            pointer-events: none;
            z-index: 100;
            max-width: 460px;
            font-size: 12px;
            line-height: 1.5;
        }
        #tooltip .tt-title {
            font-weight: bold;
            margin-bottom: 4px;
        }
        #tooltip .tt-section {
            margin-top: 5px;
            color: var(--vscode-descriptionForeground, #aaa);
            font-size: 11px;
        }
        #tooltip .tt-section-title {
            font-weight: 600;
            color: var(--vscode-foreground, #ccc);
            margin-bottom: 2px;
        }
        #tooltip .tt-item {
            padding-left: 10px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
        }
        #tooltip .tt-dim {
            color: var(--vscode-descriptionForeground, #888);
        }
        #tooltip .tt-tag {
            display: inline-block;
            padding: 0 4px;
            border-radius: 3px;
            font-size: 10px;
            margin-left: 4px;
        }
        #tooltip .tt-tag-kind {
            background: rgba(144, 164, 174, 0.25);
            color: #b0bec5;
        }
        #tooltip .tt-tag-lifecycle {
            background: rgba(79, 195, 247, 0.2);
            color: #4fc3f7;
        }
        #tooltip .tt-tag-optional {
            background: rgba(255, 183, 77, 0.2);
            color: #ffb74d;
        }
        #tooltip .tt-tag-internal {
            background: rgba(239, 83, 80, 0.2);
            color: #ef5350;
        }
        #tooltip .tt-loc {
            margin-top: 5px;
            font-size: 10px;
            color: var(--vscode-descriptionForeground, #777);
        }
    </style>
</head>
<body>
    <div id="controls">
        <label><input type="checkbox" id="toggleBindings" checked> Bindings</label>
        <label><input type="checkbox" id="toggleInternal" checked> Internal</label>
    </div>
    <div id="legend">
        <div class="legend-section">Lifecycle</div>
        <div class="legend-item"><span class="legend-dot lc-singleton"></span>singleton</div>
        <div class="legend-item"><span class="legend-dot lc-lazy"></span>lazy</div>
        <div class="legend-item"><span class="legend-dot lc-scope"></span>scope</div>
        <div class="legend-item"><span class="legend-dot lc-transient"></span>transient</div>
        <div class="legend-item"><span class="legend-dot" style="border: 2px solid #f44336;"></span>cyclic</div>
        <div class="legend-section">Node Type</div>
        <div class="legend-item"><span class="legend-dot lc-unknown"></span>binding</div>
        <div class="legend-item"><span class="legend-rect module-bg"></span>module</div>
        <div class="legend-section">Edges</div>
        <div class="legend-item"><span style="width:18px;height:2px;margin-right:6px;flex-shrink:0;background:#6a8fa8;opacity:0.5;"></span>dependency</div>
        <div class="legend-item"><span style="width:18px;height:0;margin-right:6px;flex-shrink:0;border-top:2px dashed #6a8fa8;opacity:0.4;"></span>optional dep</div>
        <div class="legend-item"><span style="width:18px;height:0;margin-right:6px;flex-shrink:0;border-top:2px dashed #9c7aad;opacity:0.5;"></span>alias</div>
        <div class="legend-item"><span style="width:18px;height:0;margin-right:6px;flex-shrink:0;border-top:2px dashed #c88a30;opacity:0.5;"></span>includes</div>
    </div>
    <div id="cy"></div>
    <div id="tooltip"></div>

    <script src="${cyUri}"></script>
    <script src="${coseBilkentUri}"></script>
    <script>
    (function() {
        const vscodeApi = acquireVsCodeApi();
        const graphData = ${graphJson};
        const tooltipEl = document.getElementById('tooltip');
        const collapsedModules = new Set();

        if (typeof cytoscapeCoseBilkent !== 'undefined') {
            cytoscape.use(cytoscapeCoseBilkent);
        }

        const cy = cytoscape({
            container: document.getElementById('cy'),
            elements: graphData.elements,
            minZoom: 0.1,
            maxZoom: 3,
            wheelSensitivity: 0.3,
            boxSelectionEnabled: false,
            style: [
                {
                    selector: 'node[nodeType="module"]',
                    style: {
                        'shape': 'round-rectangle',
                        'background-color': '#ff9800',
                        'background-opacity': 0.15,
                        'border-width': 2,
                        'border-color': '#ff9800',
                        'label': 'data(label)',
                        'text-valign': 'top',
                        'text-halign': 'center',
                        'font-size': 13,
                        'font-weight': 'bold',
                        'color': '#ff9800',
                        'text-margin-y': -8,
                        'padding': '30px',
                        'min-width': '80px',
                        'min-height': '40px',
                    }
                },
                {
                    selector: 'node[nodeType="binding"]',
                    style: {
                        'shape': 'ellipse',
                        'width': 24,
                        'height': 24,
                        'background-color': '#90a4ae',
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'right',
                        'font-size': 11,
                        'color': '#e8e8e8',
                        'text-margin-x': 6,
                        'text-background-color': '#1e1e1e',
                        'text-background-opacity': 0.7,
                        'text-background-padding': '2px',
                        'text-background-shape': 'roundrectangle',
                    }
                },
                {
                    selector: 'node[nodeType="binding"][lifecycle="singleton"]',
                    style: { 'background-color': '#4fc3f7' }
                },
                {
                    selector: 'node[nodeType="binding"][lifecycle="lazy"]',
                    style: { 'background-color': '#81c784' }
                },
                {
                    selector: 'node[nodeType="binding"][lifecycle="scope"]',
                    style: { 'background-color': '#ffb74d' }
                },
                {
                    selector: 'node[nodeType="binding"][lifecycle="transient"]',
                    style: { 'background-color': '#e57373' }
                },
                {
                    selector: 'node[?isCyclic]',
                    style: {
                        'border-width': 3,
                        'border-color': '#f44336',
                    }
                },
                {
                    selector: 'node[?isInternal]',
                    style: {
                        'border-width': 2,
                        'border-style': 'dashed',
                        'border-color': '#ef5350',
                        'opacity': 0.6,
                    }
                },
                {
                    selector: 'edge[edgeType="dependency"]',
                    style: {
                        'line-color': '#6a8fa8',
                        'target-arrow-color': '#6a8fa8',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'width': 1,
                        'arrow-scale': 0.6,
                        'opacity': 0.4,
                    }
                },
                {
                    selector: 'edge[?optional]',
                    style: {
                        'line-style': 'dashed',
                        'line-dash-pattern': [6, 4],
                        'opacity': 0.3,
                    }
                },
                {
                    selector: 'edge[edgeType="alias"]',
                    style: {
                        'line-color': '#9c7aad',
                        'target-arrow-color': '#9c7aad',
                        'target-arrow-shape': 'triangle',
                        'line-style': 'dashed',
                        'curve-style': 'bezier',
                        'width': 1,
                        'arrow-scale': 0.6,
                        'opacity': 0.45,
                    }
                },
                {
                    selector: 'edge[edgeType="includes"]',
                    style: {
                        'line-color': '#c88a30',
                        'target-arrow-color': '#c88a30',
                        'target-arrow-shape': 'triangle',
                        'line-style': 'dashed',
                        'curve-style': 'bezier',
                        'width': 1.5,
                        'arrow-scale': 0.7,
                        'opacity': 0.5,
                    }
                },
                
            ],
            layout: {
                name: 'cose-bilkent',
                animate: false,
                idealEdgeLength: 200,
                nodeRepulsion: 20000,
                edgeElasticity: 0.05,
                nestingFactor: 0.15,
                gravity: 0.15,
                gravityRange: 1.5,
                numIter: 2500,
                tile: true,
                tilingPaddingVertical: 30,
                tilingPaddingHorizontal: 30,
                nodeDimensionsIncludeLabels: true,
            },
        });

        cy.fit(undefined, 40);
        if (cy.zoom() > 1.5) cy.zoom({ level: 1.5, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });

        // --- Click to navigate ---
        cy.on('tap', 'node', function(evt) {
            const node = evt.target;
            const d = node.data();
            if (d.file) {
                vscodeApi.postMessage({
                    command: 'navigate',
                    file: d.file,
                    line: d.line,
                    column: d.column,
                });
            }
        });

        // --- Hover tooltips ---
        cy.on('mouseover', 'node', function(evt) {
            const node = evt.target;
            const tip = node.data('tooltip');
            if (tip) {
                tooltipEl.innerHTML = tip;
                tooltipEl.style.display = 'block';
                const pos = evt.renderedPosition || evt.position;
                const rect = cy.container().getBoundingClientRect();
                tooltipEl.style.left = (rect.left + pos.x + 15) + 'px';
                tooltipEl.style.top = (rect.top + pos.y + 15) + 'px';
            }
        });

        cy.on('mousemove', 'node', function(evt) {
            if (tooltipEl.style.display === 'block') {
                const pos = evt.renderedPosition || evt.position;
                const rect = cy.container().getBoundingClientRect();
                tooltipEl.style.left = (rect.left + pos.x + 15) + 'px';
                tooltipEl.style.top = (rect.top + pos.y + 15) + 'px';
            }
        });

        cy.on('mouseout', 'node', function() {
            tooltipEl.style.display = 'none';
        });

        // --- Double-click module to expand/collapse ---
        cy.on('dbltap', 'node[nodeType="module"]', function(evt) {
            const moduleNode = evt.target;
            const moduleId = moduleNode.id();
            if (collapsedModules.has(moduleId)) {
                expandModule(moduleId);
            } else {
                collapseModule(moduleId);
            }
        });

        function collapseModule(moduleId) {
            const moduleNode = cy.$('#' + CSS.escape(moduleId));
            const children = moduleNode.children();
            if (children.length === 0) return;
            children.connectedEdges().hide();
            children.hide();
            collapsedModules.add(moduleId);
        }

        function expandModule(moduleId) {
            collapsedModules.delete(moduleId);
            refreshBindingVisibility();
        }

        function refreshBindingVisibility() {
            const showBindings = document.getElementById('toggleBindings').checked;
            const showInternal = document.getElementById('toggleInternal').checked;
            const bindingNodes = cy.nodes('[nodeType="binding"]');

            bindingNodes.forEach(function(node) {
                const parentId = node.data('parent');
                const isCollapsed = parentId && collapsedModules.has(parentId);
                const isInternal = node.data('isInternal');
                const shouldShow = showBindings && !isCollapsed && (showInternal || !isInternal);
                if (shouldShow) node.show(); else node.hide();
            });

            bindingNodes.connectedEdges().forEach(function(edge) {
                const src = edge.source();
                const tgt = edge.target();
                if (src.visible() && tgt.visible()) edge.show(); else edge.hide();
            });
        }

        document.getElementById('toggleBindings').addEventListener('change', refreshBindingVisibility);
        document.getElementById('toggleInternal').addEventListener('change', refreshBindingVisibility);

        
    })();
    </script>
</body>
</html>`;
    }

    dispose(): void {
        this.panel?.dispose();
        for (const d of this.disposables) d.dispose();
        this.disposables = [];
    }
}
