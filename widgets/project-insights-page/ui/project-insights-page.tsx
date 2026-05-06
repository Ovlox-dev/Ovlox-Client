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

type TimeRange = "week" | "month" | "quarter";

const STATUS_COLORS: Record<string, string> = {
    DONE: "#10b981",
    IN_PROGRESS: "#3b82f6",
    TODO: "#8b5cf6",
    REVIEW: "#f59e0b",
    BLOCKED: "#ef4444",
    CANCELLED: "#6b7280",
};

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
                name: c.name || c.email || "Unknown",
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

    return (
        <div className="mx-auto space-y-6">
            <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                        <BarChart3 className="size-7" /> Insights
                    </h1>
                    <p className="text-muted-foreground">Project analytics and performance metrics</p>
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
                <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : !hasIntegrations && tasks.length === 0 && entries.length === 0 ? (
                <Card className="p-12 text-center">
                    <Plug className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-1">No integrations linked</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Insights are computed from ingested events and tasks. Connect at least one provider to start seeing data.
                    </p>
                    <Button asChild>
                        <Link href={`/${organizationId}/projects/${projectId}/setup`}>Open setup wizard</Link>
                    </Button>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Completion Rate" value={`${stats.completionRate}%`} icon={TrendingUp} accent="text-green-600" hint={`${stats.completedTasks} of ${stats.totalTasks} tasks`} />
                        <StatCard label="Team Velocity" value={`${stats.velocityPerDay}/day`} icon={Activity} accent="text-blue-600" hint="Tasks completed per day" />
                        <StatCard label="Avg Completion Time" value={stats.avgDays} icon={Clock} accent="text-purple-600" hint="Mean task lifetime" />
                        <StatCard label="Commits" value={`${stats.commits}`} icon={GitBranch} accent="text-orange-600" hint={`In selected range`} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Github Contributors */}
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Github Contributors</h2>
                            {teamProductivityData.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-12 text-center">No contributor activity yet.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={teamProductivityData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="tasks" fill="#3b82f6" name="Total events" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Card>

                        {/* Task Status Distribution */}
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Task Status Distribution</h2>
                            {statusDistribution.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-12 text-center">No tasks yet.</p>
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
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Card>
                    </div>

                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Commit Activity</h2>
                        {commitActivityData.every((d) => d.commits === 0) ? (
                            <p className="text-sm text-muted-foreground py-12 text-center">
                                No commits ingested in this range. Connect GitHub on the Integrations tab to start tracking.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={commitActivityData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="commits" fill="#f59e0b" radius={[8, 8, 0, 0]} />
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
        <Card className="p-4">
            <div className="flex items-start justify-between mb-2">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className={`size-4 ${accent ?? ""}`} />
            </div>
            <p className="text-3xl font-bold">{value}</p>
            {hint ? <p className="text-xs text-muted-foreground mt-2">{hint}</p> : null}
        </Card>
    );
}
