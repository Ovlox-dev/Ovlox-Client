"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    Activity,
    Loader2,
    Search,
    GitCommit,
    GitPullRequest,
    AlertTriangle,
    MessageSquare,
    Sparkles,
    Flag,
    CircleDot,
    Plug,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGetTimeline, useListProjectIntegrations, type TimelineEntry } from "@/entities/project";

type RangeKey = "1d" | "7d" | "30d" | "all";

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "All categories" },
    { value: "COMMIT", label: "Commits" },
    { value: "PULL_REQUEST", label: "Pull requests" },
    { value: "INCIDENT", label: "Incidents" },
    { value: "RISK_ALERT", label: "Risk alerts" },
    { value: "FEATURE", label: "Features" },
    { value: "DECISION", label: "Decisions" },
    { value: "BLOCKER", label: "Blockers" },
    { value: "MILESTONE", label: "Milestones" },
    { value: "CONTEXT", label: "Context" },
];

const CATEGORY_META: Record<string, { icon: typeof GitCommit; classes: string; label: string }> = {
    COMMIT: { icon: GitCommit, classes: "bg-blue-500/15 text-blue-600 border-blue-500/30", label: "Commit" },
    PULL_REQUEST: { icon: GitPullRequest, classes: "bg-purple-500/15 text-purple-600 border-purple-500/30", label: "PR" },
    INCIDENT: { icon: AlertTriangle, classes: "bg-red-500/15 text-red-600 border-red-500/30", label: "Incident" },
    RISK_ALERT: { icon: AlertTriangle, classes: "bg-orange-500/15 text-orange-600 border-orange-500/30", label: "Risk" },
    FEATURE: { icon: Sparkles, classes: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", label: "Feature" },
    DECISION: { icon: Flag, classes: "bg-amber-500/15 text-amber-700 border-amber-500/30", label: "Decision" },
    BLOCKER: { icon: AlertTriangle, classes: "bg-red-500/15 text-red-600 border-red-500/30", label: "Blocker" },
    MILESTONE: { icon: Flag, classes: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30", label: "Milestone" },
    CONTEXT: { icon: MessageSquare, classes: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30", label: "Context" },
};

function categoryMeta(c: string) {
    return CATEGORY_META[c] ?? { icon: CircleDot, classes: "bg-muted text-muted-foreground border-border", label: c };
}

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString();
}

function sinceFromRange(range: RangeKey): string | undefined {
    const now = Date.now();
    if (range === "1d") { return new Date(now - 24 * 60 * 60 * 1000).toISOString(); }
    if (range === "7d") { return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(); }
    if (range === "30d") { return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(); }
    return undefined;
}

export function ProjectEventsPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const [category, setCategory] = React.useState<string>("all");
    const [range, setRange] = React.useState<RangeKey>("7d");
    const [query, setQuery] = React.useState("");

    const { data, isLoading, error } = useGetTimeline(organizationId, projectId, {
        since: sinceFromRange(range),
        categories: category === "all" ? undefined : [category],
        limit: 200,
    });
    const { data: linkedIntegrations } = useListProjectIntegrations(organizationId, projectId);
    const hasIntegrations = (linkedIntegrations?.length ?? 0) > 0;

    const entries = React.useMemo(() => {
        const all = data?.entries ?? [];
        if (!query.trim()) { return all; }
        const q = query.toLowerCase();
        return all.filter(
            (e) =>
                e.title.toLowerCase().includes(q) ||
                (e.summary?.toLowerCase().includes(q) ?? false),
        );
    }, [data, query]);

    const counts = React.useMemo(() => {
        const result: Record<string, number> = {};
        for (const e of data?.entries ?? []) {
            result[e.category] = (result[e.category] ?? 0) + 1;
        }
        return result;
    }, [data]);

    const total = data?.entries?.length ?? 0;

    return (
        <div className="p-4 md:p-6 space-y-4">
            <header className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                        <Activity className="size-6" /> Events
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Everything ingested for this project — commits, PRs, messages, incidents, decisions.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <SummaryCard label="Total integrations" value={linkedIntegrations?.length ?? 0} icon={Plug} />
                <SummaryCard label="Total events" value={total} icon={Activity} />
                <SummaryCard label="Commits" value={counts.COMMIT ?? 0} icon={GitCommit} />
                <SummaryCard label="Risk + incidents" value={(counts.RISK_ALERT ?? 0) + (counts.INCIDENT ?? 0)} icon={AlertTriangle} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <Input
                        placeholder="Search events…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full sm:w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
                    <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1d">Last 24h</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {!isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : error ? (
                <Card className="p-12 text-center">
                    <AlertTriangle className="size-10 mx-auto mb-3 text-destructive opacity-70" />
                    <h3 className="text-lg font-semibold mb-1">Couldn&apos;t load events</h3>
                    <p className="text-sm text-muted-foreground">{(error as Error)?.message ?? "Try again."}</p>
                </Card>
            ) : entries.length === 0 ? (
                !hasIntegrations ? (
                    <Card className="p-12 text-center">
                        <Plug className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-1">No integrations linked</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Connect a provider (GitHub, Slack, Jira…) and select resources so we can ingest events for this project.
                        </p>
                        <Button asChild>
                            <Link href={`/${organizationId}/projects/${projectId}/setup`}>Open setup wizard</Link>
                        </Button>
                    </Card>
                ) : total === 0 ? (
                    <Card className="p-12 text-center">
                        <Activity className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-1">No data ingested yet</h3>
                        <p className="text-sm text-muted-foreground">
                            Integrations are linked but ingestion hasn&apos;t produced events yet.
                            Check the Recovery tab if backfills are stuck, or wait for the next sync.
                        </p>
                    </Card>
                ) : (
                    <Card className="p-12 text-center">
                        <Activity className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-1">No events match</h3>
                        <p className="text-sm text-muted-foreground">Try a wider time range or remove the search filter.</p>
                    </Card>
                )
            ) : (
                <div className="space-y-2">
                    {entries.map((entry) => (
                        <EventRow key={entry.id} entry={entry} />
                    ))}
                </div>
            )}
        </div>
    );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Activity }) {
    return (
        <Card className="p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <Icon className="size-7 text-muted-foreground" />
            </div>
        </Card>
    );
}

function EventRow({ entry }: { entry: TimelineEntry }) {
    const meta = categoryMeta(entry.category);
    const Icon = meta.icon;
    const provider =
        (entry.metadata?.provider as string | undefined) ??
        (entry.metadata?.source as string | undefined);
    return (
        <Card className="p-3">
            <div className="flex items-start gap-3">
                <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0 border", meta.classes)}>
                    <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{entry.title}</p>
                        <Badge variant="outline" className={cn("text-[10px]", meta.classes)}>
                            {meta.label}
                        </Badge>
                        {entry.severity ? (
                            <Badge variant="outline" className="text-[10px]">{entry.severity}</Badge>
                        ) : null}
                        {provider ? (
                            <Badge variant="outline" className="text-[10px]">{provider}</Badge>
                        ) : null}
                    </div>
                    {entry.summary ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.summary}</p>
                    ) : null}
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(entry.occurredAt)}</p>
                </div>
            </div>
        </Card>
    );
}
