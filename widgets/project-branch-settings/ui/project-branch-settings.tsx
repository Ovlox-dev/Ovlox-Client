"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { GitBranch, Plus, X, Save, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useGetProject, useUpdateBranchConfig } from "@/entities/project";
import { useApiError } from "@/hooks/useApiError";

export function ProjectBranchSettingsPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const { data: project, isPending, error } = useGetProject(organizationId, projectId);
    useApiError(error);

    const repositories = (project as { repositories?: Array<{ id: string; name: string; defaultBranch: string | null; trackedBranches?: string[] | null; ignoredBranches?: string[] | null }> } | undefined)?.repositories ?? [];

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                    <GitBranch className="size-6" /> Branch tracking
                </h1>
                <p className="text-muted-foreground text-sm">
                    Configure which branches contribute to project context. All commits are still stored —
                    this only flips visibility in chat and the timeline.
                </p>
            </header>

            {isPending ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            ) : repositories.length === 0 ? (
                <Card className="p-12 flex flex-col items-center gap-3">
                    <GitBranch className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        No GitHub repositories linked to this project yet.
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {repositories.map((repo) => (
                        <RepoBranchEditor
                            key={repo.id}
                            organizationId={organizationId}
                            projectId={projectId}
                            repository={repo}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function RepoBranchEditor({
    organizationId,
    projectId,
    repository,
}: {
    organizationId: string;
    projectId: string;
    repository: { id: string; name: string; defaultBranch: string | null; trackedBranches?: string[] | null; ignoredBranches?: string[] | null };
}) {
    const [tracked, setTracked] = React.useState<string[]>(
        repository.trackedBranches ?? [repository.defaultBranch || "main"],
    );
    const [ignored, setIgnored] = React.useState<string[]>(
        repository.ignoredBranches ?? ["dependabot/*", "renovate/*"],
    );
    const [trackedDraft, setTrackedDraft] = React.useState("");
    const [ignoredDraft, setIgnoredDraft] = React.useState("");

    const updateMutation = useUpdateBranchConfig(organizationId, projectId, repository.id);

    const handleSave = () => {
        updateMutation.mutate(
            { trackedBranches: tracked, ignoredBranches: ignored },
            {
                onSuccess: () => toast.success(`Updated branch config for ${repository.name}`),
                onError: (err) =>
                    toast.error("Failed to save", {
                        description: err instanceof Error ? err.message : String(err),
                    }),
            },
        );
    };

    return (
        <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="font-semibold">{repository.name}</h3>
                {repository.defaultBranch && (
                    <Badge variant="outline" className="text-xs">
                        default: {repository.defaultBranch}
                    </Badge>
                )}
            </div>

            <div className="space-y-2">
                <Label>Tracked branches (counted as project signal)</Label>
                <div className="flex flex-wrap gap-2">
                    {tracked.map((b) => (
                        <Badge key={b} variant="outline" className="gap-1.5 bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                            {b}
                            <button
                                type="button"
                                onClick={() => setTracked(tracked.filter((x) => x !== b))}
                                className="hover:opacity-80"
                                aria-label={`Remove ${b}`}
                            >
                                <X className="size-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Input
                        value={trackedDraft}
                        onChange={(e) => setTrackedDraft(e.target.value)}
                        placeholder="e.g. main, release/*"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && trackedDraft.trim()) {
                                e.preventDefault();
                                if (!tracked.includes(trackedDraft.trim())) setTracked([...tracked, trackedDraft.trim()]);
                                setTrackedDraft("");
                            }
                        }}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (trackedDraft.trim() && !tracked.includes(trackedDraft.trim())) {
                                setTracked([...tracked, trackedDraft.trim()]);
                                setTrackedDraft("");
                            }
                        }}
                    >
                        <Plus className="size-4" />
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Ignored branches (excluded even if tracked)</Label>
                <div className="flex flex-wrap gap-2">
                    {ignored.map((b) => (
                        <Badge key={b} variant="outline" className="gap-1.5 bg-muted">
                            {b}
                            <button
                                type="button"
                                onClick={() => setIgnored(ignored.filter((x) => x !== b))}
                                className="hover:opacity-80"
                                aria-label={`Remove ${b}`}
                            >
                                <X className="size-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Input
                        value={ignoredDraft}
                        onChange={(e) => setIgnoredDraft(e.target.value)}
                        placeholder="e.g. dependabot/*"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && ignoredDraft.trim()) {
                                e.preventDefault();
                                if (!ignored.includes(ignoredDraft.trim())) setIgnored([...ignored, ignoredDraft.trim()]);
                                setIgnoredDraft("");
                            }
                        }}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (ignoredDraft.trim() && !ignored.includes(ignoredDraft.trim())) {
                                setIgnored([...ignored, ignoredDraft.trim()]);
                                setIgnoredDraft("");
                            }
                        }}
                    >
                        <Plus className="size-4" />
                    </Button>
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin mr-2" />
                    ) : (
                        <Save className="size-4 mr-2" />
                    )}
                    Save changes
                </Button>
            </div>
        </Card>
    );
}
