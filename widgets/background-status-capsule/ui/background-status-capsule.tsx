"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIngestionStatus } from "@/entities/project";
import { streamProjectReadiness, type ReadinessSnapshot } from "@/lib/sse";

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
 * current project — ingestion, backfill, and code indexing — which otherwise runs invisibly.
 *
 * Driven primarily by the readiness SSE for INSTANT updates: it's the only signal for code indexing
 * (which runs on its own queue, not IngestionJob) and flips BUILDING↔READY the moment it happens.
 * The ingestion-status poll layers on richer per-job detail (provider, progress, resource).
 */
export function BackgroundStatusCapsule() {
    const params = useParams<{ organizationId: string; projectId: string }>();
    const organizationId = params?.organizationId ?? "";
    const projectId = params?.projectId ?? "";

    // Instant readiness via SSE. Tagged with its projectId so a stale snapshot from a previous
    // project is ignored after navigation (no setState reset inside the effect body needed).
    const [readinessState, setReadinessState] = React.useState<{
        projectId: string;
        snap: ReadinessSnapshot;
    } | null>(null);
    React.useEffect(() => {
        if (!organizationId || !projectId) {
            return;
        }
        const sub = streamProjectReadiness(organizationId, projectId, (snap) =>
            setReadinessState({ projectId, snap }),
        );
        return () => sub.unsubscribe();
    }, [organizationId, projectId]);
    const snap = readinessState?.projectId === projectId ? readinessState.snap : null;

    // Poll adds richer per-job detail + a fallback if the SSE drops.
    const { data: ingestion } = useIngestionStatus(organizationId, projectId);
    const running = ingestion?.runningJobs ?? [];

    const building = snap?.contextReadiness === "BUILDING" || (snap?.jobs?.inflight ?? 0) > 0;
    const isBusy = building || running.length > 0;

    // Flash a one-off success/failure when work finishes. Transition detected via React's "adjust
    // state during render" pattern (prevBusy seeded to the current value → no stale flash on mount).
    const [prevBusy, setPrevBusy] = React.useState(isBusy);
    const [flash, setFlash] = React.useState<{ type: "success" | "failed"; detail?: string } | null>(null);
    if (prevBusy !== isBusy) {
        setPrevBusy(isBusy);
        if (prevBusy && !isBusy) {
            const failedJob =
                running.length === 0
                    ? (ingestion?.recentJobs ?? []).find((j) => j.status === "FAILED")
                    : undefined;
            const errored =
                snap?.contextReadiness === "ERROR" ||
                (snap?.jobs?.failed ?? 0) > 0 ||
                !!failedJob;
            setFlash(
                errored
                    ? {
                          type: "failed",
                          detail: failedJob?.error
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
        } else {
            // Building via readiness with no IngestionJob detail — i.e. code indexing / context build.
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
                    {detail ? <span className="text-(--fg-3)">{detail}</span> : null}
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
