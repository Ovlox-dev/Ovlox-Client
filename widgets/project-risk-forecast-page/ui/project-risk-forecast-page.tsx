"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Loader2, ShieldAlert, CalendarClock } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiError } from "@/hooks/useApiError";
import { useListFileRisks } from "@/entities/project";
import { useProjectForecast } from "@/entities/forecast";

// Velocity trend → icon + tinted pill. Member-expression component (trend.Icon) is fine in JSX.
function trendMeta(trend?: string): { label: string; Icon: React.ComponentType<{ className?: string }>; className: string } {
    switch ((trend ?? "").toLowerCase()) {
        case "increasing":
            return { label: "increasing", Icon: TrendingUp, className: "border-(--accent-2)/30 bg-(--accent-2)/10 text-(--accent-2)" };
        case "declining":
            return { label: "declining", Icon: TrendingDown, className: "border-(--danger)/30 bg-(--danger)/10 text-(--danger)" };
        default:
            return { label: trend ? trend.toLowerCase() : "stable", Icon: Minus, className: "border-(--line) bg-(--bg-3) text-(--fg-2)" };
    }
}

function riskMeta(level?: string): { label: string; className: string } {
    switch ((level ?? "").toLowerCase()) {
        case "critical": return { label: "Critical", className: "border-(--danger)/30 bg-(--danger)/10 text-(--danger)" };
        case "high": return { label: "High", className: "border-(--warn)/30 bg-(--warn)/10 text-(--warn)" };
        case "medium": return { label: "Medium", className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500" };
        case "low": return { label: "Low", className: "border-(--accent-2)/30 bg-(--accent-2)/10 text-(--accent-2)" };
        default: return { label: level || "Unknown", className: "border-(--line) bg-(--bg-3) text-(--fg-2)" };
    }
}

function riskTone(score?: number | null): string {
    const s = score ?? 0;
    if (s >= 75) { return "bg-red-500/15 text-red-600 border-red-500/30"; }
    if (s >= 50) { return "bg-orange-500/15 text-orange-600 border-orange-500/30"; }
    if (s >= 25) { return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30"; }
    return "bg-muted text-muted-foreground";
}

// FileRisk rows carry only a numeric score + reason — derive a severity label for the UI.
function severityLabel(score?: number | null): string {
    const s = score ?? 0;
    if (s >= 75) { return "CRITICAL"; }
    if (s >= 50) { return "HIGH"; }
    if (s >= 25) { return "MEDIUM"; }
    return "LOW";
}

export function ProjectRiskForecastPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const [tab, setTab] = React.useState<"risk" | "forecast">("risk");

    const risksQuery = useListFileRisks(organizationId, projectId, { limit: 100 });
    useApiError(risksQuery.error);

    // Forecast is admin-gated; only fetch when the tab is open, and surface 403 as a friendly note.
    const forecastEnabled = tab === "forecast";
    const forecastQuery = useProjectForecast(projectId, forecastEnabled);

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
            <header>
                <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                    <AlertTriangle className="size-6" /> Risk &amp; forecast
                </h1>
                <p className="text-muted-foreground text-sm">High-risk files detected during indexing, and delivery forecasting.</p>
            </header>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "risk" | "forecast")}>
                <TabsList>
                    <TabsTrigger value="risk">Risk files</TabsTrigger>
                    <TabsTrigger value="forecast">Forecast</TabsTrigger>
                </TabsList>

                <TabsContent value="risk" className="space-y-2">
                    {risksQuery.isPending ? (
                        <div className="flex items-center gap-2 text-sm text-(--fg-3) p-2"><Loader2 className="size-4 animate-spin" /> Loading…</div>
                    ) : (risksQuery.data?.length ?? 0) === 0 ? (
                        <Card className="p-6 text-center text-sm text-muted-foreground">No risk findings yet.</Card>
                    ) : (
                        risksQuery.data!.map((f) => (
                            <Card key={f.id} className="p-3 flex items-start gap-3">
                                <ShieldAlert className="size-4 mt-0.5 text-orange-600 shrink-0" />
                                <div className="flex-1 min-w-0 space-y-1">
                                    <p className="font-mono text-xs text-(--fg) break-all">{f.file?.path ?? f.fileId}</p>
                                    {f.reason ? <p className="text-xs text-muted-foreground">{f.reason}</p> : null}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {f.file?.language ? <Badge variant="outline" className="text-[10px]">{f.file.language}</Badge> : null}
                                        {f.file?.repository?.name ? <span className="text-[10px] text-(--fg-3)">{f.file.repository.name}</span> : null}
                                        {f.detectedAt ? <span className="text-[10px] text-(--fg-3)">{new Date(f.detectedAt).toLocaleDateString()}</span> : null}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <Badge variant="outline" className={`text-[10px] ${riskTone(f.riskScore)}`}>
                                        {severityLabel(f.riskScore)}
                                    </Badge>
                                    <span className="text-xs font-bold text-(--fg)">{Math.round(f.riskScore ?? 0)}</span>
                                </div>
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="forecast" className="space-y-3">
                    {forecastQuery.isError ? (
                        <Card className="p-6 text-center text-sm text-muted-foreground">
                            Delivery forecasting is available to organization admins.
                        </Card>
                    ) : forecastQuery.isPending ? (
                        <div className="flex items-center gap-2 text-sm text-(--fg-3) p-2"><Loader2 className="size-4 animate-spin" /> Generating forecast…</div>
                    ) : forecastQuery.data ? (
                        (() => {
                            const fc = forecastQuery.data;
                            const outlook = fc.forecast ?? {};
                            const trend = trendMeta(outlook.summary?.projectVelocityTrend);
                            const risk = riskMeta(outlook.summary?.overallRiskLevel);
                            const features = outlook.features ?? [];
                            return (
                                <>
                                    <Card className="p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="size-4 text-(--accent-lime)" />
                                            <span className="text-sm font-medium">Project outlook</span>
                                            <span className="ml-auto font-mono text-[10px] text-(--fg-3)">
                                                {fc.model}{fc.cached ? " · cached" : ""}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${trend.className}`}>
                                                <trend.Icon className="size-3.5" /> Velocity {trend.label}
                                            </div>
                                            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${risk.className}`}>
                                                <ShieldAlert className="size-3.5" /> {risk.label} risk
                                            </div>
                                        </div>

                                        {outlook.summary?.narrative ? (
                                            <div className="rounded-[10px] border border-(--accent-lime)/20 bg-(--accent-lime)/6 p-3">
                                                <p className="text-sm leading-relaxed text-(--fg-2)">{outlook.summary.narrative}</p>
                                            </div>
                                        ) : null}

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                            <Stat label="Open features" value={fc.snapshotInputs.openFeatureCount} />
                                            <Stat label="Recent events" value={fc.snapshotInputs.recentEventCount} />
                                            <Stat label="Open incidents" value={fc.snapshotInputs.openIncidentCount} />
                                            <Stat label="Risk alerts" value={fc.snapshotInputs.recentRiskAlertCount} />
                                        </div>

                                        {fc.caveats?.length ? (
                                            <ul className="text-[11px] text-(--fg-3) list-disc pl-4 space-y-0.5">
                                                {fc.caveats.map((c, i) => <li key={i}>{c}</li>)}
                                            </ul>
                                        ) : null}
                                    </Card>

                                    <div className="space-y-2">
                                        <h2 className="px-1 text-sm font-medium text-(--fg-2)">Feature delivery</h2>
                                        {features.length === 0 ? (
                                            <Card className="p-6 text-center text-sm text-muted-foreground">
                                                No open features to forecast yet — detect or add features to see delivery predictions.
                                            </Card>
                                        ) : (
                                            features.map((f, i) => (
                                                <Card key={f.featureId ?? i} className="p-3 space-y-2">
                                                    <div className="flex items-start gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-(--fg)">{f.featureTitle}</p>
                                                            {f.reasoning ? <p className="mt-0.5 text-xs text-muted-foreground">{f.reasoning}</p> : null}
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            {f.predictedDeliveryDate ? (
                                                                <div className="inline-flex items-center gap-1 text-xs text-(--fg)">
                                                                    <CalendarClock className="size-3.5 text-(--fg-3)" />
                                                                    {new Date(f.predictedDeliveryDate).toLocaleDateString()}
                                                                </div>
                                                            ) : <span className="text-[10px] text-(--fg-3)">no ETA</span>}
                                                        </div>
                                                    </div>

                                                    {typeof f.deliveryConfidence === "number" ? (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-[10px] text-(--fg-3)">
                                                                <span>Confidence</span>
                                                                <span className="font-mono">{Math.round((f.deliveryConfidence ?? 0) * 100)}%</span>
                                                            </div>
                                                            <div className="h-1.5 overflow-hidden rounded-full bg-(--bg-3)">
                                                                <div className="h-full rounded-full bg-(--accent-lime)" style={{ width: `${Math.round((f.deliveryConfidence ?? 0) * 100)}%` }} />
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    {f.keyRisks?.length ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {f.keyRisks.map((r, ri) => (
                                                                <span key={ri} className="inline-flex items-center gap-1 rounded-full border border-(--warn)/30 bg-(--warn)/10 px-2 py-0.5 text-[10px] text-(--warn)">
                                                                    <AlertTriangle className="size-3" /> {r}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </>
                            );
                        })()
                    ) : null}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-[8px] bg-(--bg-3) py-2">
            <p className="text-lg font-bold text-(--fg)">{value}</p>
            <p className="text-[10px] text-(--fg-3)">{label}</p>
        </div>
    );
}
