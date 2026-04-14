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

import { IoLogoGithub } from "react-icons/io5"
import { SiJira, SiLinear, SiSlack } from "react-icons/si"
import { PageTitle } from "@/components/page-title"
import { Progress } from "@/components/ui/progress"

type TimeRange = "7d" | "30d" | "months"

type IntegrationKey = "github" | "slack" | "jira"

const statusDotClass = "bg-radial from-[#19FF75] to-[#80FFB200]"

const activityData: Record<TimeRange, { label: string; value: number }[]> = {
    "7d": [
        { label: "Sun", value: 8 },
        { label: "Mon", value: 12 },
        { label: "Tue", value: 10 },
        { label: "Wed", value: 14 },
        { label: "Thu", value: 18 },
        { label: "Fri", value: 22 },
        { label: "Sat", value: 9 },
    ],
    "30d": [
        { label: "Wk 1", value: 18 },
        { label: "Wk 2", value: 24 },
        { label: "Wk 3", value: 21 },
        { label: "Wk 4", value: 28 },
        { label: "Wk 5", value: 31 },
    ],
    months: [
        { label: "Jan", value: 22 },
        { label: "Feb", value: 26 },
        { label: "Mar", value: 31 },
        { label: "Apr", value: 29 },
        { label: "May", value: 34 },
    ],
}

const taskSegments = [
    { name: "Completed", value: 12, color: "#60CAF9" },
    { name: "In Progress", value: 5, color: "#3B82F6" },
    { name: "Pending", value: 3, color: "#A78BFA" },
]

const topContributors = [
    { name: "Rishi Paul", avatarSeed: "RishiPaul" },
    { name: "Javier Ruiz", avatarSeed: "JavierRuiz" },
    { name: "Sana Sharma", avatarSeed: "SanaSharma" },
]

const teamActivity = [
    { id: "1", actor: "Rishi", verb: "updated", target: "ovlox-dashboard", time: "4 mins ago", source: "github" as IntegrationKey },
    { id: "2", actor: "Rishi", verb: "updated", target: "ovlox-dashboard", time: "5 mins ago", source: "slack" as IntegrationKey },
    { id: "3", actor: "Rishi", verb: "updated", target: "ovlox-dashboard", time: "6 mins ago", source: "github" as IntegrationKey },
    { id: "4", actor: "Rishi", verb: "updated", target: "ovlox-dashboard", time: "9 mins ago", source: "linear" as IntegrationKey },
]

const integrationIcons: Record<IntegrationKey, React.ComponentType<{ className?: string }>> = {
    github: IoLogoGithub,
    slack: SiSlack,
    jira: SiJira,
}

const integrationLabels: Record<IntegrationKey, string> = {
    github: "GitHub",
    slack: "Slack",
    jira: "Jira",
}

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
    if (!active || !payload?.length) return null

    const v = payload[0]?.value
    return (
        <div className="rounded-lg border border-border bg-card/95 p-2 text-xs text-text shadow-sm">
            <div className="font-medium">{label}</div>
            <div className="mt-0.5 text-muted">{v} events</div>
        </div>
    )
}

export default function Project() {
    const [range, setRange] = React.useState<TimeRange>("7d")
    const [activityFilter, setActivityFilter] = React.useState<"all" | "projects" | "team-units" | "integrations" | "dev-mode">("all")

    const integrations = React.useMemo(
        () =>
            [
                { key: "github" as IntegrationKey, status: "connected" as const, action: "Connected" },
                { key: "slack" as IntegrationKey, status: "connected" as const, action: "Connected" },
                { key: "jira" as IntegrationKey, status: "disconnected" as const, action: "Connect" },
                { key: "linear" as IntegrationKey, status: "disconnected" as const, action: "Connect" },
            ] as const,
        [],
    )

    const taskTotal = React.useMemo(() => taskSegments.reduce((acc, s) => acc + s.value, 0), [])

    const filteredTeamActivity = React.useMemo(() => {
        if (activityFilter === "all") return teamActivity
        if (activityFilter === "integrations") return teamActivity.filter((a) => a.source === "github" || a.source === "slack")
        if (activityFilter === "projects") return teamActivity
        if (activityFilter === "team-units") return teamActivity
        return teamActivity
    }, [activityFilter])

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <PageTitle
                    title="Ovlox Dashboard"
                    description="Main interface for founders to monitor startup activity"
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

            {/* Top layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column: Stage + Top Contributors */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Stage */}
                    <Card className="bg-card border-[0.5px] border-border rounded-[16px] p-4 gap-0 py-4">
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

                    {/* Integrations */}
                    <Card className="bg-card border-[0.5px] border-border rounded-[16px] p-4 gap-0 py-4">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted uppercase tracking-wide">Integrations</p>
                                <h3 className="text-sm font-semibold text-text">Connected tools</h3>
                            </div>
                            <div className="text-xs text-">Auto-sync</div>
                        </div>
                        <div className="space-y-3">
                            {integrations.map((tool) => {
                                const Icon = integrationIcons[tool.key]
                                return (
                                    <div key={tool.key} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-9 rounded-xl bg-accent-contrast border-[0.5px] border-border flex items-center justify-center">
                                                {/* <Icon className="size-5 text-text" /> */}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-text truncate">{integrationLabels[tool.key]}</p>
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

                    {/* Top Contributors */}
                    <Card className="bg-card border-[0.5px] border-border rounded-[16px] p-4 gap-0 py-4">
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



                    {/* Task Status */}
                    <Card className="bg-card border-[0.5px] border-border rounded-[16px] p-4 gap-0 py-4">
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
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="size-2 rounded-full bg-accent" />
                                        <span className="text-sm font-medium text-text">Completed</span>
                                    </div>
                                    <span className="text-sm font-semibold text-text">{taskSegments[0].value}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="size-2 rounded-full bg-[#3B82F6]" />
                                        <span className="text-sm font-medium text-text">In Progress</span>
                                    </div>
                                    <span className="text-sm font-semibold text-text">{taskSegments[1].value}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="size-2 rounded-full bg-[#A78BFA]" />
                                        <span className="text-sm font-medium text-text">Pending</span>
                                    </div>
                                    <span className="text-sm font-semibold text-text">{taskSegments[2].value}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Middle: Integrations + Task donut */}

                <div className="grid grid-cols-1 gap-4">

                    <Card className="bg-card border-[0.5px] border-border rounded-[16px] p-4 gap-0 py-4">
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
                                    data={activityData[range]}
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

            {/* Team activity */}
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
                                { key: "projects", label: "Projects" },
                                { key: "team-units", label: "Team Units" },
                                { key: "integrations", label: "Integrations" },
                                { key: "dev-mode", label: "Dev Mode" },
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
                        const Icon = integrationIcons[a.source]
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
                                            Source: {integrationLabels[a.source]}
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