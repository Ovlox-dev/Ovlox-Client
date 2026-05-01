"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useGetProject } from "@/entities/project";
import { RoleBadge } from "@/shared/ui/role-badge";

interface ReviewStepProps {
    organizationId: string;
    projectId: string;
    onBack: () => void;
}

export default function ReviewStep({ organizationId, projectId, onBack }: ReviewStepProps) {
    const router = useRouter();
    const { data: project, isLoading: projectLoading } = useGetProject(organizationId, projectId);

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
                <Card className="p-5 lg:col-span-1">
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

                <Card className="p-5 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Team</p>
                            <p className="text-xs text-muted-foreground">
                                Members who have access to this project
                            </p>
                        </div>
                        <div className="">
                            <p className="text-2xl font-semibold text-right">{(project?.memberCount) ?? 0}</p>
                            <p className="text-sm text-muted-foreground">Members</p>
                        </div>
                    </div>
                    {projectLoading ? (
                        <div className="mt-3 space-y-2">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-7 w-40" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                            {project?.members?.map((member) => (
                                <div key={member.id} className=" border border-border rounded-md p-3">
                                    <p className="text-sm font-medium">{member.user?.firstName} {member.user?.lastName}</p>
                                    <RoleBadge role={member.predefinedRole} />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="p-5 lg:col-span-3">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium">Integrations</p>
                            <p className="text-xs text-muted-foreground">
                                Linked resources for this project
                            </p>
                        </div>
                        {projectLoading ? (
                            <Skeleton className="h-7 w-24" />
                        ) : (
                            <Badge variant="outline">{project?.resourceCount ?? 0} linked</Badge>
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {projectLoading ? (
                            <>
                                <Skeleton className="h-7 w-24" />
                                <Skeleton className="h-7 w-20" />
                            </>
                        ) : project?.resourceCount === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No integrations linked yet.
                            </p>
                        ) : (
                            project?.resources?.map((resource) => (
                                <div key={resource.id} className="flex items-center gap-2">
                                    <p className="text-sm font-medium">{resource.provider}</p>
                                    <Badge variant="outline">
                                        {resource.name}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}