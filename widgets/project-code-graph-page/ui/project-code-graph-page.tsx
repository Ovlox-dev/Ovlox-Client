"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Network, Boxes, Loader2, Search, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApiError } from "@/hooks/useApiError";
import { useListRepositories } from "@/entities/project";
import { getFileSymbols, getNeighbors, getProjectGraph, useCodeTree } from "@/entities/code-graph";
import { useCapabilityGraph, useCapabilityFiles, useFileGraph } from "@/entities/knowledge";

// react-force-graph renders to canvas — it must not run during SSR. The dynamic() wrapper erases the
// component's generic prop types, so we widen to a permissive component type here.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false }) as React.ComponentType<Record<string, unknown>>;

interface GNode {
    id: string;
    label: string;
    type: string;
    fileCount?: number;
    desc?: string | null;
    path?: string;
    signature?: string | null;
    riskScore?: number | null;
    repositoryId?: string;
    moduleKey?: string;
}
interface GLink { source: string; target: string; relation: string; weight?: number; }

// Drill-down navigation: Capabilities → inside a capability (its files) → inside a file (its functions).
// Capabilities are repo-scoped (a project can hold multiple repos), so a capability carries its repo id.
type NavLevel =
    | { kind: "caps" }
    | { kind: "capability"; repositoryId: string; moduleKey: string; label: string; description: string | null }
    | { kind: "file"; fileId: string; path: string };

function repoShort(name: string | null | undefined): string {
    if (!name) { return ""; }
    return name.split("/").pop() || name;
}

const NODE_COLORS: Record<string, string> = {
    CODE_FILE: "#38bdf8", FILE: "#38bdf8",
    FUNCTION: "#4af3d9", METHOD: "#4af3d9",
    SYMBOL: "#a78bff", CLASS: "#a78bff", INTERFACE: "#a78bff",
};
function symbolColor(type: string): string { return NODE_COLORS[type] ?? "#a8a8b2"; }
function fileRiskColor(score?: number | null): string {
    const s = score ?? 0;
    if (s >= 50) { return "#ff5b6e"; }
    if (s >= 25) { return "#ff8a3d"; }
    return "#38bdf8";
}

const CAP_PALETTE = ["#c8ff3e", "#4af3d9", "#a78bff", "#38bdf8", "#fbbf24", "#ff8a3d", "#7cf66f", "#ff5b6e", "#6fb6ff"];

function endpointId(end: unknown): string {
    return typeof end === "object" && end !== null ? String((end as { id: string }).id) : String(end);
}
function relationLabel(rel: string): string {
    return rel === "DEPENDS_ON" ? "depends on" : rel.toLowerCase().replace(/_/g, " ");
}

/**
 * Codebase graph explorer. "Capabilities" is a drill-down: capability areas → the files inside one →
 * the functions inside a file and how they call each other. Breadcrumb + Back navigate the hierarchy.
 * "Code structure" is the manual file/symbol deep dive.
 */
export function ProjectCodeGraphPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const [mode, setMode] = React.useState<"capabilities" | "code">("capabilities");
    const [repositoryId, setRepositoryId] = React.useState<string | undefined>(undefined);
    const [seedFileId, setSeedFileId] = React.useState<string | undefined>(undefined);
    const [filter, setFilter] = React.useState("");

    const caps = mode === "capabilities";
    const [nav, setNav] = React.useState<NavLevel[]>([{ kind: "caps" }]);
    const current = nav[nav.length - 1];

    const reposQuery = useListRepositories(organizationId, projectId);
    const treeQuery = useCodeTree(organizationId, projectId, repositoryId);

    const capGraphQ = useCapabilityGraph(organizationId, projectId, repositoryId, caps && current.kind === "caps");
    const capFilesQ = useCapabilityFiles(organizationId, projectId, current.kind === "capability" ? current.repositoryId : undefined, current.kind === "capability" ? current.moduleKey : undefined, caps);
    const fileGraphQ = useFileGraph(organizationId, projectId, current.kind === "file" ? current.fileId : undefined, caps);
    useApiError(capGraphQ.error);
    useApiError(capFilesQ.error);
    useApiError(fileGraphQ.error);
    useApiError(treeQuery.error);

    // Code-structure mode state (file-seeded, lazily expanded).
    const [nodes, setNodes] = React.useState<GNode[]>([]);
    const [links, setLinks] = React.useState<GLink[]>([]);
    const expanded = React.useRef<Set<string>>(new Set());
    const [selected, setSelected] = React.useState<GNode | null>(null);
    const [loadingNode, setLoadingNode] = React.useState<string | null>(null);
    const [seeding, setSeeding] = React.useState(false);

    const [isFullscreen, setIsFullscreen] = React.useState(false);
    React.useEffect(() => {
        if (!isFullscreen) { return; }
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setIsFullscreen(false); } };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isFullscreen]);

    const switchMode = React.useCallback((next: "capabilities" | "code") => {
        setMode(next);
        setSelected(null);
        setNav([{ kind: "caps" }]);
    }, []);

    // Reset the drill stack when the repo filter changes.
    React.useEffect(() => { setNav([{ kind: "caps" }]); setSelected(null); }, [repositoryId]);

    const navTo = React.useCallback((index: number) => {
        setNav((prev) => prev.slice(0, index + 1));
        setSelected(null);
    }, []);
    const back = React.useCallback(() => {
        setNav((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
        setSelected(null);
    }, []);

    /* ----------------------------- code-structure mode ----------------------------- */
    const fileNodes = React.useMemo(
        () => (treeQuery.data ?? []).filter((n) => n.kind === "FILE" && n.codeFileId)
            .filter((n) => !filter || n.path.toLowerCase().includes(filter.toLowerCase())),
        [treeQuery.data, filter],
    );
    const seedFromFile = React.useCallback(async (fileId: string) => {
        setSeedFileId(fileId);
        setSeeding(true);
        try {
            const symbols = await getFileSymbols(organizationId, projectId, fileId);
            setNodes(symbols.map((s) => ({ id: s.id, label: s.qualifiedName || s.name, type: s.kind })));
            setLinks([]);
            expanded.current = new Set();
            setSelected(null);
            if (symbols.length === 0) { toast.message("No symbols indexed for this file."); }
        } finally { setSeeding(false); }
    }, [organizationId, projectId]);
    const loadProjectGraph = React.useCallback(async () => {
        setSeedFileId(undefined);
        setSeeding(true);
        try {
            const g = await getProjectGraph(organizationId, projectId, repositoryId);
            setNodes(g.nodes.map((n) => ({ id: n.id, label: n.path.split("/").pop() || n.path, type: "CODE_FILE" })));
            setLinks(g.links.map((l) => ({ source: l.source, target: l.target, relation: l.relation })));
            expanded.current = new Set();
            setSelected(null);
            if (g.nodes.length === 0) { toast.message("No file-dependency edges indexed yet for this project."); }
        } finally { setSeeding(false); }
    }, [organizationId, projectId, repositoryId]);
    const expandNode = React.useCallback(async (nodeId: string) => {
        if (expanded.current.has(nodeId)) { return; }
        expanded.current.add(nodeId);
        setLoadingNode(nodeId);
        try {
            const res = await getNeighbors(organizationId, projectId, nodeId, "both");
            if (res.neighbors.length === 0) { toast.message("No connections found for this node."); }
            setNodes((prev) => {
                const ids = new Set(prev.map((n) => n.id));
                const additions = res.neighbors.filter((nb) => !ids.has(nb.neighborId)).map((nb) => ({ id: nb.neighborId, label: nb.label, type: nb.neighborType }));
                return [...prev, ...additions];
            });
            setLinks((prev) => {
                const key = (l: GLink) => `${l.source}->${l.target}:${l.relation}`;
                const seen = new Set(prev.map(key));
                const additions = res.neighbors
                    .map((nb) => nb.direction === "out" ? { source: nodeId, target: nb.neighborId, relation: nb.relation } : { source: nb.neighborId, target: nodeId, relation: nb.relation })
                    .filter((l) => !seen.has(key(l)));
                return [...prev, ...additions];
            });
        } catch { expanded.current.delete(nodeId); } finally { setLoadingNode(null); }
    }, [organizationId, projectId]);

    /* ----------------------------- capabilities mode (per level) ----------------------------- */
    const capColors = React.useMemo(() => {
        const m = new Map<string, string>();
        [...(capGraphQ.data?.nodes ?? [])].sort((a, b) => a.moduleKey.localeCompare(b.moduleKey)).forEach((n, i) => m.set(n.id, CAP_PALETTE[i % CAP_PALETTE.length]));
        return m;
    }, [capGraphQ.data]);
    // A project can span multiple repos; when it does, disambiguate same-named capabilities by repo.
    const multiRepo = (capGraphQ.data?.counts.repositories ?? 1) > 1;

    const capNodes = React.useMemo<GNode[]>(() => {
        const repos = capGraphQ.data?.counts.repositories ?? 1;
        return (capGraphQ.data?.nodes ?? []).map((c) => ({
            id: c.id,
            label: repos > 1 && c.repositoryName ? `${c.label} · ${repoShort(c.repositoryName)}` : c.label,
            type: "CAPABILITY",
            fileCount: c.fileCount,
            desc: c.description,
            repositoryId: c.repositoryId,
            moduleKey: c.moduleKey,
        }));
    }, [capGraphQ.data]);
    const capLinks = React.useMemo<GLink[]>(() => (capGraphQ.data?.links ?? []).map((c) => ({ source: c.source, target: c.target, relation: c.relation, weight: c.weight })), [capGraphQ.data]);

    const fileNodesG = React.useMemo<GNode[]>(() => (capFilesQ.data?.nodes ?? []).map((f) => ({ id: f.id, label: f.name, type: "FILE", path: f.path, desc: f.intent, riskScore: f.riskScore })), [capFilesQ.data]);
    const fileLinksG = React.useMemo<GLink[]>(() => (capFilesQ.data?.links ?? []).map((l) => ({ source: l.source, target: l.target, relation: l.relation })), [capFilesQ.data]);

    const symbolNodesG = React.useMemo<GNode[]>(() => (fileGraphQ.data?.nodes ?? []).map((s) => ({ id: s.id, label: s.label, type: s.type, signature: s.signature })), [fileGraphQ.data]);
    const symbolLinksG = React.useMemo<GLink[]>(() => (fileGraphQ.data?.links ?? []).map((l) => ({ source: l.source, target: l.target, relation: l.relation })), [fileGraphQ.data]);

    // Resolve the active level's nodes/links/loading.
    let displayNodes: GNode[] = nodes;
    let displayLinks: GLink[] = links;
    let showLoader = seeding;
    if (caps) {
        if (current.kind === "caps") { displayNodes = capNodes; displayLinks = capLinks; showLoader = capGraphQ.isPending; }
        else if (current.kind === "capability") { displayNodes = fileNodesG; displayLinks = fileLinksG; showLoader = capFilesQ.isPending; }
        else { displayNodes = symbolNodesG; displayLinks = symbolLinksG; showLoader = fileGraphQ.isPending; }
    }
    const graphData = React.useMemo(() => ({ nodes: displayNodes, links: displayLinks }), [displayNodes, displayLinks]);
    const labelAllEdges = displayLinks.length <= 16;

    const nodeFill = React.useCallback((node: GNode): string => {
        if (!caps) { return symbolColor(node.type); }
        if (current.kind === "caps") { return capColors.get(node.id) ?? "#c8ff3e"; }
        if (current.kind === "capability") { return fileRiskColor(node.riskScore); }
        return symbolColor(node.type);
    }, [caps, current.kind, capColors]);

    const nodeRadius = React.useCallback((node: GNode): number => {
        if (caps && current.kind === "caps") { return 6 + Math.sqrt(node.fileCount ?? 1) * 1.6; }
        return 4.5;
    }, [caps, current.kind]);

    const onNodeClick = React.useCallback((n: GNode) => {
        if (!caps) { setSelected(n); void expandNode(n.id); return; }
        if (current.kind === "caps") {
            setNav((prev) => [...prev, { kind: "capability", repositoryId: n.repositoryId ?? "", moduleKey: n.moduleKey ?? "", label: n.label, description: n.desc ?? null }]);
            setSelected(null);
        } else if (current.kind === "capability") {
            setNav((prev) => [...prev, { kind: "file", fileId: n.id, path: n.path ?? n.label }]);
            setSelected(null);
        } else {
            setSelected(n); // symbol detail
        }
    }, [caps, current, expandNode]);

    // Detail for the selected symbol (file level) or code-mode node.
    const fileMeta = caps && current.kind === "file" ? fileGraphQ.data?.file ?? null : null;

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
            <header className="space-y-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                        <Network className="size-6" /> Graph
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {caps
                            ? "Your codebase as capability areas connected by real import dependencies. Click a capability to go inside it, then a file to see its functions and how they call each other."
                            : "Load the whole-project dependency graph, or pick a file to seed from its symbols — then click any node to expand its callers and callees."}
                    </p>
                </div>
                <div className="inline-flex rounded-[8px] border border-(--line) bg-(--bg-2) p-0.5 text-sm">
                    <button type="button" onClick={() => switchMode("capabilities")} className={`flex items-center gap-1.5 px-3 py-1 rounded-[6px] ${caps ? "bg-(--bg-3) text-(--fg)" : "text-(--fg-3)"}`}>
                        <Boxes className="size-3.5" /> Capabilities
                    </button>
                    <button type="button" onClick={() => switchMode("code")} className={`px-3 py-1 rounded-[6px] ${!caps ? "bg-(--bg-3) text-(--fg)" : "text-(--fg-3)"}`}>
                        Code structure
                    </button>
                </div>
            </header>

            {/* Breadcrumb + back (capabilities drill-down). */}
            {caps ? (
                <div className="flex items-center gap-2 text-sm">
                    {nav.length > 1 ? (
                        <Button variant="outline" size="sm" className="h-7" onClick={back}><ChevronLeft className="size-3.5" /> Back</Button>
                    ) : null}
                    <div className="flex items-center gap-1 min-w-0 flex-wrap text-(--fg-3)">
                        {nav.map((lvl, i) => {
                            const label = lvl.kind === "caps" ? "Capabilities" : lvl.kind === "capability" ? lvl.label : (lvl.path.split("/").pop() || lvl.path);
                            const isLast = i === nav.length - 1;
                            return (
                                <span key={i} className="flex items-center gap-1">
                                    {i > 0 ? <ChevronRight className="size-3 text-(--fg-3)" /> : null}
                                    <button type="button" disabled={isLast} onClick={() => navTo(i)} className={`truncate max-w-[200px] ${isLast ? "text-(--fg) font-medium" : "hover:text-(--fg)"}`}>{label}</button>
                                </span>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
                {/* Sidebar */}
                {caps ? (
                    <Card className="p-3 max-h-[70vh] overflow-y-auto space-y-3">
                        {(reposQuery.data?.length ?? 0) > 1 && current.kind === "caps" ? (
                            <select className="w-full rounded-[8px] border border-(--line) bg-(--bg-2) px-2 py-1.5 text-sm" value={repositoryId ?? "all"} onChange={(e) => setRepositoryId(e.target.value === "all" ? undefined : e.target.value)}>
                                <option value="all">All repositories</option>
                                {reposQuery.data!.map((r) => <option key={r.id} value={r.id}>{r.name ?? r.id}</option>)}
                            </select>
                        ) : null}

                        {current.kind === "caps" ? (
                            <>
                                <p className="text-[10px] uppercase tracking-wider text-(--fg-3)">Capabilities</p>
                                {capGraphQ.isPending ? (
                                    <div className="flex items-center gap-2 text-sm text-(--fg-3) p-1"><Loader2 className="size-4 animate-spin" /> Mapping…</div>
                                ) : (
                                    <ul className="space-y-1">
                                        {[...(capGraphQ.data?.nodes ?? [])].sort((a, b) => b.fileCount - a.fileCount).map((c) => (
                                            <li key={c.id}>
                                                <button type="button" onClick={() => onNodeClick({ id: c.id, label: c.label, type: "CAPABILITY", fileCount: c.fileCount, desc: c.description, repositoryId: c.repositoryId, moduleKey: c.moduleKey })} className="flex w-full items-center gap-2 rounded-[6px] px-1.5 py-1 text-left text-sm text-(--fg-2) hover:bg-(--bg-3)">
                                                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: capColors.get(c.id) ?? "#c8ff3e" }} />
                                                    <span className="truncate">{c.label}{multiRepo && c.repositoryName ? <span className="text-(--fg-3)"> · {repoShort(c.repositoryName)}</span> : null}</span>
                                                    <span className="ml-auto font-mono text-[10px] text-(--fg-3)">{c.fileCount}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {capGraphQ.data ? (
                                    <div className="pt-2 border-t border-(--line) text-xs text-(--fg-3) space-y-0.5">
                                        {multiRepo ? <p>{capGraphQ.data.counts.repositories} repositories</p> : null}
                                        <p>{capGraphQ.data.counts.capabilities} capabilities</p>
                                        <p>{capGraphQ.data.counts.files} files</p>
                                        <p>{capGraphQ.data.counts.dependencies} dependencies</p>
                                    </div>
                                ) : null}
                                <p className="text-[11px] text-(--fg-3) pt-1">Arrows are real <span className="text-(--fg-2)">import dependencies</span>. Click a capability to open it.</p>
                            </>
                        ) : current.kind === "capability" ? (
                            <>
                                <p className="text-sm font-medium text-(--fg)">{current.label}</p>
                                {current.description ? <p className="text-[12px] text-(--fg-2) leading-relaxed">{current.description}</p> : null}
                                <p className="text-[10px] uppercase tracking-wider text-(--fg-3) pt-1">Files ({capFilesQ.data?.nodes.length ?? 0})</p>
                                <ul className="space-y-0.5 text-sm">
                                    {(capFilesQ.data?.nodes ?? []).map((f) => (
                                        <li key={f.id}>
                                            <button type="button" onClick={() => onNodeClick({ id: f.id, label: f.name, type: "FILE", path: f.path, desc: f.intent, riskScore: f.riskScore })} className="block w-full truncate rounded-[6px] px-1.5 py-1 text-left text-(--fg-2) hover:bg-(--bg-3)" title={f.path}>
                                                {f.name}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-[11px] text-(--fg-3) pt-1">Arrows are <span className="text-(--fg-2)">imports</span> between these files. Click a file to see its functions.</p>
                            </>
                        ) : (
                            <>
                                <p className="font-mono text-xs text-(--fg) break-all">{current.path}</p>
                                {fileMeta?.intent ? <p className="text-[12px] text-(--fg-2) leading-relaxed">{fileMeta.intent}</p> : null}
                                {fileMeta?.howToWork ? (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-(--fg-3) mb-0.5">How to work with it</p>
                                        <p className="text-[12px] text-(--fg-2) leading-relaxed">{fileMeta.howToWork}</p>
                                    </div>
                                ) : null}
                                <p className="text-[11px] text-(--fg-3) pt-1">Nodes are functions/classes; arrows are <span className="text-(--fg-2)">calls</span> between them.</p>
                            </>
                        )}
                    </Card>
                ) : (
                    <Card className="p-3 max-h-[70vh] overflow-y-auto space-y-2">
                        {(reposQuery.data?.length ?? 0) > 1 ? (
                            <select className="w-full rounded-[8px] border border-(--line) bg-(--bg-2) px-2 py-1.5 text-sm" value={repositoryId ?? "all"} onChange={(e) => setRepositoryId(e.target.value === "all" ? undefined : e.target.value)}>
                                <option value="all">All repositories</option>
                                {reposQuery.data!.map((r) => <option key={r.id} value={r.id}>{r.name ?? r.id}</option>)}
                            </select>
                        ) : null}
                        <Button variant="outline" size="sm" className="w-full" onClick={() => void loadProjectGraph()} disabled={seeding}><Network className="size-4" /> Whole-project graph</Button>
                        <p className="text-[10px] uppercase tracking-wider text-(--fg-3) px-1 pt-1">or seed from a file</p>
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-(--fg-3)" />
                            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter files…" className="pl-7 h-8 text-sm" />
                        </div>
                        {treeQuery.isPending ? (
                            <div className="flex items-center gap-2 text-sm text-(--fg-3) p-1"><Loader2 className="size-4 animate-spin" /> Loading…</div>
                        ) : (
                            <ul className="text-sm">
                                {fileNodes.slice(0, 300).map((n) => (
                                    <li key={n.id}>
                                        <button type="button" onClick={() => void seedFromFile(n.codeFileId!)} className={`block w-full text-left truncate rounded-[6px] px-1.5 py-1 hover:bg-(--bg-3) ${seedFileId === n.codeFileId ? "text-(--accent-lime)" : "text-(--fg-2)"}`} title={n.path}>
                                            {n.path}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                )}

                {/* Canvas */}
                <Card className={`p-0 relative overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : ""}`} style={{ height: isFullscreen ? "100dvh" : "70vh" }}>
                    <button type="button" onClick={() => setIsFullscreen((v) => !v)} title={isFullscreen ? "Exit full screen (Esc)" : "Full screen"} className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-[8px] border border-(--line) bg-(--bg-2)/90 backdrop-blur px-2 py-1 text-xs text-(--fg-2) hover:text-(--fg)">
                        {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                        {isFullscreen ? "Exit" : "Full screen"}
                    </button>
                    {/* In-canvas Back + current location — always reachable, including in fullscreen where the
                        breadcrumb row above is covered by the fixed overlay. */}
                    {caps && nav.length > 1 ? (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-[8px] border border-(--line) bg-(--bg-2)/90 backdrop-blur px-2 py-1 text-xs">
                            <button type="button" onClick={back} className="flex items-center gap-1 text-(--fg-2) hover:text-(--fg)"><ChevronLeft className="size-3.5" /> Back</button>
                            <span className="text-(--fg-3)">·</span>
                            <span className="text-(--fg) truncate max-w-[280px]">{current.kind === "capability" ? current.label : current.kind === "file" ? (current.path.split("/").pop() || current.path) : "Capabilities"}</span>
                        </div>
                    ) : null}
                    {showLoader ? (
                        <div className="flex h-full items-center justify-center text-sm text-(--fg-3)">
                            <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {caps && current.kind === "caps" ? "Mapping capabilities…" : caps ? "Opening…" : "Loading symbols…"}</span>
                        </div>
                    ) : displayNodes.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-(--fg-3) px-6 text-center">
                            {caps && current.kind === "file"
                                ? "No functions indexed in this file — it may be config or data. Its purpose is shown on the left."
                                : caps && current.kind === "capability"
                                    ? "No files in this capability."
                                    : caps
                                        ? "No indexed code yet — connect a repository and index it to map the codebase."
                                        : "Select a file to build the graph."}
                        </div>
                    ) : (
                        <ForceGraph2D
                            graphData={graphData}
                            nodeLabel={(n: GNode) => caps && current.kind === "caps" ? `${n.label}${n.desc ? " — " + n.desc : ""}` : caps && current.kind === "capability" ? (n.path ?? n.label) : `${n.type}: ${n.label}${n.signature ? " " + n.signature : ""}`}
                            nodeRelSize={5}
                            nodeCanvasObjectMode={() => "replace"}
                            nodeCanvasObject={(node: GNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
                                if (node.x == null || node.y == null) { return; }
                                const isSel = selected?.id === node.id;
                                const r = nodeRadius(node);
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                                ctx.fillStyle = nodeFill(node);
                                ctx.fill();
                                if (isSel) { ctx.lineWidth = 2 / globalScale; ctx.strokeStyle = "#f4f4f6"; ctx.stroke(); }
                                const label = String(node.label ?? "");
                                if (!label) { return; }
                                const bold = caps && current.kind === "caps";
                                const fontSize = Math.max((bold ? 12 : 10) / globalScale, bold ? 3 : 2.4);
                                ctx.font = `${bold ? 600 : 400} ${fontSize}px Inter, system-ui, sans-serif`;
                                ctx.textAlign = "center";
                                ctx.textBaseline = "top";
                                ctx.fillStyle = isSel ? "#f4f4f6" : "rgba(244,244,246,0.85)";
                                const text = label.length > 26 ? `${label.slice(0, 25)}…` : label;
                                ctx.fillText(text, node.x, node.y + r + 1.5 / globalScale);
                            }}
                            nodePointerAreaPaint={(node: GNode & { x?: number; y?: number }, color: string, ctx: CanvasRenderingContext2D) => {
                                if (node.x == null || node.y == null) { return; }
                                ctx.fillStyle = color;
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, nodeRadius(node) + 2, 0, 2 * Math.PI);
                                ctx.fill();
                            }}
                            linkColor={(l: GLink) => {
                                const sel = selected?.id;
                                if (sel && (endpointId(l.source) === sel || endpointId(l.target) === sel)) { return "rgba(200,255,62,0.7)"; }
                                return labelAllEdges ? "rgba(168,168,178,0.4)" : "rgba(168,168,178,0.22)";
                            }}
                            linkWidth={(l: GLink) => {
                                const sel = selected?.id;
                                const hot = sel && (endpointId(l.source) === sel || endpointId(l.target) === sel);
                                return (hot ? 1.5 : 1) + Math.min((l.weight ?? 1) - 1, 4) * 0.4;
                            }}
                            linkLabel={(l: GLink) => relationLabel(l.relation)}
                            linkDirectionalArrowLength={3.5}
                            linkDirectionalArrowRelPos={1}
                            linkCanvasObjectMode={() => "after"}
                            linkCanvasObject={(link: { relation?: string; weight?: number; source: { x?: number; y?: number; id?: string }; target: { x?: number; y?: number; id?: string } }, ctx: CanvasRenderingContext2D, globalScale: number) => {
                                if (!link.relation) { return; }
                                const s = link.source; const t = link.target;
                                if (typeof s !== "object" || typeof t !== "object" || s.x == null || t.x == null) { return; }
                                const sel = selected?.id;
                                const touches = sel && (s.id === sel || t.id === sel);
                                if (!labelAllEdges && !touches) { return; }
                                const mx = (s.x! + t.x!) / 2; const my = (s.y! + t.y!) / 2;
                                const fontSize = Math.max(9 / globalScale, 2.2);
                                ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
                                ctx.textAlign = "center";
                                ctx.textBaseline = "middle";
                                const text = relationLabel(link.relation) + ((link.weight ?? 1) > 1 ? ` ×${link.weight}` : "");
                                const w = ctx.measureText(text).width;
                                const pad = 2 / globalScale;
                                ctx.fillStyle = "rgba(7,7,10,0.85)";
                                ctx.fillRect(mx - w / 2 - pad, my - fontSize / 2 - pad, w + pad * 2, fontSize + pad * 2);
                                ctx.fillStyle = touches ? "#c8ff3e" : "rgba(200,255,62,0.7)";
                                ctx.fillText(text, mx, my);
                            }}
                            onNodeClick={onNodeClick}
                            cooldownTicks={100}
                            d3VelocityDecay={0.28}
                            warmupTicks={20}
                        />
                    )}

                    {/* Symbol detail (file level) or code-mode node bar. */}
                    {selected && ((caps && current.kind === "file") || !caps) ? (
                        <div className="absolute bottom-3 left-3 right-3 rounded-[10px] border border-(--line) bg-(--bg-2)/90 backdrop-blur px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{selected.type}</Badge>
                                <span className="text-(--fg) truncate">{selected.label}</span>
                                {!caps ? (loadingNode === selected.id ? <Loader2 className="size-3.5 animate-spin ml-auto" /> : <Button size="sm" variant="ghost" className="ml-auto h-6 text-xs" onClick={() => void expandNode(selected.id)}>Expand</Button>) : null}
                            </div>
                            {caps && selected.signature ? <p className="mt-1 font-mono text-[11px] text-(--fg-3) break-all">{selected.signature}</p> : null}
                        </div>
                    ) : null}
                </Card>
            </div>
        </div>
    );
}
