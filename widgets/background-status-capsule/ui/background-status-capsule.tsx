"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIngestionStatus } from "@/entities/project";
import {
    streamProjectReadiness,
    type ReadinessSnapshot,
    type ReadinessActivity,
} from "@/lib/sse";

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
 * Floating status capsule (bottom-right) giving feedback on background work for the current project —
 * ingestion, backfill, and code indexing — which otherwise runs invisibly.
 *
 * Driven by the readiness SSE for INSTANT updates. Code indexing publishes live `activity` events
 * (per-file progress) on the same stream, independent of contextReadiness — so even an incremental
 * re-index of an already-READY project surfaces here. The ingestion-status poll layers on richer
 * per-job detail for IngestionJob-based work.
 */
export function BackgroundStatusCapsule() {
    const params = useParams<{ organizationId: string; projectId: string }>();
    const organizationId = params?.organizationId ?? "";
    const projectId = params?.projectId ?? "";

    // Readiness snapshot (contextReadiness/jobs) and live code-index activity are tracked separately,
    // each tagged with its projectId so stale data from a previous project is ignored on navigation.
    const [snapState, setSnapState] = React.useState<{ projectId: string; snap: ReadinessSnapshot } | null>(null);
    const [actState, setActState] = React.useState<{ projectId: string; activity: ReadinessActivity } | null>(null);
    React.useEffect(() => {
        if (!organizationId || !projectId) {
            return;
        }
        const sub = streamProjectReadiness(organizationId, projectId, (event) => {
            if ("contextReadiness" in event) {
                setSnapState({ projectId, snap: event });
            } else {
                setActState({ projectId, activity: event.activity });
            }
        });
        return () => sub.unsubscribe();
    }, [organizationId, projectId]);
    const snap = snapState?.projectId === projectId ? snapState.snap : null;
    const activity = actState?.projectId === projectId ? actState.activity : null;

    // Poll adds richer per-job detail for IngestionJob work + a fallback if the SSE drops.
    const { data: ingestion } = useIngestionStatus(organizationId, projectId);
    const running = ingestion?.runningJobs ?? [];

    const codeIndexing = activity?.state === "running";
    const building = snap?.contextReadiness === "BUILDING" || (snap?.jobs?.inflight ?? 0) > 0;
    const isBusy = running.length > 0 || codeIndexing || building;

    // Flash a one-off success/failure when work finishes. Transition via the "adjust state during
    // render" pattern (prevBusy seeded to the current value → no stale flash on first mount).
    const [prevProjectId, setPrevProjectId] = React.useState(projectId);
    const [prevBusy, setPrevBusy] = React.useState(isBusy);
    const [flash, setFlash] = React.useState<{ type: "success" | "failed"; detail?: string } | null>(null);
    if (prevProjectId !== projectId) {
        // Switched projects — drop any flash from the previous project and re-seed the busy baseline,
        // so a sticky "failed"/"complete" from project A never lingers on project B.
        setPrevProjectId(projectId);
        setPrevBusy(isBusy);
        setFlash(null);
    } else if (prevBusy !== isBusy) {
        setPrevBusy(isBusy);
        if (prevBusy && !isBusy) {
            const failedJob =
                running.length === 0
                    ? (ingestion?.recentJobs ?? []).find((j) => j.status === "FAILED")
                    : undefined;
            const errored =
                snap?.contextReadiness === "ERROR" ||
                activity?.state === "error" ||
                (snap?.jobs?.failed ?? 0) > 0 ||
                !!failedJob;
            setFlash(
                errored
                    ? {
                          type: "failed",
                          detail:
                              activity?.state === "error"
                                  ? activity.message ?? "Code indexing failed"
                                  : failedJob?.error
                                      ? truncate(failedJob.error, 64)
                                      : "See ingestion status",
                      }
                    : { type: "success" },
            );
        } else if (!prevBusy && isBusy) {
            setFlash(null);
        }
    }

    // Auto-dismiss the success flash; failures stay until the user dismisses them.
    React.useEffect(() => {
        if (flash?.type !== "success") {
            return;
        }
        const timer = setTimeout(() => setFlash(null), 6000);
        return () => clearTimeout(timer);
    }, [flash]);

    let view: "running" | "success" | "failed" | null = null;
    if (isBusy) {
        view = "running";
    } else if (flash) {
        view = flash.type;
    }

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
            detail = p?.message
                ? truncate(p.message, 48)
                : typeof p?.total === "number" && p.total > 0
                    ? `${p.current ?? 0} / ${p.total}`
                    : job.resourceName
                        ? truncate(job.resourceName, 48)
                        : null;
        } else if (running.length > 1) {
            label = `${running.length} background jobs running`;
        } else if (codeIndexing) {
            // Live code-indexing: show what's being processed (file) and what it's on (repo).
            label = activity?.repo ? `Indexing ${activity.repo}` : activity?.phase ?? "Indexing code";
            const parts: string[] = [];
            if (activity?.file) {
                parts.push(truncate(activity.file, 40));
            }
            if (typeof activity?.total === "number" && activity.total > 0) {
                parts.push(`${activity.current ?? 0}/${activity.total}`);
            }
            detail = parts.length ? parts.join(" · ") : null;
        } else {
            label = "Building project intelligence";
            const inflight = snap?.jobs?.inflight ?? 0;
            detail = inflight > 0 ? `${inflight} job${inflight === 1 ? "" : "s"} in progress` : "Indexing & analysis";
        }
    } else if (view === "failed") {
        label = "Processing failed";
        detail = flash?.detail ?? null;
    } else {
        label = "Up to date";
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
                    {detail ? <span className="font-mono text-(--fg-3)">{detail}</span> : null}
                </div>

                {view !== "running" ? (
                    <button
                        type="button"
                        onClick={() => setFlash(null)}
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
