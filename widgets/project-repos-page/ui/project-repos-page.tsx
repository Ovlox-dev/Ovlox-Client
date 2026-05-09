"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, FileCode, FolderGit2, Loader2, Plug, Search, X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    useGetCodeFile,
    useListCodeFiles,
    useListFileCommits,
    useListFileRisks,
    useListProjectIntegrations,
    useListRepositories,
} from "@/entities/project";
import { ExternalProvider } from "@/types/enum";
import { CommitFeed } from "./commit-feed";
import { FileTree } from "./file-tree";

function riskColor(score: number | null | undefined): string {
    const s = score ?? 0;
    if (s >= 80) { return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"; }
    if (s >= 60) { return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30"; }
    if (s >= 40) { return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"; }
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
}

export function ProjectReposPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const [tab, setTab] = React.useState<"repos" | "risks">("repos");
    const [activeRepoId, setActiveRepoId] = React.useState<string | null>(null);
    const [activeFileId, setActiveFileId] = React.useState<string | null>(null);

    const { data: linkedIntegrations } = useListProjectIntegrations(organizationId, projectId);
    const hasGithub = React.useMemo(
        () => (linkedIntegrations ?? []).some((l) =>
            (l.provider ?? l.integration?.type) === ExternalProvider.GITHUB
            && ((l.integrationStatus ?? l.integration?.status) === "CONNECTED" || !(l.integrationStatus ?? l.integration?.status)),
        ),
        [linkedIntegrations],
    );
    const { data: repos, isLoading: reposLoading } = useListRepositories(organizationId, projectId, { limit: 50 });
    const { data: risks, isLoading: risksLoading } = useListFileRisks(organizationId, projectId, {
        minRiskScore: 40,
        limit: 100,
    });
    const { data: files, isLoading: filesLoading } = useListCodeFiles(
        organizationId,
        projectId,
        activeRepoId ?? undefined,
        { limit: 200 },
    );
    const { data: fileDetail, isLoading: fileLoading } = useGetCodeFile(
        organizationId,
        projectId,
        activeFileId ?? undefined,
    );
    const [fileDetailTab, setFileDetailTab] = React.useState<"info" | "commits">("info");
    const [commitsLimit, setCommitsLimit] = React.useState(15);
    React.useEffect(() => {
        // Reset tab + pagination whenever the user picks a different file.
        setFileDetailTab("info");
        setCommitsLimit(15);
    }, [activeFileId]);
    // TanStack Query's generic inference loses the response type at the call site here, so
    // we cast through `unknown` to the known shape returned by listFileCommits().
    const fileCommitsQuery = useListFileCommits(
        organizationId,
        projectId,
        activeFileId ?? undefined,
        { limit: commitsLimit, offset: 0 },
    );
    const fileCommits = fileCommitsQuery.data as
        | { commits: import("@/entities/project").CommitFeedItem[]; total: number; limit: number; offset: number }
        | undefined;
    const commitsLoading = fileCommitsQuery.isLoading;
    const commitsError = fileCommitsQuery.isError;

    const reposList = repos ?? [];
    const risksList = risks ?? [];
    const filesList = files ?? [];

    const [fileQuery, setFileQuery] = React.useState("");
    React.useEffect(() => {
        // Reset search when switching repos.
        setFileQuery("");
    }, [activeRepoId]);

    /** Per-language file count for the active repo, used by the language strip header. */
    const languageStats = React.useMemo(() => {
        const map = new Map<string, number>();
        for (const f of filesList) {
            const key = (f.language ?? "unknown").toLowerCase();
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return Array.from(map.entries())
            .filter(([k]) => k !== "unknown")
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
    }, [filesList]);

    /** Highest risk score across files in the active repo. */
    const peakRisk = React.useMemo(
        () => filesList.reduce((max, f) => Math.max(max, f.riskScore ?? 0), 0),
        [filesList],
    );

    return (
        <div className="p-4 md:p-6 space-y-4">
            <header className="flex items-start justify-between gap-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                        <FolderGit2 className="size-6" /> Repositories
                    </h1>
                    <p className="text-(--fg-2) text-sm">
                        Connected repos, file inventory, and risk analysis pulled from ingested commits.
                    </p>
                </div>
                <div className="flex gap-1">
                    <Button
                        variant={tab === "repos" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTab("repos")}
                    >
                        Repos
                    </Button>
                    <Button
                        variant={tab === "risks" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTab("risks")}
                    >
                        Risks
                    </Button>
                </div>
            </header>

            {!hasGithub && reposList.length === 0 && !reposLoading ? (
                <Card className="p-12 text-center">
                    <Plug className="size-10 mx-auto mb-3 text-(--fg-2) opacity-50" />
                    <h3 className="text-lg font-semibold mb-1">No GitHub integration linked</h3>
                    <p className="text-sm text-(--fg-2) mb-4">
                        Connect GitHub on the setup wizard to pull in repositories, files, and risk scores.
                    </p>
                    <Button asChild>
                        <Link href={`/${organizationId}/projects/${projectId}/setup`}>Open setup wizard</Link>
                    </Button>
                </Card>
            ) : tab === "repos" ? (
                <div className="grid gap-4 md:grid-cols-[300px_1fr_1.2fr]">
                    {/* Repository list — richer cards w/ file count + peak risk dot */}
                    <Card className="p-3 space-y-1 max-h-[75vh] overflow-y-auto">
                        <p className="text-xs uppercase font-semibold text-(--fg-2) px-2 py-1">
                            Repositories {reposList.length > 0 ? `(${reposList.length})` : ""}
                        </p>
                        {reposLoading ? (
                            <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin" /></div>
                        ) : reposList.length === 0 ? (
                            <p className="text-xs text-(--fg-2) p-2">No repos connected.</p>
                        ) : (
                            reposList.map((repo) => {
                                const isActive = repo.id === activeRepoId;
                                return (
                                    <button
                                        key={repo.id}
                                        onClick={() => { setActiveRepoId(repo.id); setActiveFileId(null); }}
                                        className={cn(
                                            "w-full text-left px-2.5 py-2 rounded-md text-sm transition-colors flex items-start gap-2.5",
                                            isActive ? "bg-accent-contrast text-text" : "hover:bg-muted/60 text-(--fg-2)",
                                        )}
                                    >
                                        <FolderGit2 className={cn("size-4 shrink-0 mt-0.5", isActive ? "text-foreground" : "text-blue-500/80")} />
                                        <span className="flex-1 min-w-0">
                                            <span className="block truncate font-medium">
                                                {repo.name ?? repo.externalId ?? repo.id}
                                            </span>
                                            {repo.defaultBranch ? (
                                                <span className="block text-[10px] text-(--fg-2)/70 truncate font-mono">
                                                    {repo.defaultBranch}
                                                </span>
                                            ) : null}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </Card>

                    {/* File tree — replaces the old flat list. Search across all paths. */}
                    <Card className="p-3 max-h-[75vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-2 gap-2">
                            <p className="text-xs uppercase font-semibold text-(--fg-2)">
                                Files {activeRepoId ? `(${filesList.length})` : ""}
                            </p>
                            {peakRisk > 0 ? (
                                <Badge variant="outline" className={cn("text-[10px]", riskColor(peakRisk))}>
                                    Peak risk {Math.round(peakRisk)}
                                </Badge>
                            ) : null}
                        </div>

                        {activeRepoId && filesList.length > 0 ? (
                            <div className="space-y-2 mb-2">
                                <div className="relative">
                                    <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-(--fg-2)" />
                                    <Input
                                        value={fileQuery}
                                        onChange={(e) => setFileQuery(e.target.value)}
                                        placeholder="Search file path…"
                                        className="h-8 pl-8 pr-7 text-xs"
                                    />
                                    {fileQuery ? (
                                        <button
                                            type="button"
                                            onClick={() => setFileQuery("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-(--fg-2) hover:text-foreground"
                                            aria-label="Clear search"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    ) : null}
                                </div>
                                {languageStats.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {languageStats.map(([lang, count]) => (
                                            <Badge key={lang} variant="outline" className="text-[10px] px-1.5 py-0 font-mono uppercase">
                                                {lang} <span className="ml-1 text-(--fg-2)">{count}</span>
                                            </Badge>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="flex-1 overflow-y-auto -mx-1 px-1">
                            {!activeRepoId ? (
                                <p className="text-xs text-(--fg-2) p-2">Select a repository.</p>
                            ) : filesLoading ? (
                                <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin" /></div>
                            ) : (
                                <FileTree
                                    files={filesList.map((f) => ({
                                        id: f.id,
                                        path: f.path,
                                        language: f.language,
                                        riskScore: f.riskScore,
                                    }))}
                                    activeFileId={activeFileId}
                                    onSelect={setActiveFileId}
                                    query={fileQuery}
                                />
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 max-h-[70vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-3 gap-2">
                            <p className="text-xs uppercase font-semibold text-(--fg-2)">File detail</p>
                            {activeFileId ? (
                                <div className="flex gap-1">
                                    <Button
                                        variant={fileDetailTab === "info" ? "default" : "ghost"}
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => setFileDetailTab("info")}
                                    >
                                        Info
                                    </Button>
                                    <Button
                                        variant={fileDetailTab === "commits" ? "default" : "ghost"}
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => setFileDetailTab("commits")}
                                    >
                                        Commits{fileCommits?.total ? ` (${fileCommits.total})` : ""}
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                        {!activeFileId ? (
                            <p className="text-xs text-(--fg-2)">Select a file to view details.</p>
                        ) : fileLoading ? (
                            <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin" /></div>
                        ) : !fileDetail ? (
                            <p className="text-xs text-(--fg-2)">File not found.</p>
                        ) : fileDetailTab === "info" ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="font-mono text-sm break-all">{fileDetail.path}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {fileDetail.language ? (
                                            <Badge variant="outline">{fileDetail.language}</Badge>
                                        ) : null}
                                        {(fileDetail.riskScore ?? 0) > 0 ? (
                                            <Badge variant="outline" className={riskColor(fileDetail.riskScore)}>
                                                Risk {Math.round(fileDetail.riskScore ?? 0)}
                                            </Badge>
                                        ) : null}
                                    </div>
                                </div>
                                {fileDetail.contentSnippet ? (
                                    <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap wrap-break-word">
                                        {fileDetail.contentSnippet}
                                    </pre>
                                ) : null}
                                {fileDetail.riskFactors ? (
                                    <details className="text-xs">
                                        <summary className="cursor-pointer text-(--fg-2)">Risk factors</summary>
                                        <pre className="mt-2 bg-muted/50 rounded-md p-2 overflow-x-auto">
                                            {JSON.stringify(fileDetail.riskFactors, null, 2)}
                                        </pre>
                                    </details>
                                ) : null}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => setFileDetailTab("commits")}
                                >
                                    View commits to this file{fileCommits?.total ? ` (${fileCommits.total})` : ""}
                                </Button>
                            </div>
                        ) : (
                            <CommitFeed
                                commits={fileCommits?.commits ?? []}
                                isLoading={commitsLoading}
                                isError={commitsError}
                                total={fileCommits?.total ?? 0}
                                showFileStats
                                showRepository={false}
                                canLoadMore={(fileCommits?.commits.length ?? 0) < (fileCommits?.total ?? 0)}
                                onLoadMore={() => setCommitsLimit((n) => n + 15)}
                                isLoadingMore={commitsLoading && (fileCommits?.commits.length ?? 0) > 0}
                                emptyTitle="No commits touch this file yet"
                                emptyDescription="As commits land, their AI summaries will appear here."
                            />
                        )}
                    </Card>
                </div>
            ) : (
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold flex items-center gap-2">
                            <AlertTriangle className="size-4 text-orange-500" />
                            High-risk files
                        </h2>
                        <p className="text-xs text-(--fg-2)">Risk score ≥ 40</p>
                    </div>
                    {risksLoading ? (
                        <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin" /></div>
                    ) : risksList.length === 0 ? (
                        <p className="text-sm text-(--fg-2) py-6 text-center">No risky files detected.</p>
                    ) : (
                        <div className="space-y-1">
                            {risksList.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => { setActiveRepoId(f.repositoryId); setActiveFileId(f.id); setTab("repos"); }}
                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between gap-3"
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <FileCode className="size-3.5 shrink-0 text-(--fg-2)" />
                                        <span className="font-mono text-xs truncate">{f.path}</span>
                                        {f.repository?.name ? (
                                            <span className="text-xs text-(--fg-2) hidden sm:inline">
                                                ({f.repository.name})
                                            </span>
                                        ) : null}
                                    </span>
                                    <Badge variant="outline" className={cn("text-[10px] shrink-0", riskColor(f.riskScore))}>
                                        Risk {Math.round(f.riskScore ?? 0)}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
