import * as React from "react";
import { Check, ChevronRight } from "lucide-react";

import { appIconMap } from "@/lib/app.icons";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface LinkIntegrationPropTypes {
    organizationId: string;
    projectId: string;
    onNext: () => void;
}

import {
    useGetAvailableResources,
    useGetProject,
    useLinkIntegration,
} from "@/shared/queries/projects.queries";
import { ExternalProvider, IntegrationStatus } from "@/types/enum";
import type { GetAvailableResourcesResponse } from "@/types/api-types";

type SelectedByIntegrationId = Record<string, string | null>;

function useProjectResourceLinkLookup(projectResources: { id: string; integrationId: string; provider: ExternalProvider; providerId: string }[] | undefined) {
    return React.useMemo(() => {
        const byId = new Set<string>();
        const byIntegrationAndProviderId = new Set<string>();
        for (const pr of projectResources ?? []) {
            byId.add(pr.id);
            byIntegrationAndProviderId.add(`${pr.integrationId}:${pr.providerId}`);
        }
        return { byId, byIntegrationAndProviderId };
    }, [projectResources]);
}

function isAvailableResourceLinkedToProject(
    r: Pick<GetAvailableResourcesResponse, "id" | "integrationId" | "providerId">,
    lookup: ReturnType<typeof useProjectResourceLinkLookup>
) {
    return (
        lookup.byId.has(r.id) ||
        lookup.byIntegrationAndProviderId.has(`${r.integrationId}:${r.providerId}`)
    );
}

/** First project-linked resource for this integration (replace flow assumes one per connection). */
function getLinkedResourceIdForIntegration(
    integrationId: string,
    projectResources: { id: string; integrationId: string }[] | undefined
): string | null {
    const row = projectResources?.find((pr) => pr.integrationId === integrationId);
    return row?.id ?? null;
}

export default function LinkIntegrationsStep({ organizationId, projectId, onNext, }: LinkIntegrationPropTypes) {
    const [selected, setSelected] = React.useState<SelectedByIntegrationId>({});
    const { data: availableResources, isLoading: integrationsLoading, error: integrationsError, } = useGetAvailableResources(organizationId, projectId);
    const { data: project } = useGetProject(organizationId, projectId);
    const linkIntegration = useLinkIntegration(organizationId, projectId);

    const projectResourceLookup = useProjectResourceLinkLookup(project?.resources);

    const groupedResources = React.useMemo(() => {
        const resources = availableResources?.data ?? [];
        const byIntegration = new Map<
            string,
            {
                integrationId: string;
                provider: ExternalProvider;
                integration: (typeof resources)[number]["integration"];
                resources: typeof resources;
            }
        >();

        for (const r of resources) {
            const existing = byIntegration.get(r.integrationId);
            if (existing) {
                existing.resources.push(r);
            } else {
                byIntegration.set(r.integrationId, {
                    integrationId: r.integrationId,
                    provider: r.provider,
                    integration: r.integration,
                    resources: [r],
                });
            }
        }

        return Array.from(byIntegration.values());
    }, [availableResources?.data]);

    // Seed selection from project-linked resources when an integration has no local choice yet.
    React.useEffect(() => {
        if (groupedResources.length === 0) {
            return;
        }
        setSelected((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const g of groupedResources) {
                const linkedId = getLinkedResourceIdForIntegration(
                    g.integrationId,
                    project?.resources
                );
                if (next[g.integrationId] === undefined && linkedId) {
                    next[g.integrationId] = linkedId;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [groupedResources, project?.resources]);

    const handleLink = React.useCallback(
        (integrationId: string) => {
            const resourceId = selected[integrationId];
            if (!resourceId) { return; }

            linkIntegration.mutate({
                integrationId,
                resourceIds: [resourceId],
            });
        },
        [linkIntegration, selected]
    );

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

            {integrationsError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    Couldn’t load available integrations.
                </div>
            )}

            {integrationsLoading ? (
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
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {availableResources?.data?.length === 0 ? (
                        <div className="lg:col-span-2 rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                            No available integrations were returned for this project.
                        </div>
                    ) : null}

                    {groupedResources.map((group) => {
                        const Icon = appIconMap[group.provider] ?? null;
                        const isConnected =
                            group.integration.status === IntegrationStatus.CONNECTED;
                        const linkedResourceId = getLinkedResourceIdForIntegration(
                            group.integrationId,
                            project?.resources
                        );

                        const selectedId = selected[group.integrationId] ?? null;
                        const selectionMatchesLinked =
                            linkedResourceId !== null &&
                            selectedId !== null &&
                            selectedId === linkedResourceId;
                        const isDirty =
                            Boolean(selectedId) &&
                            selectedId !== linkedResourceId;
                        const canLink =
                            isConnected &&
                            Boolean(selectedId) &&
                            isDirty &&
                            !linkIntegration.isPending;

                        const linkButtonLabel = !isConnected
                            ? "Connect first"
                            : selectionMatchesLinked
                                ? "Linked"
                                : linkedResourceId
                                    ? "Update link"
                                    : "Link";

                        return (
                            <Card key={group.integrationId} className="p-5">
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
                                                    {group.provider}
                                                </p>
                                                {/* {isConnected && (
                                                    <Badge className="gap-1 bg-green-500/10 text-green-500 hover:bg-green-500/10">
                                                        <CircleCheck className="size-3.5" />
                                                        Connected
                                                    </Badge>
                                                )} */}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {group.integration.externalAccount
                                                    ? `Account: ${group.integration.externalAccount}`
                                                    : "Choose resources to link to this project."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => handleLink(group.integrationId)}
                                            disabled={!canLink}
                                        >
                                            {linkButtonLabel}
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {!isConnected
                                        ? "Connect OAuth in Organization → Integrations, then return here to link a resource."
                                        : !selectedId
                                            ? "None selected"
                                            : selectionMatchesLinked
                                                ? "Linked to this project."
                                                : "Save your selection to update the project link."}
                                </p>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Resources</p>

                                </div>

                                <div className="mt-3 space-y-2">
                                    {group.resources.length === 0 ? (
                                        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                                            No resources available for this integration yet.
                                        </div>
                                    ) : (
                                        group.resources.map((r) => {
                                            const isSelected = selectedId === r.id;
                                            const isLinkedResource = isAvailableResourceLinkedToProject(
                                                r,
                                                projectResourceLookup
                                            );
                                            return (
                                                <button
                                                    key={r.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelected((prev) => ({
                                                            ...prev,
                                                            [group.integrationId]: r.id,
                                                        }));
                                                    }}
                                                    className={cn(
                                                        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                                                        isSelected
                                                            ? "border-primary/40 bg-primary/5"
                                                            : "hover:bg-muted/40"
                                                    )}
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="truncate text-sm font-medium">
                                                                {r.name}
                                                            </p>
                                                            {isLinkedResource ? (
                                                                <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10">
                                                                    Already linked
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {r.url}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
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
            )}
        </div>
    );
}