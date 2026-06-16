"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Network, Loader2, Search, Maximize2, Minimize2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApiError } from "@/hooks/useApiError";
import { useListRepositories } from "@/entities/project";
import { getFileSymbols, getNeighbors, getProjectGraph, useCodeTree } from "@/entities/code-graph";
import { useProjectKnowledgeGraph } from "@/entities/knowledge";

// react-force-graph renders to canvas/WebGL — it must not run during SSR. The dynamic() wrapper
// erases the component's generic prop types, so we widen to a permissive component type here.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false }) as React.ComponentType<Record<string, unknown>>;

interface GNode { id: string; label: string; type: string; }
interface GLink { source: string; target: string; relation: string; }

/**
 * Interactive code-graph explorer. Seed the graph by picking a file (its symbols become nodes),
 * then click any node to expand its callers/callees/neighbors. Edges are fetched lazily per node
 * via the /code-graph/neighbors endpoint, so the graph grows only where the user explores.
 */
export function ProjectCodeGraphPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    // Default to the whole-codebase feature graph (features ↔ files ↔ people); "Code structure" is
    // the secondary, file-seeded view.
    const [mode, setMode] = React.useState<"code" | "overall">("overall");
    const [repositoryId, setRepositoryId] = React.useState<string | undefined>(undefined);
    const [seedFileId, setSeedFileId] = React.useState<string | undefined>(undefined);
    const [filter, setFilter] = React.useState("");

    const reposQuery = useListRepositories(organizationId, projectId);
    const treeQuery = useCodeTree(organizationId, projectId, repositoryId);
    // The OVERALL graph (Features ↔ Files ↔ People) is fetched whole from the backend; only enabled
    // in overall mode so we don't pay for it while browsing code structure.
    const kgQuery = useProjectKnowledgeGraph(organizationId, projectId, undefined, mode === "overall");
    useApiError(kgQuery.error);

    useApiError(treeQuery.error);

    const [nodes, setNodes] = React.useState<GNode[]>([]);
    const [links, setLinks] = React.useState<GLink[]>([]);
    const expanded = React.useRef<Set<string>>(new Set());
    const [selected, setSelected] = React.useState<GNode | null>(null);
    const [loadingNode, setLoadingNode] = React.useState<string | null>(null);
    const [seeding, setSeeding] = React.useState(false);

    // Overall (knowledge) graph reveals progressively: it starts at the FEATURE nodes, and clicking a
    // node pulls in its neighbours (a feature's files, a file's other features/authors). kgVisible is
    // the set of revealed node ids; the full graph stays client-side so expansion needs no refetch.
    const [kgVisible, setKgVisible] = React.useState<Set<string>>(new Set());
    const [kgSeededFrom, setKgSeededFrom] = React.useState<unknown>(null);
    // Optional: narrow the overall graph's FILE nodes to one repo (features/people stay — a feature
    // can span repos, which is the point of a project-level graph).
    const [kgRepoFilter, setKgRepoFilter] = React.useState<string | undefined>(undefined);

    // CSS fullscreen for the canvas (fills the viewport; Esc exits). The force graph auto-sizes to its
    // container, so toggling the container size is enough — no canvas resize plumbing needed.
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    React.useEffect(() => {
        if (!isFullscreen) { return; }
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setIsFullscreen(false); } };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isFullscreen]);

    const fileNodes = React.useMemo(
        () => (treeQuery.data ?? []).filter((n) => n.kind === "FILE" && n.codeFileId)
            .filter((n) => !filter || n.path.toLowerCase().includes(filter.toLowerCase())),
        [treeQuery.data, filter],
    );

    // Seed the graph from a file's symbols imperatively on click (setState + ref reset belong in an
    // event handler, not render/effect — keeps the graph state machine lint-clean and predictable).
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
        } finally {
            setSeeding(false);
        }
    }, [organizationId, projectId]);

    // Load the whole-project file dependency graph (files + IMPORTS edges) in one shot.
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
        } finally {
            setSeeding(false);
        }
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
                const additions = res.neighbors
                    .filter((nb) => !ids.has(nb.neighborId))
                    .map((nb) => ({ id: nb.neighborId, label: nb.label, type: nb.neighborType }));
                return [...prev, ...additions];
            });
            setLinks((prev) => {
                const key = (l: GLink) => `${l.source}->${l.target}:${l.relation}`;
                const seen = new Set(prev.map(key));
                const additions = res.neighbors
                    .map((nb) => nb.direction === "out"
                        ? { source: nodeId, target: nb.neighborId, relation: nb.relation }
                        : { source: nb.neighborId, target: nodeId, relation: nb.relation })
                    .filter((l) => !seen.has(key(l)));
                return [...prev, ...additions];
            });
        } catch {
            expanded.current.delete(nodeId);
        } finally {
            setLoadingNode(null);
        }
    }, [organizationId, projectId]);

    const overall = mode === "overall";

    // Stable node objects + adjacency, derived ONCE per fetched graph. react-force-graph mutates node
    // objects with x/y/velocity, so we must reuse the same references across renders — otherwise the
    // layout resets and the springy force animation never settles ("stuck edges").
    const kgNodeObjs = React.useMemo(() => {
        const m = new Map<string, GNode>();
        for (const n of kgQuery.data?.nodes ?? []) { m.set(n.id, { id: n.id, label: n.label, type: n.type }); }
        return m;
    }, [kgQuery.data]);
    // fileNodeId → repositoryId, for the optional repo filter.
    const kgFileRepo = React.useMemo(() => {
        const m = new Map<string, string>();
        for (const n of kgQuery.data?.nodes ?? []) {
            if (n.type === "FILE" && n.meta?.repositoryId) { m.set(n.id, n.meta.repositoryId as string); }
        }
        return m;
    }, [kgQuery.data]);
    const kgAdj = React.useMemo(() => {
        const adj = new Map<string, Set<string>>();
        for (const l of kgQuery.data?.links ?? []) {
            (adj.get(l.source) ?? adj.set(l.source, new Set()).get(l.source)!).add(l.target);
            (adj.get(l.target) ?? adj.set(l.target, new Set()).get(l.target)!).add(l.source);
        }
        return adj;
    }, [kgQuery.data]);

    // Seed the visible set to just the features when a fresh graph arrives (render-phase guard —
    // the same "adjust state on prop change" pattern used for the file selection above).
    if (overall && kgQuery.data && kgQuery.data !== kgSeededFrom) {
        setKgSeededFrom(kgQuery.data);
        setKgVisible(new Set(kgQuery.data.nodes.filter((n) => n.type === "FEATURE").map((n) => n.id)));
        setSelected(null);
    }

    // Reveal a node's direct neighbours. Returns the SAME set when nothing new is added so the graph
    // data identity is preserved (no needless simulation reset).
    const expandKgNode = React.useCallback((nodeId: string) => {
        setKgVisible((prev) => {
            const neighbours = kgAdj.get(nodeId);
            if (!neighbours || neighbours.size === 0) { return prev; }
            const next = new Set(prev);
            let added = 0;
            for (const nb of neighbours) { if (!next.has(nb)) { next.add(nb); added++; } }
            return added > 0 ? next : prev;
        });
    }, [kgAdj]);

    const resetKgView = React.useCallback(() => {
        setKgVisible(new Set((kgQuery.data?.nodes ?? []).filter((n) => n.type === "FEATURE").map((n) => n.id)));
        setSelected(null);
    }, [kgQuery.data]);

    // The overall graph's visible nodes/links. Memoised on kgVisible so identity changes ONLY on a
    // real reveal — that's when we want the force layout to re-heat and animate the new nodes in.
    const overallGraph = React.useMemo(() => {
        if (!overall) { return { nodes: [] as GNode[], links: [] as GLink[] }; }
        const nodeList = Array.from(kgVisible)
            .map((id) => kgNodeObjs.get(id))
            .filter((n): n is GNode => !!n)
            // Repo filter: drop FILE nodes outside the chosen repo (features/people unaffected).
            .filter((n) => !kgRepoFilter || n.type !== "FILE" || kgFileRepo.get(n.id) === kgRepoFilter);
        const visible = new Set(nodeList.map((n) => n.id));
        const linkList = (kgQuery.data?.links ?? [])
            .filter((l) => visible.has(l.source) && visible.has(l.target))
            .map((l) => ({ source: l.source, target: l.target, relation: l.relation }));
        return { nodes: nodeList, links: linkList };
    }, [overall, kgVisible, kgNodeObjs, kgQuery.data, kgRepoFilter, kgFileRepo]);

    const displayNodes: GNode[] = overall ? overallGraph.nodes : nodes;
    const displayLinks: GLink[] = overall ? overallGraph.links : links;
    const showLoader = overall ? kgQuery.isPending : seeding;
    // Memoise the graphData object so unrelated re-renders (e.g. selecting a node) don't hand
    // react-force-graph a new object and reset the running simulation.
    const graphData = React.useMemo(() => ({ nodes: displayNodes, links: displayLinks }), [displayNodes, displayLinks]);

    // Feature drill-down: when a FEATURE node is selected in the overall graph, resolve what it does
    // (description) and which files it consists of + who contributed, from the graph's nodes/links.
    const featureDetail = React.useMemo(() => {
        if (!overall || selected?.type !== "FEATURE" || !kgQuery.data) { return null; }
        const labelById = new Map(kgQuery.data.nodes.map((n) => [n.id, n] as const));
        const node = labelById.get(selected.id);
        if (!node) { return null; }
        const files = kgQuery.data.links
            .filter((l) => l.source === selected.id && l.relation === "INVOLVES")
            .map((l) => labelById.get(l.target))
            .filter((n): n is NonNullable<typeof n> => !!n)
            .map((n) => ({ id: n.id, label: (n.meta?.path as string) ?? n.label, repo: (n.meta?.repoName as string) ?? null }));
        const people = kgQuery.data.links
            .filter((l) => l.target === selected.id && l.relation === "CONTRIBUTED")
            .map((l) => labelById.get(l.source))
            .filter((n): n is NonNullable<typeof n> => !!n)
            .map((n) => n.label);
        return {
            title: node.label,
            description: (node.meta?.description as string) || null,
            status: (node.meta?.status as string) || null,
            progress: typeof node.meta?.progress === "number" ? (node.meta.progress as number) : null,
            files,
            people: Array.from(new Set(people)),
        };
    }, [overall, selected, kgQuery.data]);

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
            <header className="space-y-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                        <Network className="size-6" /> Graph
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {overall
                            ? "The project's features — click a feature to reveal the files it consists of, then keep clicking to go deeper."
                            : "Load the whole-project dependency graph, or pick a file to seed from its symbols — then click any node to expand its callers and callees."}
                    </p>
                </div>
                {/* Mode toggle — additive: existing code graph stays the default. */}
                <div className="inline-flex rounded-[8px] border border-(--line) bg-(--bg-2) p-0.5 text-sm">
                    <button
                        type="button"
                        onClick={() => setMode("code")}
                        className={`px-3 py-1 rounded-[6px] ${!overall ? "bg-(--bg-3) text-(--fg)" : "text-(--fg-3)"}`}
                    >
                        Code structure
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("overall")}
                        className={`px-3 py-1 rounded-[6px] ${overall ? "bg-(--bg-3) text-(--fg)" : "text-(--fg-3)"}`}
                    >
                        Overall
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
                {overall ? (
                    <Card className="p-3 max-h-[70vh] overflow-y-auto space-y-3">
                        <Button variant="outline" size="sm" className="w-full" onClick={resetKgView} disabled={!kgQuery.data}>
                            Reset to features
                        </Button>
                        {(reposQuery.data?.length ?? 0) > 1 ? (
                            <select
                                className="w-full rounded-[8px] border border-(--line) bg-(--bg-2) px-2 py-1.5 text-sm"
                                value={kgRepoFilter ?? "all"}
                                onChange={(e) => setKgRepoFilter(e.target.value === "all" ? undefined : e.target.value)}
                            >
                                <option value="all">All repositories</option>
                                {reposQuery.data!.map((r) => <option key={r.id} value={r.id}>{r.name ?? r.id}</option>)}
                            </select>
                        ) : null}
                        <p className="text-[10px] uppercase tracking-wider text-(--fg-3)">Legend</p>
                        <ul className="space-y-1.5 text-sm">
                            <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-(--accent-lime)" /> Feature</li>
                            <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-sky-400" /> File</li>
                            <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-amber-400" /> Person</li>
                        </ul>
                        {kgQuery.data ? (
                            <div className="pt-2 border-t border-(--line) text-xs text-(--fg-3) space-y-0.5">
                                <p>{kgQuery.data.counts.features} features</p>
                                <p>{kgQuery.data.counts.files} files</p>
                                <p>{kgQuery.data.counts.people} people</p>
                                <p>{kgQuery.data.counts.links} connections</p>
                            </div>
                        ) : null}
                        <p className="text-[11px] text-(--fg-3) pt-1">
                            Edges: a feature <span className="text-(--fg-2)">involves</span> the files its commits touched; a person <span className="text-(--fg-2)">authored</span> files and <span className="text-(--fg-2)">contributed</span> to features.
                        </p>
                    </Card>
                ) : (
                <Card className="p-3 max-h-[70vh] overflow-y-auto space-y-2">
                    {(reposQuery.data?.length ?? 0) > 1 ? (
                        <select
                            className="w-full rounded-[8px] border border-(--line) bg-(--bg-2) px-2 py-1.5 text-sm"
                            value={repositoryId ?? "all"}
                            onChange={(e) => setRepositoryId(e.target.value === "all" ? undefined : e.target.value)}
                        >
                            <option value="all">All repositories</option>
                            {reposQuery.data!.map((r) => <option key={r.id} value={r.id}>{r.name ?? r.id}</option>)}
                        </select>
                    ) : null}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => void loadProjectGraph()} disabled={seeding}>
                        <Network className="size-4" /> Whole-project graph
                    </Button>
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
                                    <button
                                        type="button"
                                        onClick={() => void seedFromFile(n.codeFileId!)}
                                        className={`block w-full text-left truncate rounded-[6px] px-1.5 py-1 hover:bg-(--bg-3) ${seedFileId === n.codeFileId ? "text-(--accent-lime)" : "text-(--fg-2)"}`}
                                        title={n.path}
                                    >
                                        {n.path}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                )}

                <Card
                    className={`p-0 relative overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : ""}`}
                    style={{ height: isFullscreen ? "100dvh" : "70vh" }}
                >
                    {/* Fullscreen toggle. */}
                    <button
                        type="button"
                        onClick={() => setIsFullscreen((v) => !v)}
                        title={isFullscreen ? "Exit full screen (Esc)" : "Full screen"}
                        className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-[8px] border border-(--line) bg-(--bg-2)/90 backdrop-blur px-2 py-1 text-xs text-(--fg-2) hover:text-(--fg)"
                    >
                        {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                        {isFullscreen ? "Exit" : "Full screen"}
                    </button>
                    {showLoader ? (
                        <div className="flex h-full items-center justify-center text-sm text-(--fg-3)">
                            <span className="flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin" /> {overall ? "Building the knowledge graph…" : "Loading symbols…"}
                            </span>
                        </div>
                    ) : displayNodes.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-(--fg-3)">
                            {overall ? "No connected features, files or people yet — index a repo and detect features first." : "Select a file to build the graph."}
                        </div>
                    ) : (
                        <ForceGraph2D
                            graphData={graphData}
                            nodeLabel={(n: GNode) => `${n.type}: ${n.label}`}
                            nodeAutoColorBy="type"
                            linkColor={() => "rgba(168,168,178,0.35)"}
                            linkDirectionalArrowLength={3}
                            onNodeClick={(n: GNode) => { setSelected(n); if (overall) { expandKgNode(n.id); } else { void expandNode(n.id); } }}
                            cooldownTicks={100}
                            d3VelocityDecay={0.28}
                            warmupTicks={20}
                        />
                    )}
                    {/* Feature drill-down: what it does + the files it consists of + contributors. */}
                    {featureDetail ? (
                        <div className="absolute top-3 right-3 w-72 max-h-[calc(70vh-1.5rem)] overflow-y-auto rounded-[10px] border border-(--line) bg-(--bg-2)/95 backdrop-blur px-3 py-3 text-sm space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <span className="font-medium text-(--fg) leading-snug">{featureDetail.title}</span>
                                <button type="button" onClick={() => setSelected(null)} className="text-(--fg-3) hover:text-(--fg) shrink-0">✕</button>
                            </div>
                            <div className="flex items-center gap-2">
                                {featureDetail.status ? <Badge variant="outline" className="text-[10px]">{featureDetail.status}</Badge> : null}
                                {featureDetail.progress !== null ? (
                                    <span className="text-[11px] text-(--fg-3)">{Math.round(featureDetail.progress * 100)}% done</span>
                                ) : null}
                            </div>
                            {featureDetail.description ? (
                                <p className="text-[12px] text-(--fg-2) leading-relaxed">{featureDetail.description}</p>
                            ) : (
                                <p className="text-[12px] text-(--fg-3) italic">No description detected.</p>
                            )}
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-(--fg-3) mb-1">Files ({featureDetail.files.length})</p>
                                {featureDetail.files.length === 0 ? (
                                    <p className="text-[11px] text-(--fg-3)">No file links yet — needs commit file-changes indexed.</p>
                                ) : (
                                    <ul className="space-y-0.5">
                                        {featureDetail.files.slice(0, 50).map((f) => (
                                            <li key={f.id} className="text-[11px] text-(--fg-2) truncate" title={f.label}>
                                                {f.repo ? <span className="text-(--fg-3)">{f.repo}/</span> : null}{f.label}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            {featureDetail.people.length > 0 ? (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-(--fg-3) mb-1">Contributors ({featureDetail.people.length})</p>
                                    <p className="text-[11px] text-(--fg-2)">{featureDetail.people.join(", ")}</p>
                                </div>
                            ) : null}
                        </div>
                    ) : selected ? (
                        <div className="absolute bottom-3 left-3 right-3 rounded-[10px] border border-(--line) bg-(--bg-2)/90 backdrop-blur px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{selected.type}</Badge>
                                <span className="text-(--fg) truncate">{selected.label}</span>
                                {overall ? null : loadingNode === selected.id ? <Loader2 className="size-3.5 animate-spin ml-auto" /> : (
                                    <Button size="sm" variant="ghost" className="ml-auto h-6 text-xs" onClick={() => void expandNode(selected.id)}>Expand</Button>
                                )}
                            </div>
                        </div>
                    ) : null}
                </Card>
            </div>
        </div>
    );
}
