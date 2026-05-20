"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    BarChart3,
    TrendingUp,
    Clock,
    Calendar,
    Activity,
    GitBranch,
    Loader2,
    Plug,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import {
    useGetContributions,
    useGetTimeline,
    useListProjectIntegrations,
} from "@/entities/project";
import { useListTasks } from "@/entities/task";
import { ContributionHeatmap } from "@/widgets/contribution-heatmap";

type TimeRange = "week" | "month" | "quarter";

// v3 palette — keep aligned with the design tokens declared in globals.css.
// Recharts needs concrete hex values, not CSS variables, so we mirror the
// token values here.
const STATUS_COLORS: Record<string, string> = {
    DONE: "#7cf66f",          // accent-2 (green)
    IN_PROGRESS: "#4af3d9",   // accent-3 (teal)
    TODO: "#a78bff",          // accent-4 (lavender)
    REVIEW: "#ff8a3d",        // warn (orange)
    BLOCKED: "#ff5b6e",       // danger (red)
    CANCELLED: "#6b6b78",     // fg-3 (muted)
};

const CHART_LIME = "#c8ff3e";    // accent-lime
const CHART_TEAL = "#4af3d9";    // accent-3
const CHART_INFO = "#6fb6ff";    // info (blue)
const CHART_GRID = "#26262e";    // line
const CHART_AXIS = "#6b6b78";    // fg-3

const STATUS_LABELS: Record<string, string> = {
    DONE: "Completed",
    IN_PROGRESS: "In Progress",
    TODO: "To Do",
    REVIEW: "In Review",
    BLOCKED: "Blocked",
    CANCELLED: "Cancelled",
};

function rangeToSinceMs(range: TimeRange): number {
    const day = 24 * 60 * 60 * 1000;
    if (range === "week") { return 7 * day; }
    if (range === "month") { return 30 * day; }
    return 90 * day;
}

function toValidMs(value: unknown): number | null {
    if (value === null || value === undefined) { return null; }
    if (value instanceof Date) {
        const ms = value.getTime();
        return Number.isFinite(ms) ? ms : null;
    }
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) { return null; }
        const ms = new Date(trimmed).getTime();
        return Number.isFinite(ms) ? ms : null;
    }
    return null;
}

function bucketCountByDay(items: { ts: number }[], days: number): { label: string; value: number }[] {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const buckets = new Array(days).fill(0);
    for (const item of items) {
        const idx = Math.floor((item.ts - start.getTime()) / (24 * 60 * 60 * 1000));
        if (idx >= 0 && idx < days) { buckets[idx] += 1; }
    }
    return buckets.map((value, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const label = days <= 14
            ? d.toLocaleDateString(undefined, { weekday: "short" })
            : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        return { label, value };
    });
}

export function ProjectInsightsPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const [timeRange, setTimeRange] = React.useState<TimeRange>("week");
    const [nowMs, setNowMs] = React.useState(() => Date.now());

    React.useEffect(() => {
        setNowMs(Date.now());
    }, [timeRange]);

    const sinceIso = React.useMemo(
        () => new Date(nowMs - rangeToSinceMs(timeRange)).toISOString(),
        [timeRange, nowMs],
    );

    const { data: tasksResponse, isLoading: tasksLoading } = useListTasks(organizationId, projectId, { limit: 500 });
    const { data: timelineResponse, isLoading: timelineLoading } = useGetTimeline(organizationId, projectId, {
        since: sinceIso,
        limit: 500,
    });
    const { data: contribResponse } = useGetContributions(organizationId, projectId, {
        since: sinceIso,
    });

    // Always fetch a 365-day window for the contribution heatmap, regardless
    // of the selected `timeRange`. The heatmap is most useful at year-scale.
    const heatmapSinceIso = React.useMemo(
        () => new Date(nowMs - 365 * 24 * 60 * 60 * 1000).toISOString(),
        [nowMs],
    );
    const { data: heatmapResponse } = useGetContributions(organizationId, projectId, {
        since: heatmapSinceIso,
    });

    const { data: linkedIntegrations } = useListProjectIntegrations(organizationId, projectId);
    const hasIntegrations = (linkedIntegrations?.length ?? 0) > 0;

    const tasks = React.useMemo(() => tasksResponse?.tasks ?? [], [tasksResponse]);
    const entries = React.useMemo(() => timelineResponse?.entries ?? [], [timelineResponse]);
    const days = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 90;

    /** Status distribution, derived from real tasks. */
    const statusDistribution = React.useMemo(() => {
        const counts: Record<string, number> = {};
        for (const t of tasks) {
            counts[t.status] = (counts[t.status] ?? 0) + 1;
        }
        return Object.entries(counts).map(([k, v]) => ({
            name: STATUS_LABELS[k] ?? k,
            value: v,
            color: STATUS_COLORS[k] ?? "#94a3b8",
        }));
    }, [tasks]);

    /** Commit activity bucketed by day from timeline entries (COMMIT category). */
    const commitActivityData = React.useMemo(() => {
        const commits = entries
            .filter((e) => e.category === "COMMIT")
            .map((e) => toValidMs(e.occurredAt))
            .filter((ms): ms is number => ms !== null)
            .map((ts) => ({ ts }));
        const buckets = bucketCountByDay(commits, days);
        return buckets.map((b) => ({ date: b.label, commits: b.value }));
    }, [entries, days]);

    /** Top 5 contributors by commits + PRs + tasks within the range. */
    const teamProductivityData = React.useMemo(() => {
        const contributors = contribResponse?.contributors ?? [];
        return [...contributors]
            .map((c) => ({
                name: c.name || c.email || "Anonymous",
                tasks: c.commits + c.pullRequests + c.messages + c.tasks + c.other,
                completed: c.tasks,
            }))
            .sort((a, b) => b.tasks - a.tasks)
            .slice(0, 5);
    }, [contribResponse]);

    const stats = React.useMemo(() => {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === "DONE").length;
        const activeTasks = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "REVIEW").length;
        const blockedTasks = tasks.filter((t) => t.status === "BLOCKED").length;
        const cancelledTasks = tasks.filter((t) => t.status === "CANCELLED").length;
        const overdueTasks = tasks.filter((t) => {
            if (t.status === "DONE" || t.status === "CANCELLED") { return false; }
            const dueMs = toValidMs(t.dueDate);
            return dueMs !== null && dueMs < nowMs;
        }).length;
        const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        const completedWithTimes = tasks.filter((t) => t.status === "DONE");
        const lifetimes = completedWithTimes
            .map((t) => {
                const createdMs = toValidMs(t.createdAt);
                const updatedMs = toValidMs(t.updatedAt);
                if (createdMs === null || updatedMs === null) { return null; }
                const diff = updatedMs - createdMs;
                return diff >= 0 ? diff : null;
            })
            .filter((ms): ms is number => ms !== null);
        const avgMs = lifetimes.length === 0 ? 0 : lifetimes.reduce((acc, ms) => acc + ms, 0) / lifetimes.length;
        const avgDays = avgMs === 0 ? "—" : `${(avgMs / (24 * 60 * 60 * 1000)).toFixed(1)}d`;

        const rangeStartMs = nowMs - rangeToSinceMs(timeRange);
        const completedInRange = completedWithTimes.filter((t) => {
            const updatedMs = toValidMs(t.updatedAt);
            return updatedMs !== null && updatedMs >= rangeStartMs;
        }).length;
        const velocityPerDay = (completedInRange / days).toFixed(1);

        const commits = entries.filter((e) => e.category === "COMMIT").length;

        return { totalTasks, completedTasks, activeTasks, blockedTasks, cancelledTasks, overdueTasks, completionRate, avgDays, velocityPerDay, commits };
    }, [tasks, entries, timeRange, days, nowMs]);

    const isLoading = tasksLoading || timelineLoading;

    const tooltipStyle = {
        backgroundColor: "#0f0f13",
        border: "1px solid #26262e",
        borderRadius: 8,
        color: "#f4f4f6",
        fontSize: 12,
    } as const;

    return (
        <div className="mx-auto space-y-6">
            <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold mb-1 flex items-center gap-2 text-(--fg)">
                        <BarChart3 className="size-7 text-(--accent-lime)" /> Insights
                    </h1>
                    <p className="text-(--fg-2)">Project analytics and performance metrics</p>
                </div>
                <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                    <SelectTrigger className="w-full sm:w-40">
                        <Calendar className="size-4 mr-2" />
                        <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="week">Last 7 days</SelectItem>
                        <SelectItem value="month">Last 30 days</SelectItem>
                        <SelectItem value="quarter">Last 90 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading && tasks.length === 0 && entries.length === 0 ? (
                <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-(--fg-3)" /></div>
            ) : !hasIntegrations && tasks.length === 0 && entries.length === 0 ? (
                <Card className="p-12 text-center bg-(--bg-2) border-(--line-2)">
                    <Plug className="size-10 mx-auto mb-3 text-(--fg-3) opacity-60" />
                    <h3 className="text-lg font-semibold mb-1 text-(--fg)">No integrations linked</h3>
                    <p className="text-sm text-(--fg-2) mb-4">
                        Insights are computed from ingested events and tasks. Connect at least one provider to start seeing data.
                    </p>
                    <Button asChild>
                        <Link href={`/${organizationId}/projects/${projectId}/setup`}>Open setup wizard</Link>
                    </Button>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Completion Rate" value={`${stats.completionRate}%`} icon={TrendingUp} accent="text-(--accent-2)" hint={`${stats.completedTasks} of ${stats.totalTasks} tasks`} />
                        <StatCard label="Team Velocity" value={`${stats.velocityPerDay}/day`} icon={Activity} accent="text-(--accent-3)" hint="Tasks completed per day" />
                        <StatCard label="Avg Completion Time" value={stats.avgDays} icon={Clock} accent="text-(--accent-4)" hint="Mean task lifetime" />
                        <StatCard label="Commits" value={`${stats.commits}`} icon={GitBranch} accent="text-(--accent-lime)" hint={`In selected range`} />
                    </div>

                    {/* Year-scale contribution heatmap — total RawEvent activity per day. */}
                    <Card className="p-6 bg-(--bg-2) border-(--line-2)">
                        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-(--fg)">Activity heatmap</h2>
                            <span className="text-xs font-mono uppercase tracking-wider text-(--fg-3)">
                                last 365 days · all sources
                            </span>
                        </div>
                        <ContributionHeatmap data={heatmapResponse?.heatmap ?? []} days={365} />
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Top contributors */}
                        <Card className="p-6 bg-(--bg-2) border-(--line-2)">
                            <h2 className="text-lg font-semibold mb-4 text-(--fg)">Top contributors</h2>
                            {teamProductivityData.length === 0 ? (
                                <p className="text-sm text-(--fg-3) py-12 text-center">No contributor activity yet.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={teamProductivityData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                                        <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} stroke={CHART_AXIS} tick={{ fill: CHART_AXIS, fontSize: 11 }} />
                                        <YAxis stroke={CHART_AXIS} tick={{ fill: CHART_AXIS, fontSize: 11 }} />
                                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(200,255,62,0.06)" }} />
                                        <Legend wrapperStyle={{ color: CHART_AXIS, fontSize: 12 }} />
                                        <Bar dataKey="tasks" fill={CHART_LIME} name="Total events" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Card>

                        {/* Task Status Distribution */}
                        <Card className="p-6 bg-(--bg-2) border-(--line-2)">
                            <h2 className="text-lg font-semibold mb-4 text-(--fg)">Task status distribution</h2>
                            {statusDistribution.length === 0 ? (
                                <p className="text-sm text-(--fg-3) py-12 text-center">No tasks yet.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={statusDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name} (${value})`}
                                            outerRadius={80}
                                            fill={CHART_INFO}
                                            dataKey="value"
                                        >
                                            {statusDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Card>
                    </div>

                    <Card className="p-6 bg-(--bg-2) border-(--line-2)">
                        <h2 className="text-lg font-semibold mb-4 text-(--fg)">Commit activity</h2>
                        {commitActivityData.every((d) => d.commits === 0) ? (
                            <p className="text-sm text-(--fg-3) py-12 text-center">
                                No commits ingested in this range. Connect GitHub on the Integrations tab to start tracking.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={commitActivityData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                                    <XAxis dataKey="date" stroke={CHART_AXIS} tick={{ fill: CHART_AXIS, fontSize: 11 }} />
                                    <YAxis stroke={CHART_AXIS} tick={{ fill: CHART_AXIS, fontSize: 11 }} />
                                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(200,255,62,0.06)" }} />
                                    <Bar dataKey="commits" fill={CHART_TEAL} radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    accent,
    hint,
}: {
    label: string;
    value: string;
    icon: typeof Activity;
    accent?: string;
    hint?: string;
}) {
    return (
        <Card className="p-4 bg-(--bg-2) border-(--line-2)">
            <div className="flex items-start justify-between mb-2">
                <p className="text-xs uppercase font-mono tracking-wider text-(--fg-3)">{label}</p>
                <Icon className={`size-4 ${accent ?? "text-(--fg-3)"}`} />
            </div>
            <p className="text-3xl font-bold tabular-nums text-(--fg)">{value}</p>
            {hint ? <p className="text-xs text-(--fg-3) mt-2">{hint}</p> : null}
        </Card>
    );
}
