"use client";

import * as React from "react";
import {
    GitCommit,
    User,
    GitBranch,
    GitPullRequest,
    Plus,
    Minus,
    FileCode,
    Loader2,
    ExternalLink,
    Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CommitFeedItem } from "@/entities/project";
import { cn } from "@/lib/utils";

interface CommitFeedProps {
    commits: CommitFeedItem[];
    isLoading?: boolean;
    isError?: boolean;
    total?: number;
    onLoadMore?: () => void;
    canLoadMore?: boolean;
    isLoadingMore?: boolean;
    /** When true, render the per-file change stats prominently (file-detail context). */
    showFileStats?: boolean;
    /** When false, hide the repository chip — useful in file-scoped views. */
    showRepository?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
}

function formatTimestamp(iso: string | null | undefined): string {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function commitShortSha(sourceId: string | null | undefined): string {
    if (!sourceId) return "";
    return sourceId.slice(0, 7);
}

function commitUrl(commit: CommitFeedItem): string | null {
    if (commit.repository?.url && commit.sourceId) {
        return `${commit.repository.url.replace(/\/$/, "")}/commit/${commit.sourceId}`;
    }
    return null;
}

function authorInitials(commit: CommitFeedItem): string {
    const source = commit.authorName || commit.authorEmail || "";
    if (!source) return "?";
    const parts = source.split(/[\s@.]+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export function CommitFeed({
    commits,
    isLoading,
    isError,
    total,
    onLoadMore,
    canLoadMore,
    isLoadingMore,
    showFileStats,
    showRepository = true,
    emptyTitle = "No commits yet",
    emptyDescription = "Commits will appear here as they're ingested from your connected repositories.",
}: CommitFeedProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError) {
        return (
            <Card className="p-12 text-center">
                <GitCommit className="size-10 mx-auto mb-3 text-destructive opacity-70" />
                <h3 className="text-base font-semibold mb-1">Couldn&apos;t load commits</h3>
                <p className="text-xs text-muted-foreground">
                    Try refreshing, or check that ingestion has completed.
                </p>
            </Card>
        );
    }

    if (commits.length === 0) {
        return (
            <Card className="p-10 text-center">
                <GitCommit className="size-9 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h3 className="text-sm font-semibold mb-1">{emptyTitle}</h3>
                <p className="text-xs text-muted-foreground">{emptyDescription}</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {typeof total === "number" && total > 0 ? (
                <p className="text-xs text-muted-foreground">
                    Showing {commits.length} of {total} commit{total === 1 ? "" : "s"}
                </p>
            ) : null}

            {commits.map((commit) => (
                <CommitRow
                    key={`${commit.changeId ?? commit.rawEventId}`}
                    commit={commit}
                    showFileStats={showFileStats}
                    showRepository={showRepository}
                />
            ))}

            {canLoadMore && onLoadMore ? (
                <div className="flex justify-center pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                    >
                        {isLoadingMore ? (
                            <>
                                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                                Loading…
                            </>
                        ) : (
                            "Load more commits"
                        )}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}

function CommitRow({
    commit,
    showFileStats,
    showRepository,
}: {
    commit: CommitFeedItem;
    showFileStats?: boolean;
    showRepository?: boolean;
}) {
    const message = commit.content?.split("\n")[0] || "(no commit message)";
    const url = commitUrl(commit);
    const sha = commitShortSha(commit.sourceId);

    return (
        <Card className="p-4 hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                    {authorInitials(commit)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium leading-snug truncate">{message}</p>
                        {url ? (
                            <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-0.5 shrink-0"
                            >
                                {sha || "view"}
                                <ExternalLink className="size-3" />
                            </a>
                        ) : sha ? (
                            <span className="text-[11px] font-mono text-muted-foreground shrink-0">{sha}</span>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-2">
                        {commit.authorName ? (
                            <span className="flex items-center gap-1">
                                <User className="size-3" />
                                {commit.authorName}
                            </span>
                        ) : null}
                        <span>{formatTimestamp(commit.timestamp ?? commit.changedAt)}</span>
                        {commit.branchName ? (
                            <span className="flex items-center gap-1 font-mono">
                                <GitBranch className="size-3" />
                                {commit.branchName}
                            </span>
                        ) : null}
                        {commit.prNumber ? (
                            <span className="flex items-center gap-1">
                                <GitPullRequest className="size-3" />
                                #{commit.prNumber}
                            </span>
                        ) : null}
                        {showRepository && commit.repository?.name ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {commit.repository.name}
                            </Badge>
                        ) : null}
                        {commit.isPrimaryBranch ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                primary
                            </Badge>
                        ) : null}
                    </div>

                    {/* Stats: prefer per-commit aggregate (project-wide feed) but fall back to
                        per-file changeType + +/- when in file-detail context. */}
                    {(commit.additions || commit.deletions || commit.fileChangesCount) ? (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                            {commit.fileChangesCount ? (
                                <span className="flex items-center gap-1">
                                    <FileCode className="size-3" />
                                    {commit.fileChangesCount} file{commit.fileChangesCount === 1 ? "" : "s"}
                                </span>
                            ) : null}
                            {commit.additions ? (
                                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-300">
                                    <Plus className="size-3" />
                                    {commit.additions}
                                </span>
                            ) : null}
                            {commit.deletions ? (
                                <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
                                    <Minus className="size-3" />
                                    {commit.deletions}
                                </span>
                            ) : null}
                            {showFileStats && commit.changeType ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {commit.changeType}
                                </Badge>
                            ) : null}
                        </div>
                    ) : null}

                    {commit.llmSummary ? (
                        <div className={cn(
                            "rounded-md p-2.5 text-xs",
                            "bg-gradient-to-br from-primary/5 to-purple-500/5",
                            "border border-primary/10",
                        )}>
                            <div className="flex items-center gap-1 mb-1 text-[10px] uppercase tracking-wide font-semibold text-primary/80">
                                <Sparkles className="size-3" />
                                AI Summary
                            </div>
                            <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                {commit.llmSummary}
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </Card>
    );
}
