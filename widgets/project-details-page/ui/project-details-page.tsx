"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import {
    Edit3,
    UserPlus,
    Settings2,
} from "lucide-react"

import { PageTitle } from "@/components/page-title"
import { Progress } from "@/components/ui/progress"
import { useParams } from "next/navigation"
import {
    useGetContributions,
    useGetProject,
    useGetTimeline,
    useListProjectIntegrations,
} from "@/entities/project"
import { useListTasks } from "@/entities/task"
import { ExternalProvider } from "@/types/enum"

type TimeRange = "7d" | "30d" | "months"

const statusDotClass = "bg-radial from-[#19FF75] to-[#80FFB200]"

/** Map a provider string to a friendly label. Defaults to the raw provider for unknown ones. */
const PROVIDER_LABEL: Record<string, string> = {
    GITHUB: "GitHub",
    SLACK: "Slack",
    JIRA: "Jira",
    DISCORD: "Discord",
    LINEAR: "Linear",
    NOTION: "Notion",
    FIGMA: "Figma",
}

function providerLabel(p?: string | null): string {
    if (!p) { return "Unknown"; }
    return PROVIDER_LABEL[p] ?? p;
}

function formatRelative(iso: string | null | undefined): string {
    if (!iso) { return ""; }
    const diffMs = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 1) { return "just now"; }
    if (m < 60) { return `${m}m ago`; }
    const h = Math.floor(m / 60);
    if (h < 24) { return `${h}h ago`; }
    return `${Math.floor(h / 24)}d ago`;
}

const ALL_PROVIDERS: ExternalProvider[] = [
    ExternalProvider.GITHUB,
    ExternalProvider.SLACK,
    ExternalProvider.JIRA,
    ExternalProvider.LINEAR,
    ExternalProvider.DISCORD,
    ExternalProvider.NOTION,
    ExternalProvider.FIGMA,
]

const SEGMENT_COLORS = ["#60CAF9", "#3B82F6", "#A78BFA", "#F472B6", "#34D399", "#FBBF24"] as const

function initialsFromName(name: string) {
    return name
        .split(" ")
        .map((p) => p.trim()[0])
        .filter(Boolean)
        .join("")
        .toUpperCase()
}

function activityTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean
    payload?: ReadonlyArray<{ value?: number | string }>
    label?: string | number
}) {
    if (!active || !payload?.length) { return null }

    const v = payload[0]?.value
    return (
        <div className="rounded-lg border border-border bg-card/95 p-2 text-xs text-text shadow-sm">
            <div className="font-medium">{label}</div>
            <div className="mt-0.5 text-muted">{v} events</div>
        </div>
    )
}

export function ProjectDetailsPage() {
    const [range, setRange] = React.useState<TimeRange>("7d")
    const [activityFilter, setActivityFilter] = React.useState<"all" | "integrations">("all")
    const params = useParams<{ organizationId: string, projectId: string }>()
    const organizationId = params.organizationId
    const projectId = params.projectId

    const { data: project, isLoading: isProjectLoading } = useGetProject(organizationId, projectId)
    const { data: linkedIntegrations } = useListProjectIntegrations(organizationId, projectId)
    const { data: tasksResponse } = useListTasks(organizationId, projectId, { limit: 200 })
    const { data: contribResponse } = useGetContributions(organizationId, projectId)

    const sinceForRange = React.useMemo(() => {
        const now = Date.now()
        if (range === "7d") { return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString() }
        if (range === "30d") { return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString() }
        return new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString()
    }, [range])

    const { data: timelineResponse } = useGetTimeline(organizationId, projectId, {
        since: sinceForRange,
        limit: 200,
    })

    /** Bucket entries by day/week/month for the activity chart. */
    const activityChartData = React.useMemo(() => {
        const entries = timelineResponse?.entries ?? []
        if (range === "7d") {
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            const buckets = new Array(7).fill(0)
            const start = new Date()
            start.setHours(0, 0, 0, 0)
            start.setDate(start.getDate() - 6)
            for (const e of entries) {
                const d = new Date(e.occurredAt)
                const idx = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
                if (idx >= 0 && idx < 7) { buckets[idx] += 1 }
            }
            return buckets.map((value, i) => {
                const d = new Date(start)
                d.setDate(start.getDate() + i)
                return { label: days[d.getDay()], value }
            })
        }
        if (range === "30d") {
            const buckets = new Array(5).fill(0)
            const now = Date.now()
            for (const e of entries) {
                const ageDays = Math.floor((now - new Date(e.occurredAt).getTime()) / (24 * 60 * 60 * 1000))
                const wk = Math.min(4, Math.floor(ageDays / 6))
                buckets[4 - wk] += 1
            }
            return buckets.map((value, i) => ({ label: `Wk ${i + 1}`, value }))
        }
        const monthFmt = new Intl.DateTimeFormat(undefined, { month: "short" })
        const monthBuckets = new Map<string, number>()
        for (const e of entries) {
            const key = monthFmt.format(new Date(e.occurredAt))
            monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1)
        }
        return Array.from(monthBuckets.entries()).map(([label, value]) => ({ label, value }))
    }, [timelineResponse, range])

    /** Group tasks by status for the donut chart. */
    const taskSegments = React.useMemo(() => {
        const tasks = tasksResponse?.tasks ?? []
        const counts: Record<string, number> = {}
        for (const t of tasks) {
            counts[t.status] = (counts[t.status] ?? 0) + 1
        }
        const order = ["DONE", "IN_PROGRESS", "TODO", "REVIEW", "BLOCKED", "CANCELLED"] as const
        const labelMap: Record<string, string> = {
            DONE: "Completed",
            IN_PROGRESS: "In Progress",
            TODO: "Pending",
            REVIEW: "Review",
            BLOCKED: "Blocked",
            CANCELLED: "Cancelled",
        }
        return order
            .filter((s) => (counts[s] ?? 0) > 0)
            .map((s, i) => ({ name: labelMap[s], value: counts[s], color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }))
    }, [tasksResponse])

    const taskTotal = React.useMemo(() => taskSegments.reduce((acc, s) => acc + s.value, 0), [taskSegments])

    /** Top three contributors by total event count. */
    const topContributors = React.useMemo(() => {
        const contributors = contribResponse?.contributors ?? []
        return [...contributors]
            .sort((a, b) => {
                const at = a.commits + a.pullRequests + a.messages + a.tasks + a.other
                const bt = b.commits + b.pullRequests + b.messages + b.tasks + b.other
                return bt - at
            })
            .slice(0, 3)
            .map((c) => ({
                name: c.name || c.email || "Unknown",
                avatarSeed: c.name || c.email || c.key,
            }))
    }, [contribResponse])

    /** Compose the integrations card from the org's set of providers, marking which are linked to this project. */
    const integrations = React.useMemo(() => {
        const linkedTypes = new Set(
            (linkedIntegrations ?? []).map((l) => l.integration?.type).filter(Boolean) as string[],
        )
        return ALL_PROVIDERS.map((provider) => ({
            key: provider,
            status: linkedTypes.has(provider) ? ("connected" as const) : ("disconnected" as const),
            action: linkedTypes.has(provider) ? "Connected" : "Connect",
        }))
    }, [linkedIntegrations])

    /** Map timeline entries to the team-activity panel format. */
    const teamActivity = React.useMemo(() => {
        const entries = timelineResponse?.entries ?? []
        return entries.slice(0, 10).map((e) => {
            const provider =
                (e.metadata?.provider as string | undefined) ??
                (e.metadata?.source as string | undefined) ??
                undefined
            return {
                id: e.id,
                actor: (e.metadata?.actor as string | undefined) ?? "Activity",
                verb: e.category.toLowerCase().replace(/_/g, " "),
                target: e.title,
                time: formatRelative(e.occurredAt),
                source: provider,
                summary: e.summary,
            }
        })
    }, [timelineResponse])

    const filteredTeamActivity = React.useMemo(() => {
        if (activityFilter === "integrations") {
            return teamActivity.filter((a) => !!a.source)
        }
        return teamActivity
    }, [activityFilter, teamActivity])

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <PageTitle
                    title={project?.name ?? "Project"}
                    description={project?.description || "Main interface for founders to monitor startup activity"}
                    isLoading={isProjectLoading}
                />
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        className="border-[0.5px] border-border bg-card"
                    >
                        <Edit3 />
                        Edit Project
                    </Button>
                    <Button
                        variant="ghost"
                        className="border-[0.5px] border-border bg-card"
                    >
                        <UserPlus />
                        Add Member
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4">
                        <div>
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted uppercase tracking-wide">Stage</p>
                                    <h2 className="text-xl font-semibold text-text">Building MVP</h2>
                                    <div className="pt-1">
                                        <p className="text-sm font-medium text-muted uppercase tracking-wide">Status</p>
                                        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent-contrast px-3 py-1">
                                            <span className={`size-2 rounded-full ${statusDotClass}`} aria-hidden />
                                            <span className="text-sm font-medium text-[#4CFF94]">On Track</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 font-medium">
                                <p className="text-muted">Last updated</p>
                                <p className="text-text">2 hours ago</p>
                            </div>
                        </div>
                        <div>
                            <Progress
                                value={50}
                            />
                        </div>
                    </Card>

                    <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted uppercase tracking-wide">Integrations</p>
                                <h3 className="text-sm font-semibold text-text">Connected tools</h3>
                            </div>
                            <div className="text-xs text-">Auto-sync</div>
                        </div>
                        <div className="space-y-3">
                            {integrations.map((tool) => {
                                return (
                                    <div key={tool.key} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-9 rounded-xl bg-accent-contrast border-[0.5px] border-border flex items-center justify-center">
                                                {/* <Icon className="size-5 text-text" /> */}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-text truncate">{providerLabel(tool.key)}</p>
                                                <p className="text-xs text-muted">Status: {tool.status === "connected" ? "connected" : "not connected"}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant={tool.status === "connected" ? "outline" : "default"}
                                            size="xs"
                                            className={
                                                tool.status === "connected"
                                                    ? "bg-accent-contrast border-border text-muted"
                                                    : "bg-accent text-card hover:bg-[#4fb8e8]"
                                            }
                                        >
                                            {tool.action}
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                            <Settings2 className="size-3.5" />
                            Integration insights update periodically.
                        </div>
                    </Card>

                    <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wide">Top Contributors</p>
                                <h3 className="mt-1 text-sm font-semibold text-text">Recent impact</h3>
                            </div>
                            <Button variant="ghost" size="xs" className="text-accent hover:bg-accent/10">
                                View all
                            </Button>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            {topContributors.map((c) => (
                                <div key={c.name} className="flex flex-col items-center gap-2">
                                    <Avatar className="size-10 rounded-xl bg-border ring-1 ring-background">
                                        <AvatarImage
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.avatarSeed)}`}
                                        />
                                        <AvatarFallback>{initialsFromName(c.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-center">
                                        <p className="text-xs font-medium text-text leading-tight">{c.name}</p>
                                        <p className="text-[11px] text-muted">Contribution</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted uppercase tracking-wide">Task Status</p>
                                <h3 className="text-sm font-semibold text-text">Overview</h3>
                            </div>
                            <Badge variant="outline" className="border-border text-muted bg-accent-contrast">
                                Last sync 2h
                            </Badge>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative mx-auto" style={{ width: 140, height: 140 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={taskSegments}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={52}
                                            outerRadius={70}
                                            paddingAngle={2}
                                            startAngle={90}
                                            endAngle={-270}
                                            stroke="none"
                                        >
                                            {taskSegments.map((seg) => (
                                                <Cell key={seg.name} fill={seg.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <div className="text-3xl font-semibold text-text leading-none">{taskTotal}</div>
                                    <div className="text-[11px] text-muted mt-1">tasks</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {taskSegments.length === 0 ? (
                                    <p className="text-sm text-muted">No tasks yet.</p>
                                ) : (
                                    taskSegments.map((seg) => (
                                        <div key={seg.name} className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="size-2 rounded-full" style={{ backgroundColor: seg.color }} />
                                                <span className="text-sm font-medium text-text">{seg.name}</span>
                                            </div>
                                            <span className="text-sm font-semibold text-text">{seg.value}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted uppercase tracking-wide">Activity Trend</p>
                                <h3 className="text-sm font-semibold text-text">Commits & work</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {(
                                    [
                                        { key: "7d", label: "7 days" },
                                        { key: "30d", label: "30 days" },
                                        { key: "months", label: "months" },
                                    ] as { key: TimeRange; label: string }[]
                                ).map((b) => (
                                    <Button
                                        key={b.key}
                                        variant={range === b.key ? "default" : "outline"}
                                        size="xs"
                                        className={
                                            range === b.key
                                                ? "bg-accent text-card hover:bg-[#4fb8e8]"
                                                : "bg-accent-contrast border-border text-muted"
                                        }
                                        onClick={() => setRange(b.key)}
                                    >
                                        {b.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={activityChartData}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#60CAF9" stopOpacity={0.95} />
                                            <stop offset="100%" stopColor="#60CAF9" stopOpacity={0.2} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="label"
                                        stroke="#565F63"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: "#79868C", fontSize: 12 }}
                                    />
                                    <YAxis
                                        stroke="#565F63"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: "#79868C", fontSize: 12 }}
                                    />
                                    <Tooltip content={activityTooltip} cursor={{ fill: "rgba(96, 202, 249, 0.12)" }} />
                                    <Bar dataKey="value" fill="url(#activityGrad)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>

            <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-xs text-muted uppercase tracking-wide">Team Activity</p>
                        <h3 className="text-sm font-semibold text-text">Latest updates from your team</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {(
                            [
                                { key: "all", label: "All" },
                                { key: "integrations", label: "Integrations" },
                            ] as const
                        ).map((tab) => (
                            <Button
                                key={tab.key}
                                variant="outline"
                                size="xs"
                                className={
                                    activityFilter === tab.key
                                        ? "bg-accent-contrast border-border text-text"
                                        : "bg-accent-contrast/40 border-border text-muted hover:bg-accent-contrast"
                                }
                                onClick={() => setActivityFilter(tab.key)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 space-y-3">
                    {filteredTeamActivity.map((a) => {
                        return (
                            <div
                                key={a.id}
                                className="flex items-center justify-between gap-4 rounded-[12px] bg-accent-contrast/40 border-[0.5px] border-border p-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-10 rounded-full bg-border border-[0.5px] border-background flex items-center justify-center">
                                        {/* <Icon className="size-5 text-text" /> */}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-text truncate">
                                            {a.actor} {a.verb} <span className="text-accent">{a.target}</span>
                                        </p>
                                        <p className="text-xs text-muted mt-0.5">
                                            Source: {providerLabel(a.source)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-xs text-muted whitespace-nowrap">{a.time}</div>
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        className="text-accent hover:bg-accent/10"
                                    >
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </Card>
        </div>
    )
}

