"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { GitCommit, Search, X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useListProjectCommits,
    useListRepositories,
} from "@/entities/project";
import { CommitFeed } from "@/widgets/project-repos-page/ui/commit-feed";

type RangePreset = "7d" | "30d" | "90d" | "all";

const RANGE_LABELS: Record<RangePreset, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "all": "All time",
};

function rangeToSinceIso(preset: RangePreset): string | undefined {
    if (preset === "all") return undefined;
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    return since.toISOString();
}

/** Project-wide commit feed: all RawEvents of type COMMIT joined with their LLM SUMMARY,
 *  sortable by author / repository / time window. Reuses the same CommitFeed component the
 *  file-detail drill-down uses, so the visual treatment is consistent across both surfaces. */
export function ProjectCommitsPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const [range, setRange] = React.useState<RangePreset>("30d");
    const [repoFilter, setRepoFilter] = React.useState<string>("all");
    const [authorInput, setAuthorInput] = React.useState("");
    const [authorQuery, setAuthorQuery] = React.useState("");
    const [limit, setLimit] = React.useState(50);

    // Reset pagination whenever the active filters change.
    React.useEffect(() => {
        setLimit(50);
    }, [range, repoFilter, authorQuery]);

    const since = React.useMemo(() => rangeToSinceIso(range), [range]);

    const { data: repos } = useListRepositories(organizationId, projectId, { limit: 100 });
    const repoList = (repos ?? []).map((r: { id: string; name?: string }) => ({
        id: r.id,
        name: r.name ?? r.id,
    }));

    const { data, isLoading, isError } = useListProjectCommits(organizationId, projectId, {
        repositoryId: repoFilter === "all" ? undefined : repoFilter,
        author: authorQuery || undefined,
        since,
        limit,
        offset: 0,
    });

    const commits = data?.commits ?? [];
    const total = data?.total ?? 0;
    const hasFilters = repoFilter !== "all" || authorQuery !== "" || range !== "30d";

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <GitCommit className="size-6" />
                        Commits
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Every commit ingested into this project, with AI-generated summaries.
                    </p>
                </div>
            </div>

            <Card className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={range} onValueChange={(v) => setRange(v as RangePreset)}>
                        <SelectTrigger className="w-44 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(RANGE_LABELS).map(([k, label]) => (
                                <SelectItem key={k} value={k}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={repoFilter} onValueChange={setRepoFilter}>
                        <SelectTrigger className="w-56 h-9">
                            <SelectValue placeholder="All repositories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All repositories</SelectItem>
                            {repoList.map((r) => (
                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <form
                        className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md"
                        onSubmit={(e) => {
                            e.preventDefault();
                            setAuthorQuery(authorInput.trim());
                        }}
                    >
                        <div className="relative flex-1">
                            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={authorInput}
                                onChange={(e) => setAuthorInput(e.target.value)}
                                placeholder="Filter by author name or email"
                                className="h-9 pl-8 text-sm"
                            />
                            {authorQuery ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthorInput("");
                                        setAuthorQuery("");
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label="Clear author filter"
                                >
                                    <X className="size-3.5" />
                                </button>
                            ) : null}
                        </div>
                        <Button type="submit" size="sm" variant="outline" className="h-9">
                            Apply
                        </Button>
                    </form>

                    {hasFilters ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => {
                                setRange("30d");
                                setRepoFilter("all");
                                setAuthorInput("");
                                setAuthorQuery("");
                            }}
                        >
                            Reset filters
                        </Button>
                    ) : null}
                </div>
            </Card>

            <CommitFeed
                commits={commits}
                isLoading={isLoading && commits.length === 0}
                isError={isError}
                total={total}
                showRepository
                canLoadMore={total > commits.length}
                onLoadMore={() => setLimit((n) => n + 50)}
                isLoadingMore={isLoading && commits.length > 0}
                emptyTitle={hasFilters ? "No commits match these filters" : "No commits yet"}
                emptyDescription={
                    hasFilters
                        ? "Try expanding the time range or clearing filters."
                        : "Commits will appear once your connected repositories start syncing."
                }
            />
        </div>
    );
}
