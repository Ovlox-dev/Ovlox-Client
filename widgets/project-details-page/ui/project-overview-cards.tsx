"use client";

import * as React from "react";
import Link from "next/link";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
    Sparkles,
    Shield,
    Flag,
    Zap,
    Loader2,
} from "lucide-react";
import { useGetTimeline, useListProjectIntegrations } from "@/entities/project";
import { useListRiskAlerts } from "@/entities/alerts";
import { cn } from "@/lib/utils";

interface OverviewCardsProps {
    organizationId: string;
    projectId: string;
}

const SPARKLINE_DAYS = 14;

function formatRelative(iso: string | null | undefined): string {
    if (!iso) return "—";
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts)) return "—";
    const diffMs = Date.now() - ts;
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

/**
 * Bin a list of ISO timestamps into per-day counts over the last `days` days.
 * Returns `days` data points in chronological order (oldest first), so the
 * chart reads left → right as past → present.
 */
function buildDailySeries(timestamps: Array<string | null | undefined>, days: number): Array<{ d: string; v: number }> {
    const buckets = new Map<string, number>();
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const t of timestamps) {
        if (!t) continue;
        const key = new Date(t).toISOString().slice(0, 10);
        if (buckets.has(key)) {
            buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }
    }
    return Array.from(buckets.entries()).map(([d, v]) => ({ d, v }));
}

/**
 * Four-card snapshot of "what's happening on this project right now".
 * Each card pairs a stat with a small sparkline (last 14 days) so users see
 * trend at a glance, not just a static number.
 */
export function ProjectOverviewCards({ organizationId, projectId }: OverviewCardsProps) {
    const { data: risks, isLoading: risksLoading } = useListRiskAlerts(
        organizationId,
        projectId,
        { resolved: false, limit: 100 },
    );

    const { data: featureTimeline, isLoading: featuresLoading } = useGetTimeline(
        organizationId,
        projectId,
        { categories: ["FEATURE"], limit: 100 },
    );

    const { data: milestoneTimeline, isLoading: milestonesLoading } = useGetTimeline(
        organizationId,
        projectId,
        { categories: ["MILESTONE"], limit: 100 },
    );

    // For the "Last sync" card we want a sparkline of webhook activity, which is
    // best approximated by the timeline's COMMIT/PR feed (those rows are written
    // every time a webhook fires).
    const { data: deliveryTimeline } = useGetTimeline(
        organizationId,
        projectId,
        { categories: ["COMMIT", "PULL_REQUEST"], limit: 200 },
    );

    const { data: linkedIntegrations } = useListProjectIntegrations(organizationId, projectId);

    const lastSync = React.useMemo(() => {
        // The integrations endpoint returns lastWebhookAt at the TOP level of each row
        // (see listProjectIntegrations in projects.service.ts). Fall back to the nested
        // integration.lastWebhookAt for older API responses, then to lastSyncAt as a last resort.
        const ts = (linkedIntegrations ?? [])
            .map((l) => l.lastWebhookAt ?? l.integration?.lastWebhookAt ?? l.lastSyncAt ?? l.integration?.lastSyncAt ?? null)
            .filter((t): t is string => !!t)
            .map((t) => new Date(t).getTime())
            .filter((t) => !Number.isNaN(t));
        if (ts.length === 0) return null;
        return new Date(Math.max(...ts)).toISOString();
    }, [linkedIntegrations]);

    const openRiskCount = risks?.alerts?.length ?? 0;
    const topRisk = risks?.alerts?.[0];
    const recentFeature = featureTimeline?.entries?.[0];
    const featureCount = featureTimeline?.entries?.length ?? 0;
    const recentMilestone = milestoneTimeline?.entries?.[0];
    const milestoneCount = milestoneTimeline?.entries?.length ?? 0;

    const riskSeries = React.useMemo(
        () => buildDailySeries((risks?.alerts ?? []).map((a) => a.createdAt as string | undefined), SPARKLINE_DAYS),
        [risks],
    );
    const featureSeries = React.useMemo(
        () => buildDailySeries((featureTimeline?.entries ?? []).map((e) => e.occurredAt), SPARKLINE_DAYS),
        [featureTimeline],
    );
    const milestoneSeries = React.useMemo(
        () => buildDailySeries((milestoneTimeline?.entries ?? []).map((e) => e.occurredAt), SPARKLINE_DAYS),
        [milestoneTimeline],
    );
    const deliverySeries = React.useMemo(
        () => buildDailySeries((deliveryTimeline?.entries ?? []).map((e) => e.occurredAt), SPARKLINE_DAYS),
        [deliveryTimeline],
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0 *:min-w-0">
            <SnapshotCard
                label="Open risks"
                href={`/${organizationId}/projects/${projectId}/alerts`}
                icon={Shield}
                accent="text-amber-600 dark:text-amber-300"
                accentBg="bg-amber-500/15"
                fillFrom="rgb(245, 158, 11)"
                fillTo="rgba(245, 158, 11, 0)"
                strokeColor="rgb(245, 158, 11)"
                value={openRiskCount}
                subtitle={
                    topRisk
                        ? `${topRisk.severity ?? "—"} · ${topRisk.title}`
                        : "No open risks — clean slate"
                }
                isLoading={risksLoading}
                series={riskSeries}
                chartType="bar"
            />

            <SnapshotCard
                label="Recent features"
                href={`/${organizationId}/projects/${projectId}/timeline`}
                icon={Sparkles}
                accent="text-emerald-600 dark:text-emerald-300"
                accentBg="bg-emerald-500/15"
                fillFrom="rgb(16, 185, 129)"
                fillTo="rgba(16, 185, 129, 0)"
                strokeColor="rgb(16, 185, 129)"
                value={featureCount}
                subtitle={
                    recentFeature
                        ? `${formatRelative(recentFeature.occurredAt)} · ${recentFeature.title}`
                        : "Features will appear as they're detected"
                }
                isLoading={featuresLoading}
                series={featureSeries}
                chartType="area"
            />

            <SnapshotCard
                label="Milestones"
                href={`/${organizationId}/projects/${projectId}/timeline`}
                icon={Flag}
                accent="text-purple-600 dark:text-purple-300"
                accentBg="bg-purple-500/15"
                fillFrom="rgb(168, 85, 247)"
                fillTo="rgba(168, 85, 247, 0)"
                strokeColor="rgb(168, 85, 247)"
                value={milestoneCount}
                subtitle={
                    recentMilestone
                        ? `${formatRelative(recentMilestone.occurredAt)} · ${recentMilestone.title}`
                        : "No milestones in the recent window"
                }
                isLoading={milestonesLoading}
                series={milestoneSeries}
                chartType="bar"
            />

            <SnapshotCard
                label="Last sync"
                href={`/${organizationId}/integrations`}
                icon={Zap}
                accent="text-blue-600 dark:text-blue-300"
                accentBg="bg-blue-500/15"
                fillFrom="rgb(59, 130, 246)"
                fillTo="rgba(59, 130, 246, 0)"
                strokeColor="rgb(59, 130, 246)"
                value={null}
                subtitle={lastSync ? formatRelative(lastSync) : "Awaiting first webhook"}
                isLoading={false}
                series={deliverySeries}
                chartType="area"
                largeSubtitle
            />
        </div>
    );
}

interface SnapshotCardProps {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    accentBg: string;
    fillFrom: string;
    fillTo: string;
    strokeColor: string;
    value: number | null;
    subtitle: string;
    isLoading: boolean;
    series: Array<{ d: string; v: number }>;
    chartType: "area" | "bar";
    largeSubtitle?: boolean;
}

function SnapshotCard({
    label,
    href,
    icon: Icon,
    accent,
    accentBg,
    fillFrom,
    fillTo,
    strokeColor,
    value,
    subtitle,
    isLoading,
    series,
    chartType,
    largeSubtitle,
}: SnapshotCardProps) {
    const gradientId = React.useId();
    const hasActivity = series.some((s) => s.v > 0);

    return (
        <Link href={href} className="block">
            <Card className="p-4 hover:border-primary/40 hover:shadow-md transition-all h-full flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        {label}
                    </p>
                    <div className={cn("size-7 rounded-lg flex items-center justify-center", accentBg)}>
                        <Icon className={cn("size-3.5", accent)} />
                    </div>
                </div>
                {isLoading ? (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : value !== null ? (
                    <p className="text-2xl font-bold leading-tight">{value}</p>
                ) : (
                    <p className={cn("font-semibold leading-tight", largeSubtitle ? "text-lg" : "text-sm")}>
                        {subtitle}
                    </p>
                )}
                {value !== null ? (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 mb-2">{subtitle}</p>
                ) : null}

                <div className="mt-auto h-12 -mx-1">
                    {hasActivity ? (
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === "area" ? (
                                <AreaChart data={series} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                                    <defs>
                                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={fillFrom} stopOpacity={0.8} />
                                            <stop offset="100%" stopColor={fillTo} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="v"
                                        stroke={strokeColor}
                                        strokeWidth={1.5}
                                        fill={`url(#${gradientId})`}
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            ) : (
                                <BarChart data={series} margin={{ top: 2, right: 2, bottom: 0, left: 2 }} barCategoryGap={1}>
                                    <Bar dataKey="v" fill={strokeColor} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-end gap-px opacity-25">
                            {Array.from({ length: 14 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex-1 rounded-t-sm"
                                    style={{
                                        height: "8%",
                                        backgroundColor: strokeColor,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </Link>
    );
}
