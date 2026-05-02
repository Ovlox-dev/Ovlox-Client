"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, FileCode, FolderGit2, Loader2, Plug } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    useGetCodeFile,
    useListCodeFiles,
    useListFileRisks,
    useListProjectIntegrations,
    useListRepositories,
} from "@/entities/project";
import { ExternalProvider } from "@/types/enum";

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
        () => (linkedIntegrations ?? []).some((l) => l.integration?.type === ExternalProvider.GITHUB),
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

    const reposList = repos ?? [];
    const risksList = risks ?? [];
    const filesList = files ?? [];

    return (
        <div className="p-4 md:p-6 space-y-4">
            <header className="flex items-start justify-between gap-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                        <FolderGit2 className="size-6" /> Repositories
                    </h1>
                    <p className="text-muted-foreground text-sm">
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
                    <Plug className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-1">No GitHub integration linked</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Connect GitHub on the setup wizard to pull in repositories, files, and risk scores.
                    </p>
                    <Button asChild>
                        <Link href={`/${organizationId}/projects/${projectId}/setup`}>Open setup wizard</Link>
                    </Button>
                </Card>
            ) : tab === "repos" ? (
                <div className="grid gap-4 md:grid-cols-[280px_1fr_1fr]">
                    <Card className="p-3 space-y-1 max-h-[70vh] overflow-y-auto">
                        <p className="text-xs uppercase font-semibold text-muted-foreground px-2 py-1">Repositories</p>
                        {reposLoading ? (
                            <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin" /></div>
                        ) : reposList.length === 0 ? (
                            <p className="text-xs text-muted-foreground p-2">No repos connected.</p>
                        ) : (
                            reposList.map((repo) => (
                                <button
                                    key={repo.id}
                                    onClick={() => { setActiveRepoId(repo.id); setActiveFileId(null); }}
                                    className={cn(
                                        "w-full text-left px-2 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                                        repo.id === activeRepoId ? "bg-accent-contrast text-text" : "hover:bg-muted text-muted-foreground",
                                    )}
                                >
                                    <FolderGit2 className="size-4 shrink-0" />
                                    <span className="truncate">{repo.name ?? repo.externalId ?? repo.id}</span>
                                </button>
                            ))
                        )}
                    </Card>

                    <Card className="p-3 space-y-1 max-h-[70vh] overflow-y-auto">
                        <p className="text-xs uppercase font-semibold text-muted-foreground px-2 py-1">
                            Files {activeRepoId ? `(${filesList.length})` : ""}
                        </p>
                        {!activeRepoId ? (
                            <p className="text-xs text-muted-foreground p-2">Select a repository.</p>
                        ) : filesLoading ? (
                            <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin" /></div>
                        ) : filesList.length === 0 ? (
                            <p className="text-xs text-muted-foreground p-2">No files indexed yet.</p>
                        ) : (
                            filesList.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveFileId(f.id)}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between gap-2",
                                        f.id === activeFileId ? "bg-accent-contrast text-text" : "hover:bg-muted text-muted-foreground",
                                    )}
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <FileCode className="size-3.5 shrink-0" />
                                        <span className="truncate font-mono">{f.path}</span>
                                    </span>
                                    {(f.riskScore ?? 0) > 0 ? (
                                        <Badge variant="outline" className={cn("text-[10px]", riskColor(f.riskScore))}>
                                            {Math.round(f.riskScore ?? 0)}
                                        </Badge>
                                    ) : null}
                                </button>
                            ))
                        )}
                    </Card>

                    <Card className="p-4 max-h-[70vh] overflow-y-auto">
                        <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">File detail</p>
                        {!activeFileId ? (
                            <p className="text-xs text-muted-foreground">Select a file to view details.</p>
                        ) : fileLoading ? (
                            <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin" /></div>
                        ) : !fileDetail ? (
                            <p className="text-xs text-muted-foreground">File not found.</p>
                        ) : (
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
                                        <summary className="cursor-pointer text-muted-foreground">Risk factors</summary>
                                        <pre className="mt-2 bg-muted/50 rounded-md p-2 overflow-x-auto">
                                            {JSON.stringify(fileDetail.riskFactors, null, 2)}
                                        </pre>
                                    </details>
                                ) : null}
                            </div>
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
                        <p className="text-xs text-muted-foreground">Risk score ≥ 40</p>
                    </div>
                    {risksLoading ? (
                        <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin" /></div>
                    ) : risksList.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No risky files detected.</p>
                    ) : (
                        <div className="space-y-1">
                            {risksList.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => { setActiveRepoId(f.repositoryId); setActiveFileId(f.id); setTab("repos"); }}
                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between gap-3"
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <FileCode className="size-3.5 shrink-0 text-muted-foreground" />
                                        <span className="font-mono text-xs truncate">{f.path}</span>
                                        {f.repository?.name ? (
                                            <span className="text-xs text-muted-foreground hidden sm:inline">
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
