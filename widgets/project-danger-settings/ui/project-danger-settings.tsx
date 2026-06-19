"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetProject, useDeleteProject } from "@/entities/project";

export function ProjectDangerSettings() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const router = useRouter();
    const { data: project } = useGetProject(organizationId, projectId);
    const { mutate: deleteProject, isPending } = useDeleteProject(organizationId);
    const [confirmText, setConfirmText] = React.useState("");

    const projectName = project?.name ?? "";
    const canDelete = projectName !== "" && confirmText.trim() === projectName;

    const handleDelete = () => {
        if (!project) { return; }
        deleteProject(project.id, {
            onSuccess: () => {
                toast.success(`Deleted "${projectName}"`);
                router.push(`/${organizationId}/projects`);
            },
            onError: () => {
                toast.error("Failed to delete project. Please try again.");
            },
        });
    };

    return (
        <Card className="p-6 space-y-5 border-destructive/40">
            <div>
                <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Deleting a project permanently removes its ingested data, timeline, reports, and
                    settings. This cannot be undone.
                </p>
            </div>

            <div className="space-y-2 max-w-xl">
                <Label htmlFor="confirm-name">
                    Type{" "}
                    <span className="font-mono font-semibold text-text">
                        {projectName || "the project name"}
                    </span>{" "}
                    to confirm
                </Label>
                <Input
                    id="confirm-name"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={projectName}
                    autoComplete="off"
                />
                <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={!canDelete || isPending}
                >
                    {isPending ? (
                        <>
                            <Loader2 className="size-4 mr-1.5 animate-spin" />
                            Deleting…
                        </>
                    ) : (
                        <>
                            <Trash2 className="size-4 mr-1.5" />
                            Delete this project
                        </>
                    )}
                </Button>
            </div>
        </Card>
    );
}
