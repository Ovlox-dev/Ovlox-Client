"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, RefreshCw, Loader2, CheckCircle2, AlertCircle, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
    useReprocessEvents,
    useResetProject,
    useRetryFailedBackfill,
    useSyncProjectMembers,
} from "@/entities/project";

export function ProjectRecoverySettingsPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();

    const retryMutation = useRetryFailedBackfill(organizationId, projectId);
    const reprocessMutation = useReprocessEvents(organizationId, projectId);
    const resetMutation = useResetProject(organizationId, projectId);
    const syncMembersMutation = useSyncProjectMembers(organizationId, projectId);

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                    <Wrench className="size-6" /> Recovery actions
                </h1>
                <p className="text-muted-foreground text-sm">
                    Targeted recovery — none of these wipe your data. Use them when chat answers degrade
                    or when an integration stops producing context.
                </p>
            </header>

            <Card className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                    <RefreshCw className="size-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold">Retry failed backfills</h3>
                        <p className="text-sm text-muted-foreground">
                            Re-enqueue any FAILED IngestionJob rows. Successful resources are untouched.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button
                        onClick={() =>
                            retryMutation.mutate(undefined, {
                                onSuccess: (data) =>
                                    toast.success(`${data.retried} job(s) re-queued`),
                                onError: (err) =>
                                    toast.error("Retry failed", {
                                        description: err instanceof Error ? err.message : String(err),
                                    }),
                            })
                        }
                        disabled={retryMutation.isPending}
                    >
                        {retryMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Retry failed backfills
                    </Button>
                </div>
                {retryMutation.data && (
                    <Result
                        success={retryMutation.data.retried > 0}
                        text={
                            retryMutation.data.retried > 0
                                ? `${retryMutation.data.retried} backfill job(s) re-queued.`
                                : "No failed backfill jobs found."
                        }
                    />
                )}
            </Card>

            <Card className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                    <RefreshCw className="size-5 text-purple-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold">Reprocess events through LLM</h3>
                        <p className="text-sm text-muted-foreground">
                            Re-runs summary + embedding + project-context extraction on RawEvents that haven't been
                            processed yet. Useful after an OpenAI outage or a code update that changed the pipeline.
                            Also heals stale branch flags on commits ingested before the branch-tracking fix.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={() =>
                            reprocessMutation.mutate(
                                { force: true, limit: 1000 },
                                {
                                    onSuccess: (data) =>
                                        toast.success(`Queued ${data.queued} of ${data.scheduled} events`),
                                    onError: () => toast.error("Failed to queue reprocessing."),
                                },
                            )
                        }
                        disabled={reprocessMutation.isPending}
                    >
                        Reprocess ALL (force)
                    </Button>
                    <Button
                        onClick={() =>
                            reprocessMutation.mutate(
                                { force: false, limit: 1000 },
                                {
                                    onSuccess: (data) =>
                                        toast.success(`Queued ${data.queued} unprocessed events`),
                                    onError: () => toast.error("Failed to queue reprocessing."),
                                },
                            )
                        }
                        disabled={reprocessMutation.isPending}
                    >
                        {reprocessMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Reprocess unprocessed
                    </Button>
                </div>
                {reprocessMutation.data && (
                    <Result
                        success={reprocessMutation.data.queued > 0}
                        text={`Scheduled ${reprocessMutation.data.scheduled}, queued ${reprocessMutation.data.queued} on the LLM queue.`}
                    />
                )}
            </Card>

            <Card className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                    <Users className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold">Sync project members</h3>
                        <p className="text-sm text-muted-foreground">
                            Re-imports the org membership into this project. Useful if a member was added to the org
                            but doesn&apos;t see this project, or if roles drifted out of sync.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button
                        onClick={() =>
                            syncMembersMutation.mutate(undefined, {
                                onSuccess: (data) =>
                                    toast.success(
                                        data.message ??
                                            `Synced — added ${data.added ?? 0}, updated ${data.updated ?? 0}, removed ${data.removed ?? 0}`,
                                    ),
                                onError: (err) =>
                                    toast.error("Sync failed", {
                                        description: err instanceof Error ? err.message : String(err),
                                    }),
                            })
                        }
                        disabled={syncMembersMutation.isPending}
                    >
                        {syncMembersMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Sync members
                    </Button>
                </div>
                {syncMembersMutation.data && (
                    <Result
                        success
                        text={
                            syncMembersMutation.data.message ??
                            `Added ${syncMembersMutation.data.added ?? 0}, updated ${syncMembersMutation.data.updated ?? 0}, removed ${syncMembersMutation.data.removed ?? 0}.`
                        }
                    />
                )}
            </Card>

            <Card className="p-5 space-y-3 border-destructive/40">
                <div className="flex items-start gap-3">
                    <Trash2 className="size-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-destructive">Reset project (destructive)</h3>
                        <p className="text-sm text-muted-foreground">
                            Wipes all ingested raw events, LLM outputs, embeddings, and project context for this project.
                            Integrations stay connected. The next backfill will rebuild context from scratch. This cannot be undone.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button
                        variant="destructive"
                        onClick={() => {
                            const confirmed = typeof window !== "undefined"
                                ? window.confirm("Wipe all ingested data for this project? This cannot be undone.")
                                : false;
                            if (!confirmed) { return; }
                            resetMutation.mutate(undefined, {
                                onSuccess: (data) =>
                                    toast.success(data.message ?? "Project data reset."),
                                onError: (err) =>
                                    toast.error("Reset failed", {
                                        description: err instanceof Error ? err.message : String(err),
                                    }),
                            });
                        }}
                        disabled={resetMutation.isPending}
                    >
                        {resetMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Reset project data
                    </Button>
                </div>
                {resetMutation.data && (
                    <Result
                        success
                        text={resetMutation.data.message ?? "Project data wiped. Re-backfill to rebuild context."}
                    />
                )}
            </Card>
        </div>
    );
}

function Result({ success, text }: { success: boolean; text: string }) {
    const Icon = success ? CheckCircle2 : AlertCircle;
    return (
        <div className={`text-sm flex items-start gap-2 p-3 rounded-md border ${success ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
            <Icon className="size-4 mt-0.5 shrink-0" />
            <span>{text}</span>
        </div>
    );
}
