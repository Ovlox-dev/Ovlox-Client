"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
    Calendar,
    GitCommit,
    GitPullRequest,
    Lightbulb,
    AlertTriangle,
    Shield,
    Bug,
    Sparkles,
    Flag,
    AlertCircle,
    FileText,
    Loader2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useGetTimeline, type TimelineEntry, type TimelineCategory } from "@/entities/project";
import { cn } from "@/lib/utils";

type RangePreset = "7d" | "30d" | "90d" | "all";

const RANGE_LABELS: Record<RangePreset, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "all": "All time",
};

const ALL_CATEGORIES: TimelineCategory[] = [
    "DECISION",
    "MILESTONE",
    "FEATURE",
    "PULL_REQUEST",
    "COMMIT",
    "INCIDENT",
    "BLOCKER",
    "RISK_ALERT",
];

interface CategoryStyle {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
    iconBgClass: string;
    iconColorClass: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
    DECISION: {
        label: "Decision",
        icon: Lightbulb,
        badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
        iconBgClass: "bg-blue-500/15",
        iconColorClass: "text-blue-600 dark:text-blue-300",
    },
    MILESTONE: {
        label: "Milestone",
        icon: Flag,
        badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
        iconBgClass: "bg-purple-500/15",
        iconColorClass: "text-purple-600 dark:text-purple-300",
    },
    FEATURE: {
        label: "Feature",
        icon: Sparkles,
        badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        iconBgClass: "bg-emerald-500/15",
        iconColorClass: "text-emerald-600 dark:text-emerald-300",
    },
    PULL_REQUEST: {
        label: "Pull request",
        icon: GitPullRequest,
        badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
        iconBgClass: "bg-violet-500/15",
        iconColorClass: "text-violet-600 dark:text-violet-300",
    },
    COMMIT: {
        label: "Commit",
        icon: GitCommit,
        badgeClass: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
        iconBgClass: "bg-zinc-500/15",
        iconColorClass: "text-zinc-600 dark:text-zinc-300",
    },
    INCIDENT: {
        label: "Incident",
        icon: AlertTriangle,
        badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
        iconBgClass: "bg-orange-500/15",
        iconColorClass: "text-orange-600 dark:text-orange-300",
    },
    BLOCKER: {
        label: "Blocker",
        icon: AlertCircle,
        badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
        iconBgClass: "bg-red-500/15",
        iconColorClass: "text-red-600 dark:text-red-300",
    },
    RISK_ALERT: {
        label: "Risk",
        icon: Shield,
        badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        iconBgClass: "bg-amber-500/15",
        iconColorClass: "text-amber-600 dark:text-amber-300",
    },
    CONTEXT: {
        label: "Context",
        icon: FileText,
        badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
        iconBgClass: "bg-slate-500/15",
        iconColorClass: "text-slate-600 dark:text-slate-300",
    },
};

const FALLBACK_STYLE: CategoryStyle = {
    label: "Event",
    icon: Bug,
    badgeClass: "bg-muted text-muted-foreground border-muted",
    iconBgClass: "bg-muted",
    iconColorClass: "text-muted-foreground",
};

function rangePresetToSince(preset: RangePreset): string | undefined {
    if (preset === "all") return undefined;
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    return since.toISOString();
}

function formatTimestamp(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function groupByDay(entries: TimelineEntry[]): Array<{ key: string; label: string; entries: TimelineEntry[] }> {
    const groups = new Map<string, TimelineEntry[]>();
    for (const entry of entries) {
        const date = new Date(entry.occurredAt);
        const key = Number.isNaN(date.getTime()) ? "unknown" : date.toISOString().slice(0, 10);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(entry);
    }

    return Array.from(groups.entries())
        .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
        .map(([key, dayEntries]) => {
            const date = new Date(`${key}T00:00:00`);
            const label = Number.isNaN(date.getTime())
                ? key
                : date.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                });
            return { key, label, entries: dayEntries };
        });
}

export function ProjectTimelinePage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const [range, setRange] = React.useState<RangePreset>("30d");
    const [activeCategories, setActiveCategories] = React.useState<Set<TimelineCategory>>(
        new Set(ALL_CATEGORIES),
    );

    const since = React.useMemo(() => rangePresetToSince(range), [range]);
    const categoriesParam = React.useMemo(
        () => (activeCategories.size === ALL_CATEGORIES.length ? undefined : Array.from(activeCategories)),
        [activeCategories],
    );

    const { data, isLoading, isError, refetch } = useGetTimeline(
        organizationId,
        projectId,
        {
            since,
            categories: categoriesParam,
            limit: 500,
        },
    );

    const entries = data?.entries ?? [];
    const grouped = React.useMemo(() => groupByDay(entries), [entries]);

    const counts = React.useMemo(() => {
        const c = new Map<string, number>();
        for (const e of entries) {
            c.set(e.category, (c.get(e.category) ?? 0) + 1);
        }
        return c;
    }, [entries]);

    const toggleCategory = (cat: TimelineCategory) => {
        setActiveCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) {
                next.delete(cat);
                if (next.size === 0) {
                    // re-enable everything if user clicked off the last one
                    return new Set(ALL_CATEGORIES);
                }
            } else {
                next.add(cat);
            }
            return next;
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Calendar className="size-6" />
                        Project Timeline
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        How the codebase evolved — when, what, and who. Decisions, milestones, features, incidents, and code changes in one feed.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={range} onValueChange={(v) => setRange(v as RangePreset)}>
                        <SelectTrigger className="w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(RANGE_LABELS).map(([k, label]) => (
                                <SelectItem key={k} value={k}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map((cat) => {
                    const style = CATEGORY_STYLES[cat] ?? FALLBACK_STYLE;
                    const Icon = style.icon;
                    const active = activeCategories.has(cat);
                    const count = counts.get(cat) ?? 0;
                    return (
                        <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={cn(
                                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                active ? style.badgeClass : "border-border text-muted-foreground hover:bg-muted",
                            )}
                        >
                            <Icon className="size-3.5" />
                            {style.label}
                            <span
                                className={cn(
                                    "ml-1 rounded-full px-1.5 py-0 text-[10px]",
                                    active ? "bg-background/40" : "bg-muted",
                                )}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            ) : isError ? (
                <Card className="p-12 text-center">
                    <AlertCircle className="size-10 mx-auto mb-3 text-destructive opacity-70" />
                    <h3 className="text-lg font-semibold mb-1">Couldn&apos;t load the timeline</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Something went wrong fetching project events. Try again, or come back once your integrations finish ingesting.
                    </p>
                    <Button variant="outline" onClick={() => refetch()}>Retry</Button>
                </Card>
            ) : grouped.length === 0 ? (
                <Card className="p-12 text-center">
                    <Calendar className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-1">No events in this range</h3>
                    <p className="text-sm text-muted-foreground">
                        Try expanding the range, enabling more categories, or wait for ingestion to populate the timeline.
                    </p>
                </Card>
            ) : (
                <div className="space-y-8">
                    {grouped.map((group) => (
                        <div key={group.key}>
                            <div className="sticky top-0 z-1 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border mb-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {group.label}
                                    <span className="ml-2 font-normal text-muted-foreground/70">
                                        — {group.entries.length} event{group.entries.length === 1 ? "" : "s"}
                                    </span>
                                </p>
                            </div>
                            <div className="relative pl-6">
                                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" aria-hidden />
                                <div className="space-y-3">
                                    {group.entries.map((entry) => (
                                        <TimelineRow key={`${entry.category}-${entry.id}`} entry={entry} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
    const style = CATEGORY_STYLES[entry.category] ?? FALLBACK_STYLE;
    const Icon = style.icon;

    return (
        <div className="relative">
            <div
                className={cn(
                    "absolute -left-4 top-3 size-4 rounded-full border-2 border-background flex items-center justify-center",
                    style.iconBgClass,
                )}
                aria-hidden
            >
                <Icon className={cn("size-2.5", style.iconColorClass)} />
            </div>
            <Card className="p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", style.badgeClass)}>
                            {style.label}
                        </Badge>
                        {entry.severity ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                                {entry.severity}
                            </Badge>
                        ) : null}
                        <span className="text-[11px] text-muted-foreground">
                            {formatTimestamp(entry.occurredAt)}
                        </span>
                    </div>
                </div>
                <h3 className="font-semibold text-sm leading-snug mb-1 truncate">
                    {entry.title || "(untitled event)"}
                </h3>
                {entry.summary ? (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {entry.summary}
                    </p>
                ) : null}
            </Card>
        </div>
    );
}
