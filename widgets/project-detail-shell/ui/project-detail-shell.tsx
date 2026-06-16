"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
    LayoutGrid,
    MessageSquare,
    ListTodo,
    BarChart3,
    GitBranch,
    Calendar,
    // GitCommit,
    // FolderGit2,
    // Users,
    Activity,
    AlertTriangle,
    BookOpen,
    Code2,
    Network,
    Plug,
    // FileText,
    ChevronLeft,
    ChevronRight,
    // Settings,
    type LucideIcon,
    // Edit3,
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
    { label: "Timeline", segment: "timeline", icon: Calendar, requiredPermission: PermissionName.VIEW_PROJECTS },
    { label: "Events", segment: "events", icon: Activity, requiredPermission: PermissionName.VIEW_PROJECTS },
    // { label: "Commits", segment: "commits", icon: GitCommit, requiredPermission: PermissionName.VIEW_PROJECTS },
    // { label: "Contributions", segment: "contributions", icon: Users, requiredPermission: PermissionName.VIEW_PROJECTS },
    // { label: "Repos", segment: "repos", icon: FolderGit2, requiredPermission: PermissionName.VIEW_PROJECTS },
    // { label: "Alerts", segment: "alerts", icon: AlertTriangle, requiredPermission: PermissionName.VIEW_PROJECTS },
    // { label: "Reports", segment: "reports", icon: FileText, requiredPermission: PermissionName.VIEW_REPORTS },
    { label: "Analysis", segment: "analysis", icon: GitBranch, requiredPermission: PermissionName.VIEW_PROJECTS },
    { label: "Code", segment: "code-browser", icon: Code2, requiredPermission: PermissionName.VIEW_PROJECTS },
    { label: "Graph", segment: "code-graph", icon: Network, requiredPermission: PermissionName.VIEW_PROJECTS },
    { label: "Skills", segment: "skill-documents", icon: BookOpen, requiredPermission: PermissionName.VIEW_PROJECTS },
    { label: "Risk", segment: "risk-forecast", icon: AlertTriangle, requiredPermission: PermissionName.VIEW_PROJECTS },
    { label: "Integrations", segment: "integrations", icon: Plug, requiredPermission: PermissionName.MANAGE_INTEGRATIONS },
    { label: "Chat", segment: "chat", icon: MessageSquare, requiredPermission: PermissionName.VIEW_PROJECTS },
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Wraps every project sub-route with a shared header + horizontal tab bar. */
export function ProjectDetailShell({ children }: { children: ReactNode }) {
    const params = useParams<{ organizationId: string; projectId: string }>();
    const organizationId = params?.organizationId ?? "";
    const projectId = params?.projectId ?? "";
    const pathname = usePathname() ?? "";
    const router = useRouter();
    const { can, isLoading: isPermLoading } = usePermission(organizationId || null);
    const { data: project } = useGetProject(organizationId, projectId);

    const base = `/${organizationId}/projects/${projectId}`;

    /**
     * Once the project is loaded, flip a legacy `/orgSlug/projects/<UUID>/...`
     * URL to `/orgSlug/projects/<slug>/...` so the address bar shows slugs.
     * If the URL is already the slug, this is a no-op.
     */
    useEffect(() => {
        if (!projectId || !project?.slug) { return; }
        if (!UUID_REGEX.test(projectId)) { return; }
        if (project.slug === projectId) { return; }
        const target = pathname.replace(
            `/projects/${projectId}`,
            `/projects/${project.slug}`,
        );
        if (target !== pathname) {
            router.replace(target);
        }
    }, [projectId, project?.slug, pathname, router]);

    /**
     * Cross-org guard: if the user landed on `/orgA/projects/<projectFromOrgB>`
     * (stale bookmark, hand-edited URL, or org-switch that didn't clear the
     * project segment), redirect to the project's *real* org so members /
     * alerts / tasks endpoints stop 404'ing and 403'ing.
     *
     * The `useGetProject` endpoint isn't org-scoped (the controller doesn't
     * pass orgId to the service), so it returns the project regardless of
     * which org slug is in the URL. We detect the mismatch here against
     * `project.organization.slug` and `project.organizationId`.
     */
    useEffect(() => {
        if (!project?.organization?.slug || !organizationId) { return; }
        const projectOrgSlug = project.organization.slug;
        const projectOrgId = project.organizationId;
        // URL identifier may be a slug (post-migration) or a UUID (legacy).
        // Either form is valid as long as it resolves to the project's org.
        if (organizationId === projectOrgSlug) { return; }
        if (organizationId === projectOrgId) { return; }
        const target = pathname.replace(`/${organizationId}`, `/${projectOrgSlug}`);
        if (target !== pathname) {
            router.replace(target);
        }
    }, [project?.organization?.slug, project?.organizationId, organizationId, pathname, router]);

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

    const isChatTab = activeSegment === "chat";

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border bg-background">
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
                        {/* <Button
                            variant="ghost"
                            className="border-[0.5px] border-border bg-card"
                        >
                            <Edit3 />
                            Edit Project
                        </Button> */}
                        <Link href={`/${organizationId}/projects/${projectId}/setup?members`}>
                            <Button
                                variant="ghost"
                                className="border-[0.5px] border-border bg-card"
                            >
                                <UserPlus />
                                Add Member
                            </Button>
                        </Link>
                    </div>
                </div>
                <TabStrip tabs={visibleTabs} activeSegment={activeSegment} base={base} />
            </div>
            <div
                className={cn(
                    "min-h-0 flex-1 pt-4",
                    isChatTab
                        ? "flex flex-col overflow-hidden"
                        : "overflow-x-hidden scrollbar-hide overflow-y-auto",
                )}
            >
                {children}
            </div>
        </div>
    );
}

/**
 * Horizontally-scrollable tab strip with edge fade gradients + chevron arrow
 * affordances. Native scrollbar is hidden — the gradients tell users that more
 * tabs exist off-screen, the arrows give them a click target.
 *
 *  - `canScrollLeft` / `canScrollRight` recompute on scroll + ResizeObserver,
 *    so the affordances appear/disappear correctly when the user resizes the
 *    sidebar or the viewport.
 *  - On route change, the active tab is auto-scrolled into view (centered),
 *    so navigating to a tab that's currently off-screen brings it into the
 *    visible window.
 */
function TabStrip({
    tabs,
    activeSegment,
    base,
}: {
    tabs: Tab[];
    activeSegment: string;
    base: string;
}) {
    const navRef = useRef<HTMLElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = useCallback(() => {
        const el = navRef.current;
        if (!el) { return; }
        // 4px buffer so we don't flicker the affordance at the exact edge.
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    useEffect(() => {
        updateScrollState();
        const el = navRef.current;
        if (!el) { return; }
        el.addEventListener("scroll", updateScrollState, { passive: true });
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        return () => {
            el.removeEventListener("scroll", updateScrollState);
            ro.disconnect();
        };
    }, [updateScrollState]);

    // Bring the active tab into view when the route changes — without this,
    // navigating to a tab that's off-screen leaves the strip parked at its
    // previous scroll offset.
    useEffect(() => {
        const el = navRef.current;
        if (!el) { return; }
        const active = el.querySelector('[data-active="true"]') as HTMLElement | null;
        if (!active) { return; }
        active.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }, [activeSegment]);

    const scrollByAmount = (direction: "left" | "right") => {
        const el = navRef.current;
        if (!el) { return; }
        const amount = Math.max(160, el.clientWidth * 0.6);
        el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
    };

    return (
        <div className="relative mt-3">
            <nav
                ref={navRef}
                aria-label="Project sections"
                className="flex gap-1 overflow-x-auto scrollbar-hide px-4 sm:px-6 scroll-smooth"
            >
                {tabs.map((tab) => {
                    const isActive = tab.segment === activeSegment;
                    const href = tab.href ? tab.href(base) : tab.segment ? `${base}/${tab.segment}` : base;
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.segment || "overview"}
                            href={href}
                            data-active={isActive || undefined}
                            className={cn(
                                "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "border-(--accent-lime) text-(--fg)"
                                    : "border-transparent text-(--fg-2) hover:text-(--fg) hover:border-(--line)"
                            )}
                        >
                            <Icon className={cn("size-4", isActive && "text-(--accent-lime)")} />
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Left affordance: fade gradient + chevron button. Both are
                only mounted when there's actually content off-screen to the
                left, so the strip stays clean when everything fits. */}
            {canScrollLeft ? (
                <>
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-linear-to-r from-(--bg) via-(--bg)/80 to-transparent"
                    />
                    <button
                        type="button"
                        onClick={() => scrollByAmount("left")}
                        aria-label="Scroll tabs left"
                        className={cn(
                            "absolute left-1 top-1/2 -translate-y-1/2 size-7 rounded-full",
                            "bg-(--bg-2) border border-(--line-2) text-(--fg-2)",
                            "flex items-center justify-center",
                            "hover:text-(--accent-lime) hover:border-(--accent-lime)",
                            "transition-colors shadow-sm",
                        )}
                    >
                        <ChevronLeft className="size-3.5" />
                    </button>
                </>
            ) : null}

            {canScrollRight ? (
                <>
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-(--bg) via-(--bg)/80 to-transparent"
                    />
                    <button
                        type="button"
                        onClick={() => scrollByAmount("right")}
                        aria-label="Scroll tabs right"
                        className={cn(
                            "absolute right-1 top-1/2 -translate-y-1/2 size-7 rounded-full",
                            "bg-(--bg-2) border border-(--line-2) text-(--fg-2)",
                            "flex items-center justify-center",
                            "hover:text-(--accent-lime) hover:border-(--accent-lime)",
                            "transition-colors shadow-sm",
                        )}
                    >
                        <ChevronRight className="size-3.5" />
                    </button>
                </>
            ) : null}
        </div>
    );
}