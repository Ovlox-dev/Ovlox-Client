"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, TrendingUp, Loader2, ShieldAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiError } from "@/hooks/useApiError";
import { useListFileRisks } from "@/entities/project";
import { useProjectForecast, useProjectFeatureForecast } from "@/entities/forecast";

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
    const featuresQuery = useProjectFeatureForecast(projectId, forecastEnabled);

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
                        <>
                            <Card className="p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="size-4 text-(--accent-lime)" />
                                    <span className="text-sm font-medium">Project outlook</span>
                                    <span className="ml-auto text-[10px] text-(--fg-3)">{forecastQuery.data.model}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                    <Stat label="Open features" value={forecastQuery.data.snapshotInputs.openFeatureCount} />
                                    <Stat label="Recent events" value={forecastQuery.data.snapshotInputs.recentEventCount} />
                                    <Stat label="Open incidents" value={forecastQuery.data.snapshotInputs.openIncidentCount} />
                                    <Stat label="Risk alerts" value={forecastQuery.data.snapshotInputs.recentRiskAlertCount} />
                                </div>
                                <pre className="text-xs text-(--fg-2) whitespace-pre-wrap bg-(--bg-3) rounded-[8px] p-3 overflow-x-auto">
                                    {JSON.stringify(forecastQuery.data.forecast, null, 2)}
                                </pre>
                                {forecastQuery.data.caveats?.length ? (
                                    <ul className="text-[11px] text-(--fg-3) list-disc pl-4 space-y-0.5">
                                        {forecastQuery.data.caveats.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                ) : null}
                            </Card>

                            {(featuresQuery.data?.features?.length ?? 0) > 0 ? (
                                <div className="space-y-2">
                                    {featuresQuery.data!.features.map((f) => (
                                        <Card key={f.id} className="p-3 flex items-start gap-3">
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <p className="text-sm font-medium text-(--fg)">{f.title}</p>
                                                {f.reasoning ? <p className="text-xs text-muted-foreground line-clamp-2">{f.reasoning}</p> : null}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <Badge variant="outline" className="text-[10px]">{f.status}</Badge>
                                                {f.forecastedCompletionDate ? (
                                                    <p className="text-[10px] text-(--fg-3) mt-1">{new Date(f.forecastedCompletionDate).toLocaleDateString()}</p>
                                                ) : null}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : null}
                        </>
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
