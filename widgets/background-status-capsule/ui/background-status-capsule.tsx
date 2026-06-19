"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIngestionStatus } from "@/entities/project";

function prettyType(t: string): string {
    return t
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(s: string, n: number): string {
    return s.length > n ? `${s.slice(0, n)}…` : s;
}

/**
 * Floating status capsule (bottom-right) that gives the user feedback on background work for the
 * current project — ingestion, backfill, code indexing — which otherwise runs invisibly. Shows live
 * progress while jobs run, then a one-off success/failure flash. Derived from the polling
 * ingestion-status (4s while a job is inflight, 30s idle).
 */
export function BackgroundStatusCapsule() {
    const params = useParams<{ organizationId: string; projectId: string }>();
    const organizationId = params?.organizationId ?? "";
    const projectId = params?.projectId ?? "";
    const { data } = useIngestionStatus(organizationId, projectId);

    const running = data?.runningJobs ?? [];
    const isRunning = running.length > 0;

    // Only flash a result after a run we actually observed this mount — never a stale result on load.
    // Uses React's "adjust state during render" pattern (no ref reads in render, no effect setState).
    const [observedRunning, setObservedRunning] = React.useState(false);
    const [prevRunning, setPrevRunning] = React.useState(isRunning);
    if (prevRunning !== isRunning) {
        setPrevRunning(isRunning);
        if (isRunning && !observedRunning) {
            setObservedRunning(true);
        }
    }

    const lastFinished = React.useMemo(() => {
        const jobs = (data?.recentJobs ?? []).filter((j) => j.finishedAt);
        return (
            [...jobs].sort(
                (a, b) =>
                    new Date(b.finishedAt as string).getTime() -
                    new Date(a.finishedAt as string).getTime(),
            )[0] ?? null
        );
    }, [data?.recentJobs]);

    const [dismissedId, setDismissedId] = React.useState<string | null>(null);

    let view: "running" | "success" | "failed" | null = null;
    if (isRunning) {
        view = "running";
    } else if (observedRunning && lastFinished && lastFinished.id !== dismissedId) {
        view = lastFinished.status === "FAILED" ? "failed" : "success";
    }

    // Auto-dismiss the success flash; failures stay until the user dismisses them.
    React.useEffect(() => {
        if (view !== "success" || !lastFinished) {
            return;
        }
        const finishedId = lastFinished.id;
        const timer = setTimeout(() => setDismissedId(finishedId), 6000);
        return () => clearTimeout(timer);
    }, [view, lastFinished]);

    if (!view || !organizationId || !projectId) {
        return null;
    }

    let label: string;
    let detail: string | null = null;

    if (view === "running") {
        if (running.length === 1) {
            const job = running[0];
            label = prettyType(job.type);
            const p = job.progress;
            if (p?.message) {
                detail = truncate(p.message, 48);
            } else if (typeof p?.total === "number" && p.total > 0) {
                detail = `${p.current ?? 0} / ${p.total}`;
            } else if (job.resourceName) {
                detail = truncate(job.resourceName, 48);
            }
        } else {
            label = `${running.length} background jobs running`;
        }
    } else if (view === "failed") {
        label = `${prettyType(lastFinished!.type)} failed`;
        detail = lastFinished!.error ? truncate(lastFinished!.error, 64) : "See ingestion status";
    } else {
        label = `${prettyType(lastFinished!.type)} complete`;
    }

    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50">
            <div
                role="status"
                aria-live="polite"
                className={cn(
                    "pointer-events-auto flex items-center gap-2.5 rounded-full border bg-(--bg-2)/95 px-3.5 py-2 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)] backdrop-blur",
                    "animate-in fade-in slide-in-from-bottom-2",
                    view === "failed"
                        ? "border-red-500/40"
                        : view === "success"
                            ? "border-emerald-500/40"
                            : "border-(--line)",
                )}
            >
                {view === "running" ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-(--accent-lime)" />
                ) : view === "success" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                ) : (
                    <AlertCircle className="size-4 shrink-0 text-red-400" />
                )}

                <div className="flex items-baseline gap-1.5 text-xs">
                    <span className="font-medium text-(--fg)">{label}</span>
                    {detail ? <span className="text-(--fg-3)">{detail}</span> : null}
                </div>

                {view !== "running" ? (
                    <button
                        type="button"
                        onClick={() => setDismissedId(lastFinished!.id)}
                        aria-label="Dismiss"
                        className="ml-1 text-(--fg-3) transition-colors hover:text-(--fg)"
                    >
                        <X className="size-3.5" />
                    </button>
                ) : null}
            </div>
        </div>
    );
}
