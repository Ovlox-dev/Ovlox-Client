"use client"

import * as React from "react"
import { useMemo } from "react"
import { useParams } from "next/navigation"

import { Plus, MoreHorizontal, Copy, Trash2, Download, Clock } from "lucide-react"
import { IoLogoGithub } from "react-icons/io5"
import { SiSlack, SiLinear, SiJira, SiDiscord } from "react-icons/si"

import { cn } from "@/lib/utils"
import { useOrganizationAccess } from "@/entities/organization/model/useOrganizationAccess"

import Search from "@/features/search"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { PageTitle } from "@/components/page-title"
import { listProjects } from "@/services/project.service"
import { useListProjects } from "@/shared/queries/projects.queries"
import { dateFormatter } from "@/shared/lib/date-formatter"

type ProjectStatus = "on_track" | "needs_review" | "blocked"
type StatusFilter = "all" | "active" | "completed" | "archived"
export type ToolName = "github" | "slack" | "jira" | "discord" | "linear"

const TOOL_ICONS: Record<ToolName, React.ComponentType<{ className?: string }>> = {
    github: IoLogoGithub,
    slack: SiSlack,
    jira: SiJira,
    discord: SiDiscord,
    linear: SiLinear,
}

const TOOL_LABELS: Record<ToolName, string> = {
    github: "GitHub",
    slack: "Slack",
    jira: "Jira",
    discord: "Discord",
    linear: "Linear",
}

const sortFilterOptions: { value: string; label: string }[] = [
    { value: "1d", label: "1D" },
    { value: "3d", label: "3D" },
    { value: "7d", label: "7D" },
    { value: "14d", label: "14D" },
    { value: "30d", label: "30D" },
]

type Project = {
    id: string
    name: string
    url?: string
    description?: string
    status: ProjectStatus
    phase: string
    tasksCompleted: number
    tasksTotal: number
    lastUpdated: string
    toolsIntegrated: ToolName[]

}

const sampleProjects: Project[] = [
    {
        id: "1",
        name: "Ovlox Dashboard",
        url: "drokpa.vercel.app",
        description: "Main product interface for founders",
        status: "on_track",
        phase: "Building MVP",
        tasksCompleted: 3,
        tasksTotal: 10,
        lastUpdated: "2h ago",
        toolsIntegrated: ["github", "slack", "jira", "linear", "discord"],
    },
    {
        id: "2",
        name: "Ovlox Dashboard",
        url: "tic-tac-toe.vercel.app",
        description: "Main product interface for founders",
        status: "needs_review",
        phase: "Building MVP",
        tasksCompleted: 7,
        tasksTotal: 10,
        lastUpdated: "2h ago",
        toolsIntegrated: ["github", "slack", "linear", "discord"],
    },
    {
        id: "3",
        name: "Ovlox Dashboard",
        url: "umanandasiddha.vercel.app",
        description: "Main product interface for founders",
        status: "blocked",
        phase: "Building MVP",
        tasksCompleted: 1,
        tasksTotal: 10,
        lastUpdated: "2h ago",
        toolsIntegrated: ["github", "slack"],
    },
]

const statusConfig: Record<ProjectStatus, { label: string; dotClass: string; textColor: string }> = {
    on_track: { label: "On Track", dotClass: "bg-radial from-[#19FF75] to-[#80FFB200]", textColor: "text-[#4CFF94]" },
    needs_review: { label: "Needs Review", dotClass: "bg-radial from-[#FFC319] to-[#FFDE8000]", textColor: "text-[#FFD04C]" },
    blocked: { label: "Blocked", dotClass: "bg-radial from-[#DE3A40] to-[#ED929500]", textColor: "text-[#E5666A]" },
}

const data = [
    [
        {
            label: "Duplicate",
            icon: Copy,
        },
        {
            label: "Move to Trash",
            icon: Trash2,
        },
    ]
]

export default function Projects() {
    const params = useParams<{ organizationId: string }>()
    const organizationId = params?.organizationId ?? ""
    const hasAccess = useOrganizationAccess(organizationId)
    const [query, setQuery] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
    const [sortFilter, setSortFilter] = React.useState<string>("")
    const getProjectProgress = React.useCallback((p: Pick<Project, "tasksCompleted" | "tasksTotal">) => {
        if (p.tasksTotal <= 0) return 0
        const percent = (p.tasksCompleted / p.tasksTotal) * 100
        return Math.min(100, Math.max(0, Math.round(percent)))
    }, [])

    // listProjects
    const { data: projects } = useListProjects(organizationId)
    console.log(projects)

    const filteredProjects = useMemo(() => {
        let list = sampleProjects
        if (query) {
            list = list.filter((p) =>
                `${p.name} ${p.description} ${p.url} ${p.phase}`.toLowerCase().includes(query.toLowerCase())
            )
        }
        if (statusFilter !== "all") {
            list = list.filter((p) => {
                if (statusFilter === "active") return p.status === "on_track" || p.status === "needs_review"
                if (statusFilter === "completed") return getProjectProgress(p) === 100
                if (statusFilter === "archived") return p.status === "blocked"
                return true
            })
        }
        return list
    }, [query, statusFilter, getProjectProgress])

    if (!hasAccess) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-6">
                <p className="text-muted-foreground">Redirecting...</p>
            </div>
        );
    }

    const handleSortFilterChange = (value: string) => {
        setSortFilter(value);
    };



    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between">
                <PageTitle
                    title="Projects"
                    description="Track product initiatives and monitor their progress."
                />
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        className="bg-card border-[0.5px] border-border gap-2"
                    >
                        <Download />
                        Import
                    </Button>
                    <Button
                        className="gap-2"
                    >
                        <Plus />
                        New Project
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                <Search
                    placeholder="Search Projects..."
                    handleSearch={(value) => setQuery(value)}
                    className="max-w-md"
                />
                <div className="flex flex-wrap items-center gap-2">
                    <Tabs
                        value={statusFilter}
                        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                        className="w-full sm:w-auto"
                    >
                        <TabsList className=" border-[0.5px] border-border bg-card rounded-md">
                            <TabsTrigger value="all" className="cursor-pointer text-base px-2 py-1 rounded  text-muted dark:data-[state=active]:bg-accent-contrast dark:data-[state=active]:text-text dark:data-[state=active]:border-none">
                                All
                            </TabsTrigger>
                            <TabsTrigger value="active" className="cursor-pointer text-base px-2 py-1 rounded  text-muted dark:data-[state=active]:bg-accent-contrast dark:data-[state=active]:text-text dark:data-[state=active]:border-none">
                                Active
                            </TabsTrigger>
                            <TabsTrigger value="completed" className="cursor-pointer text-base px-2 py-1 rounded  text-muted dark:data-[state=active]:bg-accent-contrast dark:data-[state=active]:text-text dark:data-[state=active]:border-none">
                                Completed
                            </TabsTrigger>
                            <TabsTrigger value="archived" className="cursor-pointer text-base px-2 py-1 rounded  text-muted dark:data-[state=active]:bg-accent-contrast dark:data-[state=active]:text-text dark:data-[state=active]:border-none">
                                Archived
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Select
                        value={sortFilter}
                        onValueChange={(v) => handleSortFilterChange(v as string)}
                    >
                        <SelectTrigger
                            className="text-xs text-[#E5E7EB66] rounded-md dark:bg-card border-[0.5px] border-border"
                        >
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            {sortFilterOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects?.data.map((project) => {
                    const status = statusConfig[project.status as unknown as ProjectStatus]
                    // const projectProgress = getProjectProgress(p)
                    return (
                        <article
                            key={project.id}
                            className="border-[0.5px] border-border rounded-2xl p-4 bg-card flex flex-col space-y-4"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="bg-accent-contrast py-1 px-2 rounded-full flex items-center gap-2 min-w-0">
                                        <span className={cn("size-3 rounded-full shrink-0", status.dotClass)} aria-hidden />
                                        <span className={cn("text-xs font-medium truncate", status.textColor)}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                            >
                                                <MoreHorizontal />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-56 overflow-hidden rounded-lg p-0" align="end">
                                            <Sidebar collapsible="none" className="bg-transparent">
                                                <SidebarContent>
                                                    {data.map((group, index) => (
                                                        <SidebarGroup key={index} className="border-b last:border-none">
                                                            <SidebarGroupContent className="gap-0">
                                                                <SidebarMenu>
                                                                    {group.map((item, idx) => (
                                                                        <SidebarMenuItem key={idx}>
                                                                            <SidebarMenuButton>
                                                                                <item.icon /> <span>{item.label}</span>
                                                                            </SidebarMenuButton>
                                                                        </SidebarMenuItem>
                                                                    ))}
                                                                </SidebarMenu>
                                                            </SidebarGroupContent>
                                                        </SidebarGroup>
                                                    ))}
                                                </SidebarContent>
                                            </Sidebar>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <h3 className="text-text font-semibold text-xl">{project.name}</h3>

                                {/* <Progress
                                    value={projectProgress}
                                /> */}

                                <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center rounded-full bg-accent-contrast text-accent px-2 py-0.5 text-xs font-medium">
                                        Project Phase
                                    </span>
                                    <span className="text-sm text-muted font-medium">
                                        <span className="text-accent">Tasks Completed</span> / Tasks Total <span className="text-xs font-normal">tasks completed</span>
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs font-medium uppercase text-[#565F63] tracking-wide">
                                    Description
                                </p>
                                <p className="text-sm text-muted">{project.description}</p>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="">
                                    <>
                                        {project.integrations?.length && project.integrations?.length > 0 ? (
                                            <AvatarGroup
                                                data-size="sm"
                                                className="flex items-center"
                                            >
                                                {/* {project.integrations
                                                    .slice(0, 3)
                                                    .map((name) => {
                                                        const Icon =
                                                            TOOL_ICONS[name]
                                                        return Icon ? (
                                                            <Avatar
                                                                key={name}
                                                                className="size-6 shrink-0 rounded-full bg-border flex items-center justify-center ring-2 ring-background"
                                                                title={
                                                                    TOOL_LABELS[
                                                                    name
                                                                    ]
                                                                }
                                                            >
                                                                <AvatarFallback className="bg-transparent border-0 size-full p-0 rounded-full">
                                                                    <Icon className="size-6 text-text" />
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        ) : null
                                                    })} */}
                                                {project.integrations?.length && project.integrations?.length > 3 && (
                                                    <AvatarGroupCount className="size-6 text-[10px] font-medium text-text">
                                                        +
                                                        {project.integrations?.length ? project.integrations?.length - 3 : 0}
                                                    </AvatarGroupCount>
                                                )}
                                            </AvatarGroup>
                                        ) : (
                                            <>
                                                <p className="text-base font-medium text-text">
                                                    No
                                                </p>
                                            </>
                                        )}
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                            Integrations
                                        </span>
                                    </>
                                </div>
                                <div>
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map((i) => (
                                            <Avatar key={i} className="h-6 w-6 border-2 border-card">
                                                <AvatarFallback className="text-[10px]">
                                                    {String.fromCharCode(64 + i)}
                                                </AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                        Members
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 text-sm text-[#565F63]">
                                <Clock className="size-3.5" />
                                Last updated:<span className="font-medium text-muted"> {dateFormatter(project.updatedAt as string)}</span>
                            </div>
                        </article>
                    )
                })}
            </div>
        </div>
    )
}