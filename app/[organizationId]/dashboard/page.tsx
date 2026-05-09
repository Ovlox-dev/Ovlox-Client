"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useOrganizationAccess } from "@/entities/organization/model/useOrganizationAccess";
import { listIntegrations, listMembers } from "@/entities/organization/api/org";
import { useListProjects, useGetTimeline } from "@/entities/project";
import { useOrgStore } from "@/shared/lib/organization/org-store";
import { IntegrationStatus } from "@/types/enum";
import type { OrgIntegrationStatusItem } from "@/types/api-types";

import { IoLogoGithub } from "react-icons/io5";
import { SiDiscord, SiJira, SiLinear, SiSlack, SiNotion, SiFigma } from "react-icons/si";
import { RiAppsFill } from "react-icons/ri";
import { Loader2, ArrowRight } from "lucide-react";
import type { IconType } from "react-icons";

const PROVIDER_ICONS: Record<string, IconType> = {
    GITHUB: IoLogoGithub,
    SLACK: SiSlack,
    JIRA: SiJira,
    LINEAR: SiLinear,
    NOTION: SiNotion,
    FIGMA: SiFigma,
    DISCORD: SiDiscord,
};

function relativeTime(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

export default function FranchiseeDashboardPage() {
    const params = useParams<{ organizationId: string }>();
    const organizationId = params?.organizationId ?? "";
    const hasAccess = useOrganizationAccess(organizationId);
    const currentOrg = useOrgStore((s) => s.currentOrg);

    const { data: integrationsData } = useQuery({
        queryKey: ["listIntegrations", organizationId],
        queryFn: async () => (await listIntegrations(organizationId)) ?? null,
        enabled: !!organizationId,
    });

    const { data: membersData } = useQuery({
        queryKey: ["orgMembers", organizationId],
        queryFn: async () => (await listMembers(organizationId, { limit: 200 }))?.data ?? [],
        enabled: !!organizationId,
    });

    const { data: projectsResponse } = useListProjects(organizationId, { limit: 50 });
    const projects = projectsResponse?.data ?? [];
    const firstProject = projects[0];
    const projectId = firstProject?.id ?? "";

    const sinceWeek = useMemo(
        () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        []
    );
    const { data: timelineResponse, isLoading: timelineLoading } = useGetTimeline(
        organizationId,
        projectId,
        { since: sinceWeek, limit: 8 }
    );

    const integrations: OrgIntegrationStatusItem[] = integrationsData ?? [];
    const connectedApps = integrations.filter(
        (i) => i.status === IntegrationStatus.CONNECTED
    ).length;
    const totalApps = 5;
    const memberCount = membersData?.length ?? 0;
    const activeProjects = projects.length;
    const weekActivity = timelineResponse?.entries?.length ?? 0;
    const entries = timelineResponse?.entries ?? [];

    if (!hasAccess) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-6">
                <p className="text-(--fg-3)">Redirecting…</p>
            </div>
        );
    }

    const orgName = currentOrg?.name ?? "your organization";

    return (
        <div className="space-y-7">
            {/* HERO */}
            <header className="flex flex-col gap-3">
                <div className="eyebrow">
                    Dashboard · {orgName}
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-(--fg) leading-[1.05]">
                    Welcome back —{" "}
                    <span className="serif italic bg-gradient-to-br from-(--accent-lime) via-(--accent-3) to-(--accent-4) bg-clip-text text-transparent">
                        here&apos;s what&apos;s moving.
                    </span>
                </h1>
                <p className="text-sm text-(--fg-2) max-w-2xl leading-relaxed">
                    Real-time signals across every tool your team uses. Pulse on
                    integrations, velocity, and risks — all in one place.
                </p>
            </header>

            {/* AI SUMMARY */}
            <div className="ai-card">
                <div className="ai-head">
                    <span className="pulse" />
                    Ovlox AI · Org digest
                </div>
                <div className="ai-body">
                    {activeProjects > 0 ? (
                        <>
                            <b>{orgName}</b> has <b>{activeProjects} active project{activeProjects === 1 ? "" : "s"}</b>{" "}
                            and <b>{memberCount} member{memberCount === 1 ? "" : "s"}</b>. {connectedApps} of {totalApps}{" "}
                            integrations are connected. {weekActivity > 0
                                ? `${weekActivity} event${weekActivity === 1 ? "" : "s"} in the last 7 days — pulse looks healthy.`
                                : "No activity this week — kick off a project to start tracking."}
                        </>
                    ) : (
                        <>
                            Welcome to Ovlox. Connect your tools and create your first
                            project to start getting digestible insights about your team&apos;s
                            work.
                        </>
                    )}
                </div>
            </div>

            {/* STATS */}
            <section className="stat-row">
                <div className="stat">
                    <div className="stat-l">Apps connected</div>
                    <div className="stat-v">
                        {connectedApps}
                        <span className="text-base font-medium text-(--fg-3)"> / {totalApps}</span>
                    </div>
                    <div className="stat-d up">▲ live sync</div>
                </div>
                <div className="stat">
                    <div className="stat-l">Members</div>
                    <div className="stat-v">{memberCount}</div>
                    <div className="stat-d flat">— active</div>
                </div>
                <div className="stat">
                    <div className="stat-l">Active projects</div>
                    <div className="stat-v">{activeProjects}</div>
                    <div className="stat-d up">▲ tracked</div>
                </div>
                <div className="stat">
                    <div className="stat-l">Activity · 7d</div>
                    <div className="stat-v">{weekActivity}</div>
                    <div className="stat-d flat">events</div>
                </div>
            </section>

            {/* MAIN GRID — feed + risks */}
            <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
                {/* Activity feed */}
                <div className="frame-card">
                    <div className="frame-titlebar">
                        <div className="frame-dots">
                            <div className="frame-dot r" />
                            <div className="frame-dot y" />
                            <div className="frame-dot g" />
                        </div>
                        <div className="frame-tab">team-activity.live</div>
                        <div className="frame-spacer" />
                        <div className="frame-status">
                            <span className="live" /> last 7 days
                        </div>
                    </div>
                    <div className="frame-card-body">
                        <div className="flex items-baseline justify-between mb-5">
                            <h2 className="text-lg font-semibold text-(--fg)">Recent activity</h2>
                            {firstProject ? (
                                <Link
                                    href={`/${organizationId}/projects/${firstProject.slug || firstProject.id}/timeline`}
                                    className="text-xs text-(--fg-3) hover:text-(--accent-lime) flex items-center gap-1.5 font-mono uppercase tracking-wider transition-colors"
                                >
                                    View timeline <ArrowRight className="size-3" />
                                </Link>
                            ) : null}
                        </div>

                        {!projectId ? (
                            <EmptyState
                                title="No projects yet"
                                body="Create a project to start tracking team activity."
                                cta={{ label: "Create project", href: `/${organizationId}/projects/new-project` }}
                            />
                        ) : timelineLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="size-5 animate-spin text-(--fg-3)" />
                            </div>
                        ) : entries.length === 0 ? (
                            <EmptyState
                                title="Quiet week"
                                body={`No activity in the last 7 days${firstProject?.name ? ` on ${firstProject.name}` : ""}.`}
                            />
                        ) : (
                            <div className="feed">
                                {entries.slice(0, 6).map((e) => {
                                    const provider =
                                        (e.metadata?.provider as string | undefined) ??
                                        (e.metadata?.source as string | undefined);
                                    const Icon = provider ? PROVIDER_ICONS[provider] : RiAppsFill;
                                    return (
                                        <div className="feed-item" key={e.id}>
                                            <div className="feed-ic">
                                                <Icon className="size-4" />
                                            </div>
                                            <div className="feed-text">
                                                <span className="text-(--fg)">{e.title}</span>
                                                {e.summary ? (
                                                    <span className="muted block text-xs mt-0.5">
                                                        {e.summary.slice(0, 80)}
                                                        {e.summary.length > 80 ? "…" : ""}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="feed-time">{relativeTime(e.occurredAt)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Risks panel */}
                <aside className="frame-card">
                    <div className="frame-titlebar">
                        <div className="frame-dots">
                            <div className="frame-dot r" />
                            <div className="frame-dot y" />
                            <div className="frame-dot g" />
                        </div>
                        <div className="frame-tab">risk-engine</div>
                    </div>
                    <div className="frame-card-body" style={{ padding: "24px 22px" }}>
                        <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--fg-3) mb-3 font-semibold">
                            Detected risks
                        </h3>

                        {connectedApps < totalApps ? (
                            <div className="risk">
                                <div className="risk-h">
                                    <span className="risk-tag med">Medium</span>
                                </div>
                                <div className="risk-title">
                                    {totalApps - connectedApps} integration{totalApps - connectedApps === 1 ? "" : "s"} still disconnected
                                </div>
                                <div className="risk-meta">connect for full coverage</div>
                                <div className="risk-bar">
                                    <div
                                        className="risk-bar-fill"
                                        style={{
                                            width: `${((totalApps - connectedApps) / totalApps) * 100}%`,
                                            background: "var(--warn)",
                                        }}
                                    />
                                </div>
                            </div>
                        ) : null}

                        {memberCount <= 1 ? (
                            <div className="risk">
                                <div className="risk-h">
                                    <span className="risk-tag low">Low</span>
                                </div>
                                <div className="risk-title">
                                    Solo workspace
                                </div>
                                <div className="risk-meta">invite teammates to unlock collaboration</div>
                                <div className="risk-bar">
                                    <div
                                        className="risk-bar-fill"
                                        style={{ width: "32%", background: "var(--info)" }}
                                    />
                                </div>
                            </div>
                        ) : null}

                        {activeProjects === 0 ? (
                            <div className="risk">
                                <div className="risk-h">
                                    <span className="risk-tag high">High</span>
                                </div>
                                <div className="risk-title">No projects tracked</div>
                                <div className="risk-meta">nothing to summarise yet</div>
                                <div className="risk-bar">
                                    <div
                                        className="risk-bar-fill"
                                        style={{ width: "92%", background: "var(--danger)" }}
                                    />
                                </div>
                            </div>
                        ) : weekActivity === 0 && activeProjects > 0 ? (
                            <div className="risk">
                                <div className="risk-h">
                                    <span className="risk-tag med">Medium</span>
                                </div>
                                <div className="risk-title">No recent activity</div>
                                <div className="risk-meta">7 days quiet — projects may be stale</div>
                                <div className="risk-bar">
                                    <div
                                        className="risk-bar-fill"
                                        style={{ width: "55%", background: "var(--warn)" }}
                                    />
                                </div>
                            </div>
                        ) : null}

                        {connectedApps === totalApps && memberCount > 1 && activeProjects > 0 && weekActivity > 0 ? (
                            <div className="text-xs text-(--fg-3) py-4 text-center">
                                <span className="inline-flex items-center gap-1.5 font-mono uppercase tracking-wider text-(--accent-2)">
                                    <span className="inline-block size-1.5 rounded-full bg-(--accent-2) shadow-[0_0_8px_var(--accent-2)]" />
                                    All clear
                                </span>
                                <p className="mt-2">No risks detected. Org is healthy.</p>
                            </div>
                        ) : null}
                    </div>
                </aside>
            </section>
        </div>
    );
}

function EmptyState({
    title,
    body,
    cta,
}: {
    title: string;
    body: string;
    cta?: { label: string; href: string };
}) {
    return (
        <div className="text-center py-10 px-6">
            <p className="text-sm text-(--fg) font-medium mb-1">{title}</p>
            <p className="text-xs text-(--fg-3) mb-4">{body}</p>
            {cta ? (
                <Link href={cta.href} className="btn btn-primary text-xs">
                    {cta.label}
                </Link>
            ) : null}
        </div>
    );
}
