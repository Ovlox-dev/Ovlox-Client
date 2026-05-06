"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useListIncidents, useListRiskAlerts, useResolveRiskAlert } from "@/entities/alerts";
import { useApiError } from "@/hooks/useApiError";

const SEVERITY_CLS: Record<string, string> = {
    LOW: "bg-muted text-muted-foreground",
    MEDIUM: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    HIGH: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    CRITICAL: "bg-red-500/15 text-red-600 border-red-500/30",
};

export function ProjectAlertsPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const [tab, setTab] = React.useState<"alerts" | "incidents">("alerts");

    const alertsQuery = useListRiskAlerts(organizationId, projectId, { resolved: false, limit: 100 });
    const incidentsQuery = useListIncidents(organizationId, projectId, { resolved: false, limit: 100 });
    const resolveAlert = useResolveRiskAlert(organizationId, projectId);

    useApiError(alertsQuery.error);
    useApiError(incidentsQuery.error);

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                    <ShieldAlert className="size-6" /> Alerts &amp; Incidents
                </h1>
                <p className="text-muted-foreground text-sm">
                    Bug findings, security vulnerabilities, and incidents detected by Ovlox.
                </p>
            </header>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "alerts" | "incidents")}>
                <TabsList>
                    <TabsTrigger value="alerts">
                        Risk alerts {alertsQuery.data?.alerts && `(${alertsQuery.data.alerts.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="incidents">
                        Incidents {incidentsQuery.data?.incidents && `(${incidentsQuery.data.incidents.length})`}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="alerts" className="space-y-2">
                    {alertsQuery.isPending ? (
                        <Loader value />
                    ) : (alertsQuery.data?.alerts.length ?? 0) === 0 ? (
                        <Empty icon={CheckCircle2} message="No active risk alerts." />
                    ) : (
                        alertsQuery.data!.alerts.map((a) => (
                            <Card key={a.id} className="p-3 flex items-start gap-3">
                                <ShieldAlert className="size-4 mt-0.5 text-orange-600 shrink-0" />
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className={`text-xs ${SEVERITY_CLS[a.severity]}`}>
                                            {a.severity}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">{a.type}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(a.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="font-medium text-sm">{a.title}</p>
                                    {a.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-3">{a.description}</p>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        resolveAlert.mutate(a.id, {
                                            onSuccess: () => toast.success("Alert resolved"),
                                        });
                                    }}
                                    disabled={resolveAlert.isPending}
                                >
                                    Resolve
                                </Button>
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="incidents" className="space-y-2">
                    {incidentsQuery.isPending ? (
                        <Loader value />
                    ) : (incidentsQuery.data?.incidents.length ?? 0) === 0 ? (
                        <Empty icon={CheckCircle2} message="No open incidents." />
                    ) : (
                        incidentsQuery.data!.incidents.map((i) => (
                            <Card key={i.id} className="p-3 flex items-start gap-3">
                                <AlertCircle className="size-4 mt-0.5 text-red-600 shrink-0" />
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className={`text-xs ${SEVERITY_CLS[i.severity] ?? "bg-muted"}`}>
                                            {i.severity}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            Started {new Date(i.startedAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="font-medium text-sm">{i.title}</p>
                                    {i.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-3">{i.description}</p>
                                    )}
                                </div>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function Loader({ value }: { value: boolean }) {
    return value ? (
        <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
    ) : null;
}

function Empty({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
    return (
        <Card className="p-12 flex flex-col items-center gap-3">
            <Icon className="size-8 text-emerald-600" />
            <p className="text-sm text-muted-foreground">{message}</p>
        </Card>
    );
}
