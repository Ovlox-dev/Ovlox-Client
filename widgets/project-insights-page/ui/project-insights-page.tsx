"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    BarChart3,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertCircle,
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
    LineChart,
    Line,
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

    const sinceIso = React.useMemo(
        () => new Date(Date.now() - rangeToSinceMs(timeRange)).toISOString(),
        [timeRange],
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

    const tasks = tasksResponse?.tasks ?? [];
    const entries = timelineResponse?.entries ?? [];
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

    /** Task completion trend over time, bucketed by day from `updatedAt`. */
    const taskCompletionData = React.useMemo(() => {
        const completedTs = tasks.filter((t) => t.status === "DONE").map((t) => ({ ts: new Date(t.updatedAt).getTime() }));
        const inProgressTs = tasks.filter((t) => t.status === "IN_PROGRESS").map((t) => ({ ts: new Date(t.updatedAt).getTime() }));
        const pendingTs = tasks.filter((t) => t.status === "TODO" || t.status === "REVIEW").map((t) => ({ ts: new Date(t.updatedAt).getTime() }));
        const completed = bucketCountByDay(completedTs, days);
        const pending = bucketCountByDay(pendingTs, days);
        const inProgress = bucketCountByDay(inProgressTs, days);
        return completed.map((c, i) => ({
            day: c.label,
            completed: c.value,
            pending: pending[i]?.value ?? 0,
            inProgress: inProgress[i]?.value ?? 0,
        }));
    }, [tasks, days]);

    /** Commit activity bucketed by day from timeline entries (COMMIT category). */
    const commitActivityData = React.useMemo(() => {
        const commits = entries
            .filter((e) => e.category === "COMMIT")
            .map((e) => ({ ts: new Date(e.occurredAt).getTime() }));
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
        const now = Date.now();
        const overdueTasks = tasks.filter(
            (t) => t.dueDate && new Date(t.dueDate).getTime() < now && t.status !== "DONE" && t.status !== "CANCELLED",
        ).length;
        const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        const completedWithTimes = tasks.filter((t) => t.status === "DONE");
        const avgMs = completedWithTimes.length === 0
            ? 0
            : completedWithTimes.reduce((acc, t) => acc + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()), 0) /
              completedWithTimes.length;
        const avgDays = avgMs === 0 ? "—" : `${(avgMs / (24 * 60 * 60 * 1000)).toFixed(1)}d`;

        const completedInRange = completedWithTimes.filter(
            (t) => new Date(t.updatedAt).getTime() >= Date.now() - rangeToSinceMs(timeRange),
        ).length;
        const velocityPerDay = (completedInRange / days).toFixed(1);

        const commits = entries.filter((e) => e.category === "COMMIT").length;

        return { totalTasks, completedTasks, activeTasks, overdueTasks, completionRate, avgDays, velocityPerDay, commits };
    }, [tasks, entries, timeRange, days]);

    const isLoading = tasksLoading || timelineLoading;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
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
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
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
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Task Activity Trend</h2>
                            {taskCompletionData.every((d) => d.completed === 0 && d.pending === 0 && d.inProgress === 0) ? (
                                <p className="text-sm text-muted-foreground py-12 text-center">No task activity in this range.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={taskCompletionData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} />
                                        <Line type="monotone" dataKey="pending" stroke="#8b5cf6" strokeWidth={2} />
                                        <Line type="monotone" dataKey="inProgress" stroke="#3b82f6" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </Card>

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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <Card className="p-6">
                                <h2 className="text-lg font-semibold mb-4">Top Contributors</h2>
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
                                            <Bar dataKey="completed" fill="#10b981" name="Tasks" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Card>
                        </div>

                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Task Summary</h2>
                            <div className="space-y-3">
                                <SummaryRow icon={CheckCircle2} iconClass="text-green-600" label="Completed" value={stats.completedTasks} />
                                <SummaryRow icon={Activity} iconClass="text-blue-600" label="Active" value={stats.activeTasks} />
                                <SummaryRow icon={AlertCircle} iconClass="text-red-600" label="Overdue" value={stats.overdueTasks} valueClass="text-red-600" />
                                <SummaryRow icon={BarChart3} iconClass="text-purple-600" label="Total" value={stats.totalTasks} bordered={false} />
                            </div>
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

function SummaryRow({
    icon: Icon,
    iconClass,
    label,
    value,
    valueClass,
    bordered = true,
}: {
    icon: typeof Activity;
    iconClass?: string;
    label: string;
    value: number;
    valueClass?: string;
    bordered?: boolean;
}) {
    return (
        <div className={`flex items-center justify-between ${bordered ? "pb-3 border-b border-border" : ""}`}>
            <div className="flex items-center gap-2">
                <Icon className={`size-4 ${iconClass ?? ""}`} />
                <span className="text-sm">{label}</span>
            </div>
            <span className={`font-semibold ${valueClass ?? ""}`}>{value}</span>
        </div>
    );
}
