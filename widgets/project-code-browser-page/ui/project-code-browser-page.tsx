"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { ChevronRight, File as FileIcon, Folder, Code2, Loader2, GitCommit, FileCode } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiError } from "@/hooks/useApiError";
import { useListRepositories, useListProjectCommits } from "@/entities/project";
import { useCodeTree, useFileSymbols, type CodeTreeNode } from "@/entities/code-graph";

interface TreeItem extends CodeTreeNode {
    children: TreeItem[];
}

/** Build the nested tree from the backend's flat parentId/id node list. */
function buildTree(nodes: CodeTreeNode[]): TreeItem[] {
    const byId = new Map<string, TreeItem>();
    nodes.forEach((n) => byId.set(n.id, { ...n, children: [] }));
    const roots: TreeItem[] = [];
    byId.forEach((item) => {
        if (item.parentId && byId.has(item.parentId)) {
            byId.get(item.parentId)!.children.push(item);
        } else {
            roots.push(item);
        }
    });
    const sort = (items: TreeItem[]) => {
        items.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "DIR" ? -1 : 1));
        items.forEach((i) => sort(i.children));
    };
    sort(roots);
    return roots;
}

export function ProjectCodeBrowserPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const [repositoryId, setRepositoryId] = React.useState<string | undefined>(undefined);
    const [selectedFile, setSelectedFile] = React.useState<{ id: string; path: string } | null>(null);
    const [view, setView] = React.useState<"files" | "changes">("files");

    const reposQuery = useListRepositories(organizationId, projectId);
    const treeQuery = useCodeTree(organizationId, projectId, repositoryId);
    const symbolsQuery = useFileSymbols(organizationId, projectId, selectedFile?.id);
    const commitsQuery = useListProjectCommits(organizationId, projectId, {
        repositoryId,
        limit: 100,
    });

    useApiError(reposQuery.error);
    useApiError(treeQuery.error);

    const tree = React.useMemo(() => buildTree(treeQuery.data ?? []), [treeQuery.data]);

    // Group commits by calendar day for the chronological "Changes" view.
    type Commit = NonNullable<typeof commitsQuery.data>["commits"][number];
    const commitsByDay = React.useMemo(() => {
        const byDay = new Map<string, Commit[]>();
        for (const c of commitsQuery.data?.commits ?? []) {
            const day = c.timestamp ? new Date(c.timestamp).toLocaleDateString() : "Unknown";
            if (!byDay.has(day)) { byDay.set(day, []); }
            byDay.get(day)!.push(c);
        }
        return Array.from(byDay.entries()).map(([day, commits]) => ({ day, commits }));
    }, [commitsQuery.data]);

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
            <header className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                        <Code2 className="size-6" /> Code browser
                    </h1>
                    <p className="text-muted-foreground text-sm">Indexed file tree and the symbols defined in each file.</p>
                </div>
                {(reposQuery.data?.length ?? 0) > 0 ? (
                    <Select value={repositoryId ?? "all"} onValueChange={(v) => setRepositoryId(v === "all" ? undefined : v)}>
                        <SelectTrigger className="w-56"><SelectValue placeholder="All repositories" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All repositories</SelectItem>
                            {reposQuery.data!.map((r) => (
                                <SelectItem key={r.id} value={r.id}>{r.name ?? r.id}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : null}
            </header>

            <Tabs value={view} onValueChange={(v) => setView(v as "files" | "changes")}>
                <TabsList>
                    <TabsTrigger value="files"><FileCode className="size-4 mr-1" /> Files</TabsTrigger>
                    <TabsTrigger value="changes"><GitCommit className="size-4 mr-1" /> Changes</TabsTrigger>
                </TabsList>
            </Tabs>

            {view === "changes" ? (
                <Card className="p-4 max-h-[72vh] overflow-y-auto">
                    {commitsQuery.isPending ? (
                        <div className="flex items-center gap-2 text-sm text-(--fg-3) p-2"><Loader2 className="size-4 animate-spin" /> Loading changes…</div>
                    ) : commitsByDay.length === 0 ? (
                        <p className="text-sm text-(--fg-3) p-2">No commits ingested yet.</p>
                    ) : (
                        <div className="space-y-5">
                            {commitsByDay.map(({ day, commits }) => (
                                <div key={day} className="space-y-2">
                                    <p className="sticky top-0 bg-(--bg-2) py-1 text-xs font-semibold text-(--fg-2)">{day}</p>
                                    <ul className="space-y-2 border-l border-(--line) pl-4">
                                        {commits.map((c) => (
                                            <li key={c.rawEventId} className="relative">
                                                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-(--accent-lime)" />
                                                <p className="text-sm text-(--fg) line-clamp-2">{c.llmSummary || c.content || "(no message)"}</p>
                                                <div className="flex items-center gap-2 flex-wrap text-[11px] text-(--fg-3) mt-0.5">
                                                    {c.authorName ? <span>{c.authorName}</span> : null}
                                                    {c.repository?.name ? <span>· {c.repository.name}</span> : null}
                                                    {typeof c.fileChangesCount === "number" ? <span>· {c.fileChangesCount} files</span> : null}
                                                    {typeof c.additions === "number" ? <span className="text-green-600">+{c.additions}</span> : null}
                                                    {typeof c.deletions === "number" ? <span className="text-red-600">-{c.deletions}</span> : null}
                                                    {c.branchName ? <span>· {c.branchName}</span> : null}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-3 max-h-[70vh] overflow-y-auto">
                    {treeQuery.isPending ? (
                        <div className="flex items-center gap-2 text-sm text-(--fg-3) p-2"><Loader2 className="size-4 animate-spin" /> Loading tree…</div>
                    ) : tree.length === 0 ? (
                        <p className="text-sm text-(--fg-3) p-2">No indexed files yet. Index a repository first.</p>
                    ) : (
                        <ul className="text-sm">
                            {tree.map((node) => (
                                <TreeNode key={node.id} node={node} depth={0} selectedId={selectedFile?.id ?? null}
                                    onSelectFile={(n) => setSelectedFile({ id: n.codeFileId!, path: n.path })} />
                            ))}
                        </ul>
                    )}
                </Card>

                <Card className="p-3 max-h-[70vh] overflow-y-auto">
                    {!selectedFile ? (
                        <p className="text-sm text-(--fg-3) p-2">Select a file to see its symbols.</p>
                    ) : (
                        <>
                            <p className="font-mono text-xs text-(--fg-2) mb-2 break-all">{selectedFile.path}</p>
                            {symbolsQuery.isPending ? (
                                <div className="flex items-center gap-2 text-sm text-(--fg-3) p-2"><Loader2 className="size-4 animate-spin" /> Loading symbols…</div>
                            ) : (symbolsQuery.data?.length ?? 0) === 0 ? (
                                <p className="text-sm text-(--fg-3) p-2">No symbols extracted for this file.</p>
                            ) : (
                                <ul className="space-y-1">
                                    {symbolsQuery.data!.map((s) => (
                                        <li key={s.id} className="flex items-start gap-2 rounded-[8px] px-2 py-1.5 hover:bg-(--bg-3)">
                                            <Badge variant="outline" className="text-[10px] shrink-0">{s.kind}</Badge>
                                            <div className="min-w-0">
                                                <p className="text-sm text-(--fg) truncate">{s.qualifiedName || s.name}</p>
                                                {s.signature ? <p className="font-mono text-[11px] text-(--fg-3) truncate">{s.signature}</p> : null}
                                            </div>
                                            {s.startLine ? <span className="ml-auto text-[10px] text-(--fg-3)">L{s.startLine}</span> : null}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </Card>
            </div>
            )}
        </div>
    );
}

function TreeNode({
    node, depth, selectedId, onSelectFile,
}: {
    node: TreeItem;
    depth: number;
    selectedId: string | null;
    onSelectFile: (n: TreeItem) => void;
}) {
    const [open, setOpen] = React.useState(depth < 1);
    const isFolder = node.kind === "DIR";
    const isSelected = node.codeFileId && node.codeFileId === selectedId;

    return (
        <li>
            <button
                type="button"
                onClick={() => (isFolder ? setOpen((o) => !o) : node.codeFileId && onSelectFile(node))}
                className={`flex items-center gap-1 w-full text-left rounded-[6px] px-1.5 py-1 hover:bg-(--bg-3) ${isSelected ? "bg-(--bg-3) text-(--accent-lime)" : "text-(--fg-2)"}`}
                style={{ paddingLeft: `${depth * 12 + 6}px` }}
            >
                {isFolder ? (
                    <ChevronRight className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
                ) : (
                    <FileIcon className="size-3.5 shrink-0" />
                )}
                {isFolder ? <Folder className="size-3.5 shrink-0 text-(--fg-3)" /> : null}
                <span className="truncate">{node.name}</span>
            </button>
            {isFolder && open ? (
                <ul>
                    {node.children.map((c) => (
                        <TreeNode key={c.id} node={c} depth={depth + 1} selectedId={selectedId} onSelectFile={onSelectFile} />
                    ))}
                </ul>
            ) : null}
        </li>
    );
}
