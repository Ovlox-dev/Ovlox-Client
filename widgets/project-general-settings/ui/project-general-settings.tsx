"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGetProject, useUpdateProject } from "@/entities/project";

export function ProjectGeneralSettings() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const { data: project, isLoading } = useGetProject(organizationId, projectId);
    const updateMutation = useUpdateProject(organizationId, projectId);

    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    React.useEffect(() => {
        if (project) {
            setName(project.name ?? "");
            setDescription(project.description ?? "");
        }
    }, [project]);

    const dirty =
        !!project &&
        name.trim() !== "" &&
        (name !== project.name || (description ?? "") !== (project.description ?? ""));

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dirty) { return; }
        try {
            await updateMutation.mutateAsync({
                name: name.trim(),
                description: description.trim() || undefined,
            });
            toast.success("Project updated");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Update failed";
            toast.error("Couldn't update project", { description: message });
        }
    };

    if (isLoading || !project) {
        return (
            <Card className="p-12 flex justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </Card>
        );
    }

    return (
        <Card className="p-6 space-y-5">
            <div>
                <h2 className="text-base font-semibold">General</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Basic identity for this project — visible across the app.
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                    <Label htmlFor="project-name">Project name</Label>
                    <Input
                        id="project-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My project"
                        maxLength={120}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="project-description">Description</Label>
                    <Textarea
                        id="project-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What this project is about…"
                        rows={4}
                        maxLength={2000}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label>Slug</Label>
                    <Input value={project.slug ?? ""} readOnly disabled className="font-mono" />
                    <p className="text-[11px] text-muted-foreground">Used in URLs. Read-only.</p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <Button type="submit" disabled={!dirty || updateMutation.isPending}>
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="size-4 mr-1.5 animate-spin" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <Save className="size-4 mr-1.5" />
                                Save changes
                            </>
                        )}
                    </Button>
                    {dirty ? (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setName(project.name ?? "");
                                setDescription(project.description ?? "");
                            }}
                        >
                            Discard
                        </Button>
                    ) : null}
                </div>
            </form>
        </Card>
    );
}
