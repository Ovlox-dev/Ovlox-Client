"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Network, Loader2, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApiError } from "@/hooks/useApiError";
import { useListRepositories } from "@/entities/project";
import { getFileSymbols, getNeighbors, useCodeTree } from "@/entities/code-graph";

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
    const [repositoryId, setRepositoryId] = React.useState<string | undefined>(undefined);
    const [seedFileId, setSeedFileId] = React.useState<string | undefined>(undefined);
    const [filter, setFilter] = React.useState("");

    const reposQuery = useListRepositories(organizationId, projectId);
    const treeQuery = useCodeTree(organizationId, projectId, repositoryId);

    useApiError(treeQuery.error);

    const [nodes, setNodes] = React.useState<GNode[]>([]);
    const [links, setLinks] = React.useState<GLink[]>([]);
    const expanded = React.useRef<Set<string>>(new Set());
    const [selected, setSelected] = React.useState<GNode | null>(null);
    const [loadingNode, setLoadingNode] = React.useState<string | null>(null);
    const [seeding, setSeeding] = React.useState(false);

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
        } finally {
            setSeeding(false);
        }
    }, [organizationId, projectId]);

    const expandNode = React.useCallback(async (nodeId: string) => {
        if (expanded.current.has(nodeId)) { return; }
        expanded.current.add(nodeId);
        setLoadingNode(nodeId);
        try {
            const res = await getNeighbors(organizationId, projectId, nodeId, "both");
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

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
            <header>
                <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                    <Network className="size-6" /> Code graph
                </h1>
                <p className="text-muted-foreground text-sm">
                    Pick a file to seed the graph with its symbols, then click any node to expand its callers and callees.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
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

                <Card className="p-0 relative overflow-hidden" style={{ height: "70vh" }}>
                    {nodes.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-(--fg-3)">
                            {seeding ? (
                                <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading symbols…</span>
                            ) : (
                                "Select a file to build the graph."
                            )}
                        </div>
                    ) : (
                        <ForceGraph2D
                            graphData={{ nodes, links }}
                            nodeLabel={(n: GNode) => `${n.type}: ${n.label}`}
                            nodeAutoColorBy="type"
                            linkColor={() => "rgba(168,168,178,0.35)"}
                            linkDirectionalArrowLength={3}
                            onNodeClick={(n: GNode) => { setSelected(n); void expandNode(n.id); }}
                            cooldownTicks={80}
                        />
                    )}
                    {selected ? (
                        <div className="absolute bottom-3 left-3 right-3 rounded-[10px] border border-(--line) bg-(--bg-2)/90 backdrop-blur px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{selected.type}</Badge>
                                <span className="text-(--fg) truncate">{selected.label}</span>
                                {loadingNode === selected.id ? <Loader2 className="size-3.5 animate-spin ml-auto" /> : (
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
