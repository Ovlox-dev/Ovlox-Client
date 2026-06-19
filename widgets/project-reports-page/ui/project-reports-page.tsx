"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { FileText, Calendar, Loader2, Power, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    type ReportType,
    type ScheduledReport,
    useDeleteSchedule,
    useListSchedules,
    useUpsertSchedule,
} from "@/entities/reports";
import { useApiError } from "@/hooks/useApiError";
import { cn } from "@/lib/utils";

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
    { value: "DAILY", label: "Daily", description: "Runs every day — quick standup-style summary" },
    { value: "WEEKLY", label: "Weekly", description: "Weekly digest of activity, blockers, and wins" },
    { value: "MONTHLY", label: "Monthly", description: "Monthly retrospective and trend analysis" },
    { value: "CUSTOM", label: "Custom", description: "Triggered by integrations or scheduled jobs" },
];

function formatNextRun(iso: string | null | undefined): string {
    if (!iso) { return "—"; }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) { return "—"; }
    return date.toLocaleString();
}

export function ProjectReportsPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();

    const schedulesQuery = useListSchedules(organizationId, projectId);
    useApiError(schedulesQuery.error);

    const upsertMutation = useUpsertSchedule(organizationId, projectId);
    const deleteMutation = useDeleteSchedule(organizationId, projectId);

    /** Build a lookup so each row can render either an active schedule or an unconfigured slot. */
    const scheduleByType = React.useMemo(() => {
        const list = schedulesQuery.data?.schedules ?? [];
        const map = new Map<ReportType, ScheduledReport>();
        for (const s of list) { map.set(s.reportType, s); }
        return map;
    }, [schedulesQuery.data]);

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                    <FileText className="size-6" /> Reports
                </h1>
                <p className="text-muted-foreground text-sm">
                    Configure when each report type runs. The backend generates project summaries on the
                    schedule below and stores them as <code className="text-xs bg-muted px-1 py-0.5 rounded">ProjectReport</code> rows.
                </p>
            </header>

            {schedulesQuery.isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-3">
                    {REPORT_TYPES.map((type) => {
                        const schedule = scheduleByType.get(type.value) ?? null;
                        return (
                            <ScheduleRow
                                key={type.value}
                                reportType={type.value}
                                label={type.label}
                                description={type.description}
                                schedule={schedule}
                                onToggleEnabled={(next) =>
                                    upsertMutation.mutate(
                                        {
                                            reportType: type.value,
                                            data: { isEnabled: next, clearError: !!schedule?.lastError },
                                        },
                                        {
                                            onSuccess: () => toast.success(next ? `${type.label} schedule enabled` : `${type.label} schedule paused`),
                                            onError: (err) =>
                                                toast.error("Update failed", {
                                                    description: err instanceof Error ? err.message : String(err),
                                                }),
                                        },
                                    )
                                }
                                onClearError={() =>
                                    upsertMutation.mutate(
                                        { reportType: type.value, data: { clearError: true } },
                                        {
                                            onSuccess: () => toast.success("Error cleared"),
                                            onError: () => toast.error("Failed to clear error."),
                                        },
                                    )
                                }
                                onDelete={() => {
                                    const ok = typeof window !== "undefined"
                                        ? window.confirm(`Stop the ${type.label} schedule for this project?`)
                                        : false;
                                    if (!ok) { return; }
                                    deleteMutation.mutate(type.value, {
                                        onSuccess: () => toast.success("Schedule deleted"),
                                        onError: (err) =>
                                            toast.error("Delete failed", {
                                                description: err instanceof Error ? err.message : String(err),
                                            }),
                                    });
                                }}
                                isMutating={upsertMutation.isPending || deleteMutation.isPending}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ScheduleRow({
    reportType,
    label,
    description,
    schedule,
    onToggleEnabled,
    onClearError,
    onDelete,
    isMutating,
}: {
    reportType: ReportType;
    label: string;
    description: string;
    schedule: ScheduledReport | null;
    onToggleEnabled: (next: boolean) => void;
    onClearError: () => void;
    onDelete: () => void;
    isMutating: boolean;
}) {
    const enabled = schedule?.isEnabled ?? false;
    const hasSchedule = !!schedule;
    return (
        <Card className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">{label}</h3>
                        {hasSchedule ? (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-[10px]",
                                    enabled
                                        ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                        : "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
                                )}
                            >
                                {enabled ? "Active" : "Paused"}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[10px]">Not configured</Badge>
                        )}
                        {schedule?.lastError ? (
                            <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-600 border-red-500/30">
                                <AlertTriangle className="size-3 mr-1" /> Error
                            </Badge>
                        ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    {hasSchedule ? (
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                                <Calendar className="size-3" />
                                Next run: {formatNextRun(schedule.nextRunAt)}
                            </span>
                            {schedule.lastReport ? (
                                <span>
                                    Last: {new Date(schedule.lastReport.createdAt).toLocaleDateString()}
                                </span>
                            ) : (
                                <span>No runs yet</span>
                            )}
                            {(schedule.failureCount ?? 0) > 0 ? (
                                <span className="text-red-600">{schedule.failureCount} failure(s)</span>
                            ) : null}
                        </div>
                    ) : null}
                    {schedule?.lastError ? (
                        <p className="text-xs text-red-600 mt-2 line-clamp-2">
                            {schedule.lastError}
                        </p>
                    ) : null}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {schedule?.lastError ? (
                        <Button variant="outline" size="sm" onClick={onClearError} disabled={isMutating} title="Clear error and reset failure count">
                            <RotateCcw className="size-4" />
                        </Button>
                    ) : null}
                    <div className="inline-flex items-center gap-2">
                        <Power className={cn("size-4", enabled ? "text-emerald-600" : "text-muted-foreground")} />
                        <Switch
                            checked={enabled}
                            onCheckedChange={onToggleEnabled}
                            disabled={isMutating}
                            aria-label={`Toggle ${label} schedule`}
                        />
                    </div>
                    {hasSchedule ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDelete}
                            disabled={isMutating}
                            className="text-destructive hover:text-destructive"
                            aria-label={`Delete ${label} schedule`}
                        >
                            Stop
                        </Button>
                    ) : null}
                </div>
            </div>
            {!hasSchedule ? (
                <p className="text-[11px] text-muted-foreground mt-2">
                    Toggle on to create a {reportType.toLowerCase()} schedule with the default cadence.
                </p>
            ) : null}
        </Card>
    );
}
