"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import {
    Settings2,
    Plug,
    ListTodo,
    Plus,
} from "lucide-react"
import { SiDiscord, SiFigma, SiGithub, SiJira, SiLinear, SiNotion, SiSlack } from "react-icons/si"

import { useParams } from "next/navigation"
import {
    useGetContributions,
    useListProjectIntegrations,
} from "@/entities/project"
import { useListTasks } from "@/entities/task"
import Link from "next/link"
import { getInitials } from "@/shared/lib/use-initials"
import { RoleBadge } from "@/shared/ui/role-badge"
import { listProjectMembers } from "@/entities/project/api/projects"
import { getProjectTimeline } from "@/entities/project/api/timeline.api"
import { ProjectOverviewCards } from "./project-overview-cards"
import { IngestionStatusPanel } from "@/widgets/ingestion-status-panel"

type TimeRange = "1d" | "7d" | "15d"

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

const PROVIDER_ICON: Record<string, React.ElementType> = {
    GITHUB: SiGithub,
    SLACK: SiSlack,
    JIRA: SiJira,
    DISCORD: SiDiscord,
    LINEAR: SiLinear,
    NOTION: SiNotion,
    FIGMA: SiFigma,
}

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
    payload?: ReadonlyArray<{ name?: string; value?: number | string; payload?: Record<string, unknown> }>
    label?: string | number
}) {
    if (!active || !payload?.length) { return null }

    const p0 = payload[0]?.payload as
        | { commits?: number; prs?: number; tasksCompleted?: number; total?: number }
        | undefined

    const commits = p0?.commits ?? 0
    const prs = p0?.prs ?? 0
    const tasksCompleted = p0?.tasksCompleted ?? 0
    const total = p0?.total ?? (commits + prs + tasksCompleted)

    return (
        <div className="rounded-lg border border-border bg-card/95 p-2 text-xs text-text shadow-sm">
            <div className="font-medium">{label}</div>
            <div className="mt-1 space-y-0.5">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-(--fg-3)">commits</span>
                    <span className="font-medium">{commits}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-(--fg-3)">pr</span>
                    <span className="font-medium">{prs}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-(--fg-3)">task completed</span>
                    <span className="font-medium">{tasksCompleted}</span>
                </div>
                <div className="pt-1 mt-1 border-t border-border flex items-center justify-between gap-4">
                    <span className="text-(--fg-3)">total</span>
                    <span className="font-semibold">{total}</span>
                </div>
            </div>
        </div>
    )
}

function startOfDay(d: Date): Date {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
}

function startOfHour(d: Date): Date {
    const x = new Date(d)
    x.setMinutes(0, 0, 0)
    return x
}

function addDays(d: Date, days: number): Date {
    const x = new Date(d)
    x.setDate(x.getDate() + days)
    return x
}

function addHours(d: Date, hours: number): Date {
    const x = new Date(d)
    x.setHours(x.getHours() + hours)
    return x
}

function sinceIsoForRange(r: TimeRange): string {
    const now = new Date()
    const today = startOfDay(now)
    if (r === "1d") { return today.toISOString() }
    if (r === "7d") { return addDays(today, -6).toISOString() }
    return addDays(today, -14).toISOString()
}

export function ProjectDetailsPage() {
    const [range, setRange] = React.useState<TimeRange>("1d")
    const [activityFilter, setActivityFilter] = React.useState<"all" | "integrations">("all")
    const [activityRange, setActivityRange] = React.useState<TimeRange>("1d")
    const [members, setMembers] = React.useState<Array<{ id: string; name: string; avatar?: string; role: string }>>([])
    const [memberById, setMemberById] = React.useState<Record<string, string>>({})
    const [membersLoading, setMembersLoading] = React.useState(false)
    const params = useParams<{ organizationId: string, projectId: string }>()
    const organizationId = params.organizationId
    const projectId = params.projectId

    const { data: linkedIntegrations } = useListProjectIntegrations(organizationId, projectId)
    const { data: tasksResponse } = useListTasks(organizationId, projectId, { limit: 200 })
    const contribSinceIso = React.useMemo(() => sinceIsoForRange(activityRange), [activityRange])
    const { data: contribResponse } = useGetContributions(organizationId, projectId, { since: contribSinceIso })

    const [activitySeries, setActivitySeries] = React.useState<
        Array<{
            label: string
            commits: number
            prs: number
            tasksCompleted: number
            total: number
        }>
    >([])
    const [activityLoading, setActivityLoading] = React.useState(false)
    const [activityError, setActivityError] = React.useState<string | null>(null)

    React.useEffect(() => {
        let cancelled = false
        const load = async () => {
            if (!organizationId || !projectId) { return }
            try {
                setMembersLoading(true)
                const data = await listProjectMembers(organizationId, projectId)
                if (cancelled) { return }
                const nextMap: Record<string, string> = {}
                for (const m of data) {
                    const first = m.user?.firstName ?? ""
                    const last = m.user?.lastName ?? ""
                    const fullName = `${first} ${last}`.trim()
                    const name = fullName || m.user?.email || "Unknown"
                    if (m.id) { nextMap[m.id] = name }
                }
                setMemberById(nextMap)
                setMembers(
                    data.slice(0, 6).map((m) => {
                        const first = m.user?.firstName ?? ""
                        const last = m.user?.lastName ?? ""
                        const fullName = `${first} ${last}`.trim()
                        return {
                            id: m.id,
                            name: fullName || m.user?.email || "Unknown",
                            avatar: m.user?.avatarUrl ?? undefined,
                            role: m.role || String(m.predefinedRole ?? "Member"),
                        }
                    }),
                )
            } catch {
                if (!cancelled) { setMembers([]) }
            } finally {
                if (!cancelled) { setMembersLoading(false) }
            }
        }
        load()
        return () => { cancelled = true }
    }, [organizationId, projectId])

    React.useEffect(() => {
        let cancelled = false
        // Build the activity-trend series with ONE timeline call covering the full window
        // and bucketing entries client-side. The previous implementation fired N parallel
        // contributions calls (one per hour for "1d", one per day for "7d"/"15d"), which
        // showed up in server logs as bursts of 12-24 GET /contributions hits per render
        // and risked tripping the global 200/60s throttle. Timeline returns individual
        // events with `occurredAt`, so we just count them per bucket locally.
        const load = async () => {
            if (!organizationId || !projectId) { return }
            setActivityLoading(true)
            setActivityError(null)

            try {
                const tasks = tasksResponse?.tasks ?? []
                const isHourly = range === "1d"
                const now = new Date()

                let bucketStarts: Date[]
                let labelFor: (d: Date) => string

                if (isHourly) {
                    const start = startOfDay(now)
                    const end = startOfHour(now)
                    const hours = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (60 * 60 * 1000)) + 1)
                    bucketStarts = new Array(hours).fill(0).map((_, i) => addHours(start, i))
                    labelFor = (d: Date) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                } else {
                    const days = range === "7d" ? 7 : 15
                    const today = startOfDay(now)
                    const start = addDays(today, -(days - 1))
                    bucketStarts = new Array(days).fill(0).map((_, i) => addDays(start, i))
                    labelFor = days <= 7
                        ? (d: Date) => d.toLocaleDateString(undefined, { weekday: "short" })
                        : (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                }

                const windowStart = bucketStarts[0]
                const windowEndExclusive = isHourly
                    ? addHours(bucketStarts[bucketStarts.length - 1], 1)
                    : addDays(bucketStarts[bucketStarts.length - 1], 1)

                /** Pick the bucket key for an event timestamp: hour or day boundary. */
                const bucketKeyFor = (date: Date): string =>
                    (isHourly ? startOfHour(date) : startOfDay(date)).toISOString()

                // Bucket completed tasks client-side (already loaded via useListTasks).
                const tasksCompletedByBucket: Record<string, number> = {}
                for (const t of tasks) {
                    if (t.status !== "DONE") { continue }
                    const updated = new Date(t.updatedAt)
                    if (Number.isNaN(updated.getTime())) { continue }
                    if (updated.getTime() < windowStart.getTime() || updated.getTime() >= windowEndExclusive.getTime()) { continue }
                    const key = bucketKeyFor(updated)
                    tasksCompletedByBucket[key] = (tasksCompletedByBucket[key] ?? 0) + 1
                }

                // ONE call instead of N. Limit covers the worst case (24h × ~50 events/hour).
                const timeline = await getProjectTimeline(organizationId, projectId, {
                    since: windowStart.toISOString(),
                    until: windowEndExclusive.toISOString(),
                    categories: ["COMMIT", "PULL_REQUEST"],
                    limit: 1500,
                })
                if (cancelled) { return }

                const commitsByBucket: Record<string, number> = {}
                const prsByBucket: Record<string, number> = {}
                for (const entry of timeline.entries ?? []) {
                    const ts = new Date(entry.occurredAt)
                    if (Number.isNaN(ts.getTime())) { continue }
                    const key = bucketKeyFor(ts)
                    if (entry.category === "COMMIT") {
                        commitsByBucket[key] = (commitsByBucket[key] ?? 0) + 1
                    } else if (entry.category === "PULL_REQUEST") {
                        prsByBucket[key] = (prsByBucket[key] ?? 0) + 1
                    }
                }

                const next = bucketStarts.map((bucket) => {
                    const key = bucketKeyFor(bucket)
                    const commits = commitsByBucket[key] ?? 0
                    const prs = prsByBucket[key] ?? 0
                    const tasksCompleted = tasksCompletedByBucket[key] ?? 0
                    return {
                        label: labelFor(bucket),
                        commits,
                        prs,
                        tasksCompleted,
                        total: commits + prs + tasksCompleted,
                    }
                })

                setActivitySeries(next)
            } catch (e) {
                if (cancelled) { return }
                setActivitySeries([])
                setActivityError((e as { message?: string } | null)?.message ?? "Activity API error")
            } finally {
                if (!cancelled) { setActivityLoading(false) }
            }
        }

        load()
        return () => { cancelled = true }
    }, [organizationId, projectId, range, tasksResponse])

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
            TODO: "To Do",
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
            .slice(0, 6)
            .map((c) => ({
                // Backend now COALESCEs name from Identity.displayName / rawProfile.
                // "Anonymous" is the soft fallback for events from a provider account
                // that hasn't sent us any profile data yet (rare).
                name: c.name || c.email || "Anonymous",
                avatarSeed: c.name || c.email || c.key,
                commits: c.commits,
                key: c.key,
            }))
    }, [contribResponse])

    /** Only show providers that are actually connected to this project. */
    const connectedIntegrations = React.useMemo(() => {
        const set = new Set<string>()
        for (const link of linkedIntegrations ?? []) {
            const provider = link.provider ?? link.integration?.type
            const status = link.integrationStatus ?? link.integration?.status
            if (provider && (!status || status === "CONNECTED")) {
                set.add(provider)
            }
        }
        return Array.from(set).map((type) => ({ key: type, status: "connected" as const }))
    }, [linkedIntegrations])



    /** Team Activity feed: contributor totals + task events (created/completed). */
    const teamActivity = React.useMemo(() => {
        const sinceMs = new Date(contribSinceIso).getTime()
        const tasks = tasksResponse?.tasks ?? []

        const items: Array<{
            id: string
            kind: "contrib" | "task"
            actor: string
            verb: string
            target: string
            time: string
            source?: string
            summary: string | null
            ts: number
        }> = []

        // Contributor totals for the selected range (commits + PRs).
        for (const c of contribResponse?.contributors ?? []) {
            const commits = c.commits ?? 0
            const prs = c.pullRequests ?? 0
            if (commits === 0 && prs === 0) { continue }
            const who = c.name || c.email || "Anonymous"
            const parts = [
                commits > 0 ? `${commits} commits` : null,
                prs > 0 ? `${prs} pr` : null,
            ].filter((p): p is string => !!p)
            items.push({
                id: `contrib:${c.key}`,
                kind: "contrib",
                actor: who,
                verb: "made",
                target: parts.join(" • "),
                time: formatRelative(contribSinceIso),
                source: "GITHUB",
                summary: null,
                ts: sinceMs,
            })
        }

        // Task events.
        for (const t of tasks) {
            const createdMs = new Date(t.createdAt).getTime()
            const updatedMs = new Date(t.updatedAt).getTime()
            const activeAssignees = (t.assignedTo ?? []).filter((a) => a?.isActive !== false)
            const hasAssignee = activeAssignees.length > 0

            if (!hasAssignee && Number.isFinite(createdMs) && createdMs >= sinceMs) {
                items.push({
                    id: `task-created:${t.id}`,
                    kind: "task",
                    actor: "Task",
                    verb: "created",
                    target: t.title,
                    time: formatRelative(t.createdAt),
                    source: t.provider ?? undefined,
                    summary: t.description ?? null,
                    ts: createdMs,
                })
            }

            const completedAtMs = t.completedAt ? new Date(t.completedAt).getTime() : Number.NaN
            const doneTs = Number.isFinite(completedAtMs) ? completedAtMs : updatedMs

            if (t.status === "DONE" && Number.isFinite(doneTs) && doneTs >= sinceMs) {
                const completedById = t.completedByMemberId ?? null
                const completedByFromAssignee =
                    completedById
                        ? activeAssignees.find((a) => a.assigneeId === completedById)?.name
                        : null
                const completedByName =
                    completedByFromAssignee ??
                    (completedById && memberById[completedById] ? memberById[completedById] : null)

                const fallbackAssigneeName = activeAssignees[0]?.name ?? "Unassigned"
                const who = completedByName ?? fallbackAssigneeName
                items.push({
                    id: `task-done:${t.id}`,
                    kind: "task",
                    actor: who,
                    verb: "completed",
                    target: `${t.title} task`,
                    time: formatRelative(t.completedAt ?? t.updatedAt),
                    source: t.provider ?? undefined,
                    summary: null,
                    ts: doneTs,
                })
            }
        }

        return items.sort((a, b) => b.ts - a.ts).slice(0, 12)
    }, [contribResponse, contribSinceIso, memberById, tasksResponse])

    const filteredTeamActivity = React.useMemo(() => {
        if (activityFilter === "integrations") {
            return teamActivity.filter((a) => !!a.source)
        }
        return teamActivity
    }, [activityFilter, teamActivity])

    return (
        <div className="space-y-8 min-w-0">
            {/* Snapshot cards: open risks, recent features, milestones, last sync —
                each links to the relevant detail page. */}
            <ProjectOverviewCards organizationId={organizationId} projectId={projectId} />



            {/* `min-w-0` on each grid cell lets recharts ResponsiveContainer
                shrink with the available column width instead of holding its
                natural SVG width and pushing the page into a horizontal scroll. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
                <div className="grid grid-cols-2 gap-4 min-w-0">
                    {/* Integrations */}
                    <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="space-y-1">
                                <p className="text-xs text-(--fg-3) uppercase tracking-wide">Integrations</p>
                                <h3 className="text-sm font-semibold text-text">Connected tools</h3>
                            </div>
                            <Link href={`/${organizationId}/projects/${projectId}/setup?integrations`}>
                                <Button
                                    className="text-xs bg-(--bg-3) border border-(--line-2) text-(--accent-lime) hover:bg-(--bg-2) hover:border-(--accent-lime)"
                                    variant="ghost"
                                >
                                    <Plus className="size-3.5" />
                                </Button>
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {connectedIntegrations.length === 0 ? (
                                <p className="text-sm text-(--fg-3)">No integrations connected yet.</p>
                            ) : connectedIntegrations.map((tool) => {
                                const Icon = PROVIDER_ICON[tool.key] ?? Plug
                                return (
                                    <div key={tool.key} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-9 rounded-xl bg-accent-contrast border-[0.5px] border-border flex items-center justify-center">
                                                <Icon className="size-5 text-text" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-text truncate">{providerLabel(tool.key)}</p>
                                                <p className="text-xs text-(--fg-3)">Status: {tool.status === "connected" ? "connected" : "not connected"}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-(--fg-3)">
                            <Settings2 className="size-3.5" />
                            Integration insights update periodically.
                        </div>
                    </Card>

                    {/* Members */}
                    <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="space-y-1">
                                <p className="text-xs text-(--fg-3) uppercase tracking-wide">Members</p>
                                <h3 className="text-sm font-semibold text-text">Members of this project</h3>
                            </div>
                            <Link href={`/${organizationId}/projects/${projectId}/setup?members`}>
                                <Button
                                    className="text-xs bg-(--bg-3) border border-(--line-2) text-(--accent-lime) hover:bg-(--bg-2) hover:border-(--accent-lime)"
                                    variant="ghost"
                                >
                                    <Plus className="size-3.5" />
                                </Button>
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {membersLoading ? (
                                <p className="text-sm text-(--fg-3)">Loading members…</p>
                            ) : members.length === 0 ? (
                                <p className="text-sm text-(--fg-3)">No members yet.</p>
                            ) : members.map((member) => {
                                return (
                                    <div key={member.id} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-9 rounded-xl bg-accent-contrast border-[0.5px] border-border flex items-center justify-center">
                                                <Avatar className="size-10 rounded-xl bg-border ring-1 ring-background">
                                                    <AvatarImage src={member.avatar} />
                                                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                                </Avatar>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-text truncate">{member.name}</p>
                                                <RoleBadge className="text-xs text-(--fg-3)" role={member.role} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>

                    {/* Top Contributors */}
                    <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs text-(--fg-3) uppercase tracking-wide">Top Contributors</p>
                                <h3 className="mt-1 text-sm font-semibold text-text">Recent impact</h3>
                            </div>
                            <Button variant="ghost" size="xs" className="text-(--accent-lime) hover:bg-(--bg-3)">
                                View all
                            </Button>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            {topContributors.map((c) => (
                                <div key={c.key} className="flex flex-col items-center gap-2">
                                    <Avatar className="size-10 rounded-xl bg-border ring-1 ring-background">
                                        <AvatarImage
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.avatarSeed)}`}
                                        />
                                        <AvatarFallback>{initialsFromName(c.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-center">
                                        <p className="text-xs font-medium text-text leading-tight">{c.name}</p>
                                        <p className="text-[11px] text-(--fg-3)">{c.commits} commits</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Task Status */}
                    <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="space-y-1">
                                <p className="text-xs text-(--fg-3) uppercase tracking-wide">Task Status</p>
                                <h3 className="text-sm font-semibold text-text">Overview</h3>
                            </div>
                            <Badge variant="outline" className="border-border text-(--fg-3) bg-accent-contrast">
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
                                    <div className="text-[11px] text-(--fg-3) mt-1">tasks</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {taskSegments.length === 0 ? (
                                    <p className="text-sm text-(--fg-3)">No tasks yet.</p>
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

                {/* Activity Trend */}
                <div className="grid grid-cols-1 gap-4">
                    <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="space-y-1">
                                <p className="text-xs text-(--fg-3) uppercase tracking-wide">Activity Trend</p>
                                <h3 className="text-sm font-semibold text-text">Commits & work</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {(
                                    [
                                        { key: "1d", label: "Today" },
                                        { key: "7d", label: "7d" },
                                        { key: "15d", label: "15d" },
                                    ] as { key: TimeRange; label: string }[]
                                ).map((b) => (
                                    <Button
                                        key={b.key}
                                        variant={range === b.key ? "default" : "outline"}
                                        size="xs"
                                        className={
                                            range === b.key
                                                ? "bg-(--accent-lime) text-(--bg) hover:bg-(--accent-lime)/90 border border-(--accent-lime)"
                                                : "bg-(--bg-3) border border-(--line-2) text-(--fg-2) hover:text-(--fg) hover:border-(--line)"
                                        }
                                        onClick={() => setRange(b.key)}
                                    >
                                        {b.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full h-full">
                            {activityLoading ? (
                                <div className="h-40 flex items-center justify-center">
                                    <p className="text-sm text-(--fg-3)">Loading activity…</p>
                                </div>
                            ) : activityError ? (
                                <div className="h-40 flex flex-col items-center justify-center text-center gap-1">
                                    <p className="text-sm text-text">Activity unavailable</p>
                                    <p className="text-xs text-(--fg-3)">
                                        {activityError}
                                    </p>
                                </div>
                            ) : activitySeries.length === 0 ? (
                                <div className="h-40 flex items-center justify-center">
                                    <p className="text-sm text-(--fg-3)">No activity yet.</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={activitySeries}
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="commitGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#60CAF9" stopOpacity={0.95} />
                                                <stop offset="100%" stopColor="#60CAF9" stopOpacity={0.25} />
                                            </linearGradient>
                                            <linearGradient id="prGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.95} />
                                                <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.25} />
                                            </linearGradient>
                                            <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#34D399" stopOpacity={0.95} />
                                                <stop offset="100%" stopColor="#34D399" stopOpacity={0.25} />
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
                                        <Bar dataKey="commits" stackId="a" fill="url(#commitGrad)" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="prs" stackId="a" fill="url(#prGrad)" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="tasksCompleted" stackId="a" fill="url(#taskGrad)" radius={[0, 0, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>
                </div>
            </div>



            {/* Live ingestion-transparency panel — currently-running jobs,
                RawEvent counts by source, per-resource last-sync timestamps. */}
            <IngestionStatusPanel organizationId={organizationId} projectId={projectId} />




            {/* Team Activity */}
            <Card className="bg-card border-[0.5px] border-border rounded-2xl p-4 gap-0 py-4 min-w-0 overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-xs text-(--fg-3) uppercase tracking-wide">Team Activity</p>
                        <h3 className="text-sm font-semibold text-text">Latest updates from your team</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {(
                            [
                                { key: "1d", label: "Today" },
                                { key: "7d", label: "7d" },
                                { key: "15d", label: "15d" },
                            ] as { key: TimeRange; label: string }[]
                        ).map((b) => (
                            <Button
                                key={b.key}
                                variant="outline"
                                size="xs"
                                className={
                                    activityRange === b.key
                                        ? "bg-(--accent-lime) text-(--bg) hover:bg-(--accent-lime)/90 border border-(--accent-lime)"
                                        : "bg-(--bg-3) border border-(--line-2) text-(--fg-2) hover:text-(--fg) hover:border-(--line)"
                                }
                                onClick={() => setActivityRange(b.key)}
                            >
                                {b.label}
                            </Button>
                        ))}
                        <span className="mx-1 h-4 w-px bg-border/60" />
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
                                        ? "bg-(--accent-lime) text-(--bg) hover:bg-(--accent-lime)/90 border border-(--accent-lime)"
                                        : "bg-(--bg-3) border border-(--line-2) text-(--fg-2) hover:text-(--fg) hover:border-(--line)"
                                }
                                onClick={() => setActivityFilter(tab.key)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 space-y-3">
                    {filteredTeamActivity.length === 0 ? (
                        <p className="text-sm text-(--fg-3)">No activity yet.</p>
                    ) : filteredTeamActivity.map((a) => {
                        const Icon =
                            a.kind === "task"
                                ? ListTodo
                                : (a.source ? (PROVIDER_ICON[a.source] ?? Plug) : Plug)
                        return (
                            <div
                                key={a.id}
                                className="flex items-center justify-between gap-4 rounded-[12px] bg-accent-contrast/40 border-[0.5px] border-border p-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-10 rounded-full bg-border border-[0.5px] border-background flex items-center justify-center">
                                        <Icon className="size-5 text-text" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-text truncate">
                                            {a.actor} {a.verb} <span className="text-accent">{a.target}</span>
                                        </p>
                                        {a.source ? (
                                            <p className="text-xs text-(--fg-3) mt-0.5">
                                                Source: {providerLabel(a.source)}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-xs text-(--fg-3) whitespace-nowrap">{a.time}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </Card>
        </div>
    )
}
