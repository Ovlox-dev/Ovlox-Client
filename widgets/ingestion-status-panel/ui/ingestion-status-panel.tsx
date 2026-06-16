"use client";

import * as React from "react";
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Database,
    Loader2,
    RefreshCw,
    // RotateCcw,
    Sparkles,
    Trash2,
} from "lucide-react";
import { SiDiscord, SiFigma, SiGithub, SiJira, SiLinear, SiNotion, SiSlack } from "react-icons/si";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    CustomModal,
    CustomModalHeader,
    CustomModalTitle,
    CustomModalDescription,
    CustomModalBody,
    CustomModalFooter,
} from "@/components/ui/custom-modal";
import {
    useGetProject,
    useIngestionStatus,
    // useRetryFailedBackfill,
    useReprocessEvents,
    useResetProject,
    type IngestionStatus,
} from "@/entities/project";
import { cn } from "@/lib/utils";

const PROVIDER_ICON: Record<string, React.ElementType> = {
    GITHUB: SiGithub,
    SLACK: SiSlack,
    JIRA: SiJira,
    DISCORD: SiDiscord,
    LINEAR: SiLinear,
    NOTION: SiNotion,
    FIGMA: SiFigma,
};

const PROVIDER_LABEL: Record<string, string> = {
    GITHUB: "GitHub",
    SLACK: "Slack",
    JIRA: "Jira",
    DISCORD: "Discord",
    LINEAR: "Linear",
    NOTION: "Notion",
    FIGMA: "Figma",
};

const EVENT_TYPE_LABEL: Record<string, string> = {
    COMMIT: "commits",
    PULL_REQUEST: "PRs",
    ISSUE: "issues",
    MESSAGE: "messages",
    TASK_UPDATE: "tasks",
    DEPLOYMENT: "deployments",
    INCIDENT: "incidents",
    ERROR: "errors",
    OTHER: "other",
};

function formatRelative(iso: string | null | undefined): string {
    if (!iso) { return "—"; }
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) { return s <= 1 ? "just now" : `${s}s ago`; }
    const m = Math.floor(s / 60);
    if (m < 60) { return `${m}m ago`; }
    const h = Math.floor(m / 60);
    if (h < 24) { return `${h}h ago`; }
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

function compactNumber(n: number): string {
    if (n < 1000) { return String(n); }
    if (n < 1_000_000) { return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`; }
    return `${(n / 1_000_000).toFixed(1)}M`;
}

/**
 * Project-level ingestion-transparency panel. Shows what's currently being
 * ingested, recent jobs, RawEvent counts by source, and per-resource last-sync
 * timestamps. Polls every 4s while inflight, every 30s when idle.
 */
export function IngestionStatusPanel({
    organizationId,
    projectId,
}: {
    organizationId: string;
    projectId: string;
}) {
    const { data, isLoading, isFetching, refetch } = useIngestionStatus(organizationId, projectId);
    const { data: project } = useGetProject(organizationId, projectId);
    // const retryMutation = useRetryFailedBackfill(organizationId, projectId);
    const reprocessMutation = useReprocessEvents(organizationId, projectId);
    const resetMutation = useResetProject(organizationId, projectId);

    const inflightCount = data?.runningJobs.length ?? 0;
    const totalEvents = data?.totalEvents ?? 0;
    // const hasFailedJobs = !!data?.recentJobs.some((j) => j.status === "FAILED");

    // Reset is destructive: name-typing confirmation modal, mirrored after the
    // org-danger-zone delete flow. Name match is case-sensitive on purpose.
    const projectName = project?.name ?? "";
    const [resetModalOpen, setResetModalOpen] = React.useState(false);
    const [resetConfirmText, setResetConfirmText] = React.useState("");
    const resetNamesMatch = !!projectName && resetConfirmText.trim() === projectName;

    const openResetModal = () => {
        setResetConfirmText("");
        setResetModalOpen(true);
    };

    const handleReset = () => {
        if (!resetNamesMatch) { return; }
        resetMutation.mutate(undefined, {
            onSuccess: (res) => {
                const summary = res.cleared
                    ? Object.entries(res.cleared)
                          .filter(([, n]) => n > 0)
                          .map(([k, n]) => `${n} ${k}`)
                          .join(", ")
                    : "";
                toast.success("Project reset", {
                    description: summary || res.message || "Ingested data cleared. Re-link integrations to backfill again.",
                });
                setResetModalOpen(false);
                refetch();
            },
            onError: (err) => {
                toast.error("Reset failed", { description: (err as Error).message });
            },
        });
    };

    // const handleRetryFailed = () => {
    //     retryMutation.mutate(undefined, {
    //         onSuccess: (res) => {
    //             if (res.retried > 0) {
    //                 toast.success(`Re-queued ${res.retried} failed job${res.retried === 1 ? "" : "s"}`);
    //             } else {
    //                 toast.info("Nothing to retry — no failed jobs found");
    //             }
    //             refetch();
    //         },
    //         onError: (err) => {
    //             toast.error("Retry failed", { description: (err as Error).message });
    //         },
    //     });
    // };

    const handleReprocess = () => {
        reprocessMutation.mutate(
            { limit: 5_000 },
            {
                onSuccess: (res) => {
                    if (res.scheduled > 0) {
                        toast.success(`Queued ${res.scheduled} event${res.scheduled === 1 ? "" : "s"} for reprocessing`);
                    } else {
                        toast.info("No unprocessed events to reprocess");
                    }
                    refetch();
                },
                onError: (err) => {
                    toast.error("Reprocess failed", { description: (err as Error).message });
                },
            },
        );
    };

    // Group event counts by source for the per-provider summary cards.
    const bySource = React.useMemo(() => {
        if (!data?.eventCountsBySource) { return []; }
        const groups = new Map<string, {
            source: string;
            total: number;
            byType: Record<string, number>;
            lastEventAt: string | null;
        }>();
        for (const row of data.eventCountsBySource) {
            const existing = groups.get(row.source) ?? {
                source: row.source,
                total: 0,
                byType: {},
                lastEventAt: null as string | null,
            };
            existing.total += row.count;
            existing.byType[row.eventType] = (existing.byType[row.eventType] ?? 0) + row.count;
            if (!existing.lastEventAt || row.lastEventAt > existing.lastEventAt) {
                existing.lastEventAt = row.lastEventAt;
            }
            groups.set(row.source, existing);
        }
        return Array.from(groups.values()).sort((a, b) => b.total - a.total);
    }, [data]);

    return (
        <section className="frame-card overflow-hidden min-w-0">
            <header className="frame-titlebar">
                <span className="frame-dot r" aria-hidden />
                <span className="frame-dot y" aria-hidden />
                <span className="frame-dot g" aria-hidden />
                <span className="frame-tab">ingestion.live</span>
                <span className="frame-spacer" />
                <span className="frame-status flex items-center gap-1.5">
                    {inflightCount > 0 ? (
                        <>
                            <span className="size-1.5 rounded-full bg-(--accent-lime) animate-pulse" />
                            {inflightCount} running
                        </>
                    ) : (
                        <>
                            <span className="size-1.5 rounded-full bg-(--fg-3)" />
                            idle
                        </>
                    )}
                </span>
            </header>

            <div className="p-4 sm:p-6 space-y-6">
                {/* Top summary row */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-baseline gap-2">
                        <Database className="size-4 text-(--accent-lime) translate-y-0.5" />
                        <span className="text-2xl font-semibold tabular-nums text-(--fg)">
                            {compactNumber(totalEvents)}
                        </span>
                        <span className="text-xs uppercase font-mono tracking-wider text-(--fg-3)">
                            raw events ingested
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* {hasFailedJobs ? (
                            <button
                                type="button"
                                onClick={handleRetryFailed}
                                disabled={retryMutation.isPending}
                                title="Re-queue every FAILED ingestion job for this project."
                                className={cn(
                                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium",
                                    "border border-(--danger)/40 bg-(--bg-2) text-(--danger)",
                                    "transition-colors hover:border-(--danger) hover:bg-(--danger)/10",
                                    "disabled:opacity-50",
                                )}
                            >
                                <RotateCcw className={cn("size-3", retryMutation.isPending && "animate-spin")} />
                                Retry failed
                            </button>
                        ) : null} */}
                        <button
                            type="button"
                            onClick={handleReprocess}
                            disabled={reprocessMutation.isPending}
                            title="Re-run the LLM pipeline (summary, embedding, ProjectContext) on RawEvents that haven't been processed yet."
                            className={cn(
                                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium",
                                "border border-(--line) bg-(--bg-2) text-(--fg-2)",
                                "transition-colors hover:border-(--accent-lime) hover:text-(--accent-lime)",
                                "disabled:opacity-50",
                            )}
                        >
                            <Sparkles className={cn("size-3", reprocessMutation.isPending && "animate-spin")} />
                            Reprocess events
                        </button>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className={cn(
                                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium",
                                "border border-(--line) bg-(--bg-2) text-(--fg-2)",
                                "transition-colors hover:border-(--accent-lime) hover:text-(--accent-lime)",
                                "disabled:opacity-50",
                            )}
                        >
                            <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={openResetModal}
                            title="Wipe all ingested data for this project. Integrations stay linked but every RawEvent / IngestionJob / derived row is cleared."
                            className={cn(
                                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium",
                                "border border-(--danger)/40 bg-(--bg-2) text-(--danger)",
                                "transition-colors hover:border-(--danger) hover:bg-(--danger)/10",
                            )}
                        >
                            <Trash2 className="size-3" />
                            Reset
                        </button>
                    </div>
                </div>

                {/* Currently-running jobs */}
                {inflightCount > 0 ? (
                    <div className="space-y-2">
                        <h3 className="text-[11px] uppercase font-mono tracking-wider text-(--accent-lime) flex items-center gap-1.5">
                            <Activity className="size-3" />
                            In progress
                        </h3>
                        <ul className="space-y-1.5">
                            {data!.runningJobs.map((job) => (
                                <RunningJobRow key={job.id} job={job} />
                            ))}
                        </ul>
                    </div>
                ) : null}

                {/* Per-source counts */}
                {bySource.length > 0 ? (
                    <div className="space-y-2">
                        <h3 className="text-[11px] uppercase font-mono tracking-wider text-(--fg-3)">
                            By source
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {bySource.map((src) => (
                                <SourceSummaryCard key={src.source} src={src} />
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Per-resource last-sync */}
                {data && data.lastSyncByResource.length > 0 ? (
                    <div className="space-y-2">
                        <h3 className="text-[11px] uppercase font-mono tracking-wider text-(--fg-3)">
                            Resources
                        </h3>
                        <div className="rounded-[10px] border border-(--line-2) divide-y divide-(--line-2) overflow-hidden">
                            {data.lastSyncByResource.slice(0, 8).map((row, i) => (
                                <ResourceRow key={`${row.source}:${row.resourceId}:${i}`} row={row} />
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Recent jobs (collapsed log) */}
                {data && data.recentJobs.length > 0 ? (
                    <details className="group">
                        <summary className="cursor-pointer text-[11px] uppercase font-mono tracking-wider text-(--fg-3) hover:text-(--fg-2) flex items-center gap-1.5">
                            Recent jobs
                            <span className="text-(--fg-3) normal-case font-sans tracking-normal">
                                ({data.recentJobs.length})
                            </span>
                        </summary>
                        <ul className="mt-2 space-y-1">
                            {data.recentJobs.map((job) => (
                                <RecentJobRow key={job.id} job={job} />
                            ))}
                        </ul>
                    </details>
                ) : null}

                {isLoading && !data ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="size-5 animate-spin text-(--fg-3)" />
                    </div>
                ) : null}

                {!isLoading && data && totalEvents === 0 && inflightCount === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                        <Database className="size-6 text-(--fg-3)" />
                        <p className="text-sm text-(--fg-2)">No events ingested yet</p>
                        <p className="text-xs text-(--fg-3) max-w-sm">
                            Once you connect an integration and pick channels / repos / boards,
                            backfill jobs land here in real time.
                        </p>
                    </div>
                ) : null}
            </div>

            <CustomModal open={resetModalOpen} onOpenChange={setResetModalOpen}>
                <CustomModalHeader>
                    <CustomModalTitle className="text-(--danger) flex items-center gap-2">
                        <AlertTriangle className="size-4" />
                        Reset {projectName || "project"}?
                    </CustomModalTitle>
                    <CustomModalDescription>
                        Wipes every RawEvent, IngestionJob, derived task, and contribution
                        row tied to this project. Integration links and OAuth tokens are
                        kept so you can re-trigger backfills afterwards. There is no undo.
                    </CustomModalDescription>
                </CustomModalHeader>
                <CustomModalBody className="space-y-3">
                    <div className="rounded-md border border-(--danger)/30 bg-(--danger)/5 p-3 text-xs text-(--fg-2)">
                        Currently {totalEvents.toLocaleString()} RawEvent
                        {totalEvents === 1 ? "" : "s"} and {data?.runningJobs.length ?? 0} inflight
                        job{data?.runningJobs.length === 1 ? "" : "s"} will be cleared.
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="reset-confirm-name" className="text-xs">
                            Type <span className="font-mono font-semibold">{projectName}</span> to confirm
                        </Label>
                        <Input
                            id="reset-confirm-name"
                            value={resetConfirmText}
                            onChange={(e) => setResetConfirmText(e.target.value)}
                            autoComplete="off"
                            placeholder={projectName}
                            disabled={!projectName || resetMutation.isPending}
                        />
                    </div>
                </CustomModalBody>
                <CustomModalFooter>
                    <Button
                        variant="outline"
                        onClick={() => setResetModalOpen(false)}
                        disabled={resetMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleReset}
                        disabled={!resetNamesMatch || resetMutation.isPending}
                    >
                        {resetMutation.isPending ? (
                            <>
                                <Loader2 className="size-4 mr-1.5 animate-spin" />
                                Resetting…
                            </>
                        ) : (
                            "Reset project"
                        )}
                    </Button>
                </CustomModalFooter>
            </CustomModal>
        </section>
    );
}

function RunningJobRow({ job }: { job: IngestionStatus["runningJobs"][number] }) {
    const Icon = job.provider ? PROVIDER_ICON[job.provider] ?? Activity : Activity;
    const provider = job.provider ? PROVIDER_LABEL[job.provider] ?? job.provider : "Pending";
    const progress = job.progress;
    const pct = progress?.current && progress?.total
        ? Math.min(100, Math.round((progress.current / progress.total) * 100))
        : null;
    return (
        <li className="flex items-center gap-3 rounded-[10px] border border-(--line-2) bg-(--bg-3) px-3 py-2">
            <Icon className="size-4 text-(--accent-lime) shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-medium text-(--fg) truncate">
                        {provider} · {job.resourceName ?? "—"}
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-(--fg-3)">
                        {job.type.toLowerCase().replace(/_/g, " ")}
                    </span>
                </div>
                {progress?.message ? (
                    <p className="text-xs text-(--fg-3) truncate">{progress.message}</p>
                ) : null}
                {pct !== null ? (
                    <div className="mt-1 h-1 rounded-full bg-(--bg-2) overflow-hidden">
                        <div
                            className="h-full bg-(--accent-lime) transition-all"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                ) : null}
            </div>
            <span className="text-[10px] font-mono text-(--fg-3) shrink-0">
                {job.startedAt ? formatRelative(job.startedAt) : "queued"}
            </span>
        </li>
    );
}

function SourceSummaryCard({
    src,
}: {
    src: { source: string; total: number; byType: Record<string, number>; lastEventAt: string | null };
}) {
    const Icon = PROVIDER_ICON[src.source] ?? Database;
    const label = PROVIDER_LABEL[src.source] ?? src.source;
    const breakdown = Object.entries(src.byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type, n]) => `${compactNumber(n)} ${EVENT_TYPE_LABEL[type] ?? type.toLowerCase()}`)
        .join(" · ");
    return (
        <div className="rounded-[10px] border border-(--line-2) bg-(--bg-3) p-3">
            <div className="flex items-center gap-2 mb-1.5">
                <Icon className="size-4 text-(--fg-2)" />
                <span className="text-sm font-medium text-(--fg)">{label}</span>
                <span className="ml-auto text-sm font-semibold tabular-nums text-(--accent-lime)">
                    {compactNumber(src.total)}
                </span>
            </div>
            <p className="text-[11px] font-mono text-(--fg-3) truncate">{breakdown || "—"}</p>
            <p className="text-[10px] text-(--fg-3) mt-1">
                Last event {formatRelative(src.lastEventAt)}
            </p>
        </div>
    );
}

function ResourceRow({ row }: { row: IngestionStatus["lastSyncByResource"][number] }) {
    const Icon = PROVIDER_ICON[row.source] ?? Database;
    const provider = PROVIDER_LABEL[row.source] ?? row.source;
    const name = row.resourceName ?? row.resourceProviderId ?? "—";
    return (
        <div className="flex items-center gap-3 px-3 py-2">
            <Icon className="size-3.5 text-(--fg-3) shrink-0" />
            <span className="text-xs font-mono text-(--fg-3) shrink-0">{provider}</span>
            <span className="text-sm text-(--fg) truncate flex-1 min-w-0">{name}</span>
            <span className="text-xs tabular-nums text-(--fg-2) shrink-0">
                {compactNumber(row.eventCount)}
            </span>
            <span className="text-[10px] text-(--fg-3) shrink-0 flex items-center gap-1">
                <Clock className="size-3" />
                {formatRelative(row.lastEventAt)}
            </span>
        </div>
    );
}

function RecentJobRow({ job }: { job: IngestionStatus["recentJobs"][number] }) {
    const Icon = job.provider ? PROVIDER_ICON[job.provider] ?? Database : Database;
    const provider = job.provider ? PROVIDER_LABEL[job.provider] ?? job.provider : "—";
    const isFail = job.status === "FAILED";
    const StatusIcon = isFail ? AlertCircle : CheckCircle2;
    return (
        <li className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-(--bg-3) text-xs">
            <StatusIcon className={cn("size-3.5 shrink-0", isFail ? "text-(--danger)" : "text-(--accent-2)")} />
            <Icon className="size-3 text-(--fg-3) shrink-0" />
            <span className="font-mono text-(--fg-3) shrink-0">{provider}</span>
            <span className="text-(--fg-2) truncate flex-1 min-w-0" title={job.error ?? undefined}>
                {job.resourceName ?? "—"}
                {isFail && job.error ? <span className="text-(--danger) ml-1.5">· {job.error}</span> : null}
            </span>
            <span className="text-(--fg-3) shrink-0">
                {formatRelative(job.finishedAt ?? job.createdAt)}
            </span>
        </li>
    );
}
