import * as React from "react";
import { Check, ChevronRight } from "lucide-react";

import { appIconMap } from "@/lib/app.icons";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import {
    useGetAvailableIntegrations,
    useGetProject,
    useLinkIntegration,
} from "@/shared/queries/projects.queries";
import { ExternalProvider } from "@/types/enum";
import type { GetAvailableIntegrationsResponse } from "@/types/api-types";

type SelectedByIntegrationId = Record<string, Set<string>>;

function providerLabel(p: ExternalProvider) {
    return p.charAt(0) + p.slice(1).toLowerCase();
}

type NormalizedIntegration = {
    id: string;
    type: ExternalProvider;
    resources: Array<{ id: string; name: string; type: string }>;
};

function normalizeAvailableIntegrations(
    payload: unknown
): NormalizedIntegration[] {
    if (!payload) { return []; }

    if (
        typeof payload === "object" &&
        payload !== null &&
        "integrations" in payload &&
        Array.isArray((payload as { integrations?: unknown }).integrations)
    ) {
        const typed = payload as GetAvailableIntegrationsResponse;
        return typed.integrations.map((i) => ({
            id: i.id,
            type: i.type,
            resources: i.resources.map((r) => ({
                id: r.id,
                name: r.name,
                type: r.type,
            })),
        }));
    }

    // New shape: flat list of integration resources
    if (Array.isArray(payload)) {
        const byIntegrationId = new Map<string, NormalizedIntegration>();
        for (const raw of payload as Array<unknown>) {
            if (typeof raw !== "object" || raw === null) { continue; }
            const r = raw as Record<string, unknown>;

            const integration =
                typeof r.integration === "object" && r.integration !== null
                    ? (r.integration as Record<string, unknown>)
                    : null;

            const integrationId =
                (typeof integration?.id === "string" ? integration.id : undefined) ??
                (typeof r.integrationId === "string" ? r.integrationId : undefined);

            const type =
                (typeof integration?.type === "string"
                    ? (integration.type as ExternalProvider)
                    : undefined) ??
                (typeof r.provider === "string"
                    ? (r.provider as ExternalProvider)
                    : undefined);

            if (!integrationId || !type) { continue; }

            const existing = byIntegrationId.get(integrationId);
            if (existing) {
                existing.resources.push({
                    id: String(r.id),
                    name: String(r.name),
                    type: String(r.provider ?? "resource"),
                });
            } else {
                byIntegrationId.set(integrationId, {
                    id: integrationId,
                    type,
                    resources: [
                        {
                            id: String(r.id),
                            name: String(r.name),
                            type: String(r.provider ?? "resource"),
                        },
                    ],
                });
            }
        }

        return Array.from(byIntegrationId.values());
    }

    return [];
}

export default function LinkIntegrationsStep({
    organizationId,
    projectId,
    onNext,
}: {
    organizationId: string;
    projectId: string;
    onNext: () => void;
}) {
    const {
        data: availableIntegrations,
        isLoading: integrationsLoading,
        error: integrationsError,
    } = useGetAvailableIntegrations(organizationId, projectId);

    const { data: project } = useGetProject(organizationId, projectId);
    const linkIntegration = useLinkIntegration(organizationId, projectId);

    const linkedProviderTypes = React.useMemo(() => {
        const connections = project?.integrations ?? [];
        return new Set(
            connections
                .map((c) => c.integration?.type)
                .filter(Boolean) as ExternalProvider[]
        );
    }, [project?.integrations]);

    const [selected, setSelected] = React.useState<SelectedByIntegrationId>({});

    const toggleResource = React.useCallback(
        (integrationId: string, resourceId: string) => {
            setSelected((prev) => {
                const next: SelectedByIntegrationId = { ...prev };
                const current = new Set(next[integrationId] ?? []);
                if (current.has(resourceId)) {
                    current.delete(resourceId);
                } else {
                    current.add(resourceId);
                }
                next[integrationId] = current;
                return next;
            });
        },
        []
    );

    const setAllResources = React.useCallback(
        (integrationId: string, resourceIds: string[]) => {
            setSelected((prev) => ({
                ...prev,
                [integrationId]: new Set(resourceIds),
            }));
        },
        []
    );

    const clearResources = React.useCallback((integrationId: string) => {
        setSelected((prev) => ({
            ...prev,
            [integrationId]: new Set(),
        }));
    }, []);

    const handleLink = React.useCallback(
        (integrationId: string) => {
            const ids = Array.from(selected[integrationId] ?? []);
            linkIntegration.mutate({
                integrationId,
                resourceIds: ids,
            });
        },
        [linkIntegration, selected]
    );

    const normalizedIntegrations = React.useMemo(
        () => normalizeAvailableIntegrations(availableIntegrations),
        [availableIntegrations]
    );

    if (integrationsLoading) {
        return (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-5">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="size-10 rounded-lg" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                            </div>
                            <Skeleton className="h-9 w-24" />
                        </div>
                        <div className="mt-4 space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    </Card>
                ))}
            </div>
        )
    }
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Connect apps</h2>
                    <p className="text-sm text-muted-foreground">
                        Select which resources you want to import for this project.
                    </p>
                </div>
                <Button
                    type="button"
                    onClick={onNext}
                    className="gap-2 self-start sm:self-auto"
                >
                    Continue
                    <ChevronRight className="size-4" />
                </Button>
            </div>

            {/* {!hasParams ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="size-10 rounded-lg" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-3 w-40" />
                                    </div>
                                </div>
                                <Skeleton className="h-9 w-24" />
                            </div>
                            <div className="mt-4 space-y-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : null} */}

            {integrationsError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    Couldn’t load available integrations.
                </div>
            )}


            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {normalizedIntegrations.length === 0 ? (
                    <div className="lg:col-span-2 rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                        No available integrations were returned for this project.
                    </div>
                ) : null}

                {normalizedIntegrations.map((integration) => {
                    const Icon = appIconMap[integration.type] ?? null;
                    const isLinked = linkedProviderTypes.has(integration.type);
                    const resourceIds = integration.resources.map((r) => r.id);
                    const selectedIds = selected[integration.id] ?? new Set<string>();
                    const selectedCount = selectedIds.size;

                    return (
                        <Card key={integration.id} className="p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
                                        {Icon ? (
                                            <Icon className="size-5" />
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                App
                                            </span>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold">
                                                {providerLabel(integration.type)}
                                            </p>
                                            <Badge variant="outline" className="text-xs">
                                                {integration.type}
                                            </Badge>
                                            {isLinked && (
                                                <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                                                    <Check className="size-3.5" />
                                                    Linked
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Choose resources to link to this project.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <Button
                                        type="button"
                                        onClick={() => handleLink(integration.id)}
                                        disabled={
                                            isLinked ||
                                            selectedCount === 0 ||
                                            linkIntegration.isPending
                                        }
                                    >
                                        {isLinked ? "Linked" : "Link"}
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedCount} selected
                                    </p>
                                </div>
                            </div>

                            <Separator className="my-4" />

                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Resources</p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            setAllResources(integration.id, resourceIds)
                                        }
                                        disabled={resourceIds.length === 0}
                                    >
                                        Select all
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => clearResources(integration.id)}
                                        disabled={selectedCount === 0}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-3 space-y-2">
                                {integration.resources.length === 0 ? (
                                    <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                                        No resources available for this integration yet.
                                    </div>
                                ) : (
                                    integration.resources.map((r) => {
                                        const isSelected = selectedIds.has(r.id);
                                        return (
                                            <button
                                                key={r.id}
                                                type="button"
                                                onClick={() =>
                                                    toggleResource(integration.id, r.id)
                                                }
                                                className={cn(
                                                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                                                    isSelected
                                                        ? "border-primary/40 bg-primary/5"
                                                        : "hover:bg-muted/40"
                                                )}
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">
                                                        {r.name}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {r.type}
                                                    </p>
                                                </div>

                                                <div
                                                    className={cn(
                                                        "flex size-7 items-center justify-center rounded-full border",
                                                        isSelected
                                                            ? "border-primary bg-primary text-primary-foreground"
                                                            : "border-border text-muted-foreground"
                                                    )}
                                                    aria-hidden
                                                >
                                                    {isSelected ? (
                                                        <Check className="size-4" />
                                                    ) : null}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}