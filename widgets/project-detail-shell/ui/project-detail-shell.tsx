"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
    LayoutGrid,
    MessageSquare,
    ListTodo,
    BarChart3,
    GitBranch,
    // FolderGit2,
    // Calendar,
    // GitCommit,
    Activity,
    // AlertTriangle,
    // FileText,
    // Settings,
    type LucideIcon,
    Edit3,
    UserPlus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useGetProject } from "@/entities/project";
import { usePermission } from "@/hooks/usePermission";
import { PermissionName } from "@/shared/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/page-title";

type Tab = {
    label: string;
    /** Path segment after `/projects/[projectId]`. Empty string is the overview tab. */
    segment: string;
    /** Path used in the Link href; falls back to `${base}/${segment}`. */
    href?: (base: string) => string;
    icon: LucideIcon;
    requiredPermission?: PermissionName;
};

const TABS: Tab[] = [
    { label: "Overview", segment: "", icon: LayoutGrid, requiredPermission: PermissionName.VIEW_PROJECTS },
    { label: "Tasks", segment: "tasks", icon: ListTodo, requiredPermission: PermissionName.MANAGE_TASKS },
    { label: "Insights", segment: "insights", icon: BarChart3, requiredPermission: PermissionName.VIEW_PROJECTS },
    { label: "Analysis", segment: "analysis", icon: GitBranch, requiredPermission: PermissionName.VIEW_PROJECTS },
    { label: "Chat", segment: "chat", icon: MessageSquare, requiredPermission: PermissionName.VIEW_PROJECTS },
    // { label: "Repos", segment: "repos", icon: FolderGit2, requiredPermission: PermissionName.VIEW_PROJECTS },
    // { label: "Timeline", segment: "timeline", icon: Calendar, requiredPermission: PermissionName.VIEW_PROJECTS },
    // { label: "Contributions", segment: "contributions", icon: GitCommit, requiredPermission: PermissionName.VIEW_PROJECTS },
    { label: "Events", segment: "events", icon: Activity, requiredPermission: PermissionName.VIEW_PROJECTS },
    // { label: "Alerts", segment: "alerts", icon: AlertTriangle, requiredPermission: PermissionName.VIEW_PROJECTS },
    // { label: "Reports", segment: "reports", icon: FileText, requiredPermission: PermissionName.VIEW_REPORTS },
    // {
    //     label: "Settings",
    //     segment: "settings",
    //     href: (base) => `${base}/settings/branches`,
    //     icon: Settings,
    //     requiredPermission: PermissionName.EDIT_PROJECTS,
    // },
];

const statusDotClass = "bg-radial from-[#19FF75] to-[#80FFB200]"

const statusTextClass = "text-[#4CFF94]"
/** Wraps every project sub-route with a shared header + horizontal tab bar. */
export function ProjectDetailShell({ children }: { children: ReactNode }) {
    const params = useParams<{ organizationId: string; projectId: string }>();
    const organizationId = params?.organizationId ?? "";
    const projectId = params?.projectId ?? "";
    const pathname = usePathname() ?? "";
    const { can, isLoading: isPermLoading } = usePermission(organizationId || null);
    const { data: project } = useGetProject(organizationId, projectId);

    const base = `/${organizationId}/projects/${projectId}`;

    /** Setup wizard is a full-screen onboarding flow — render it without the project shell chrome. */
    if (pathname.startsWith(`${base}/setup`)) {
        return <>{children}</>;
    }

    const visibleTabs = isPermLoading
        ? TABS
        : TABS.filter((tab) => !tab.requiredPermission || can(tab.requiredPermission));

    const activeSegment = (() => {
        if (!pathname.startsWith(base)) { return ""; }
        const trailing = pathname.slice(base.length).replace(/^\/+/, "");
        if (!trailing) { return ""; }
        return trailing.split("/")[0] ?? "";
    })();

    return (
        <div className="space-y-4">
            <div className="border-b border-border bg-background">
                <div className="flex items-start justify-between gap-4">
                    <PageTitle
                        title={project?.name ?? "Project"}
                        description={project?.description || "Main interface for founders to monitor startup activity"}
                        isLoading={false}
                    />
                    <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-accent-contrast px-3 py-1">
                            <span className={`size-2 rounded-full ${statusDotClass}`} aria-hidden />
                            <span className={`text-sm font-medium capitalize ${statusTextClass}`}>{project?.status?.toLowerCase()}</span>
                        </div>
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
                <nav
                    aria-label="Project sections"
                    className="mt-3 flex gap-1 overflow-x-auto px-4 sm:px-6"
                >
                    {visibleTabs.map((tab) => {
                        const isActive = tab.segment === activeSegment;
                        const href = tab.href ? tab.href(base) : tab.segment ? `${base}/${tab.segment}` : base;
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.segment || "overview"}
                                href={href}
                                className={cn(
                                    "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "border-accent text-text"
                                        : "border-transparent text-muted-foreground hover:text-text hover:border-border"
                                )}
                            >
                                <Icon className="size-4" />
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div>{children}</div>
        </div>
    );
}
