"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

import { useGetProject, useListProjectMembers } from "@/shared/queries/projects.queries";
import { ExternalProvider } from "@/types/enum";

export default function ReviewStep({
    organizationId,
    projectId,
    onBack,
}: {
    organizationId: string;
    projectId: string;
    onBack: () => void;
}) {
    const router = useRouter();
    const { data: project, isLoading: projectLoading } = useGetProject(
        organizationId,
        projectId
    );
    const { data: projectMembers = [], isLoading: membersLoading } =
        useListProjectMembers(organizationId, projectId);

    const linkedProviders = React.useMemo(() => {
        const providers =
            project?.integrations
                ?.map((c) => c.integration?.type)
                .filter(Boolean) ?? [];
        return Array.from(new Set(providers)) as ExternalProvider[];
    }, [project?.integrations]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Review</h2>
                    <p className="text-sm text-muted-foreground">
                        Confirm everything looks right, then finish setup.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button type="button" variant="outline" onClick={onBack} className="gap-2">
                        <ArrowLeft className="size-4" />
                        Back
                    </Button>
                    <Button
                        type="button"
                        onClick={() =>
                            router.push(`/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}`)
                        }
                        className="gap-2"
                        disabled={!organizationId || !projectId}
                    >
                        <CheckCircle2 className="size-4" />
                        Finish
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="p-5 lg:col-span-2">
                    <p className="text-sm font-medium">Project</p>
                    {projectLoading ? (
                        <div className="mt-3 space-y-2">
                            <Skeleton className="h-5 w-56" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                        </div>
                    ) : (
                        <div className="mt-3 space-y-2">
                            <p className="text-lg font-semibold">{project?.name ?? "—"}</p>
                            <p className="text-sm text-muted-foreground">
                                {project?.description ?? "No description provided."}
                            </p>
                        </div>
                    )}
                </Card>

                <Card className="p-5">
                    <p className="text-sm font-medium">Members</p>
                    {membersLoading ? (
                        <div className="mt-3 space-y-2">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-7 w-40" />
                        </div>
                    ) : (
                        <div className="mt-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-2xl font-semibold">{projectMembers.length}</p>
                                <p className="text-sm text-muted-foreground">added</p>
                            </div>
                            <div className="flex -space-x-2">
                                {projectMembers.slice(0, 5).map((m) => (
                                    <Avatar key={m.id} className="size-8 border-2 border-card">
                                        <AvatarFallback className="text-xs">
                                            {String(m.userId).slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                                {projectMembers.length > 5 ? (
                                    <div className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium">
                                        +{projectMembers.length - 5}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="p-5 lg:col-span-3">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium">Integrations</p>
                            <p className="text-xs text-muted-foreground">
                                Linked providers for this project
                            </p>
                        </div>
                        <Badge variant="outline">{linkedProviders.length} linked</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {projectLoading ? (
                            <>
                                <Skeleton className="h-7 w-24" />
                                <Skeleton className="h-7 w-20" />
                                <Skeleton className="h-7 w-28" />
                            </>
                        ) : linkedProviders.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No integrations linked yet.
                            </p>
                        ) : (
                            linkedProviders.map((p) => (
                                <Badge key={p} className="bg-primary/10 text-primary hover:bg-primary/10">
                                    {p}
                                </Badge>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}