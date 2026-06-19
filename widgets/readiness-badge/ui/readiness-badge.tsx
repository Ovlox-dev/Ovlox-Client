"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";
import { type ReadinessSnapshot, streamProjectReadiness } from "@/lib/sse";

interface ReadinessBadgeProps {
    orgId: string;
    projectId: string;
    /** Initial snapshot from a project fetch — avoids a flash before the first SSE event. */
    initialReadiness?: ReadinessSnapshot["contextReadiness"];
    showProgress?: boolean;
}

const variantFor: Record<ReadinessSnapshot["contextReadiness"], { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
    EMPTY: { label: "Not started", cls: "bg-muted text-muted-foreground", Icon: Clock },
    BUILDING: { label: "Indexing", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", Icon: Loader2 },
    READY: { label: "Ready", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", Icon: CheckCircle2 },
    ERROR: { label: "Error", cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30", Icon: AlertCircle },
};

export function ReadinessBadge({
    orgId,
    projectId,
    initialReadiness = "EMPTY",
    showProgress = false,
}: ReadinessBadgeProps) {
    const [snapshot, setSnapshot] = useState<ReadinessSnapshot>({
        projectId,
        contextReadiness: initialReadiness,
        jobs: { total: 0, completed: 0, failed: 0, inflight: 0 },
    });

    useEffect(() => {
        if (!orgId || !projectId) { return; }
        const sub = streamProjectReadiness(orgId, projectId, (e) => {
            // The stream now also carries code-indexing activity events (no contextReadiness);
            // the badge only reflects full readiness snapshots, so ignore activity-only events.
            if ("contextReadiness" in e) {
                setSnapshot(e);
            }
        });
        return () => sub.unsubscribe();
    }, [orgId, projectId]);

    const { label, cls, Icon } = variantFor[snapshot.contextReadiness] ?? variantFor.EMPTY;
    const isBuilding = snapshot.contextReadiness === "BUILDING";

    return (
        <Badge variant="outline" className={`gap-1.5 ${cls}`}>
            <Icon className={`size-3.5 ${isBuilding ? "animate-spin" : ""}`} />
            <span>{label}</span>
            {showProgress && snapshot.jobs.total > 0 && (
                <span className="text-xs opacity-80">
                    {snapshot.jobs.completed}/{snapshot.jobs.total}
                </span>
            )}
        </Badge>
    );
}
