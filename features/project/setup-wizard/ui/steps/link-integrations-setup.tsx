"use client"

import * as React from "react"
import { Check, ChevronRight } from "lucide-react"

import { appIconMap } from "@/lib/app.icons"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

import {
    useGetAvailableResources,
    useGetProject,
    useLinkIntegration,
} from "@/entities/project"
import {
    useGetChannels as useGetDiscordChannels,
    useGetDiscordUserGuilds,
    useSyncChannels as useSyncDiscordChannels,
} from "@/shared/queries/discord.queries"
import { ExternalProvider, IntegrationStatus } from "@/types/enum"
import type { GetAvailableResourcesResponse } from "@/types/api-types"

type SelectedByIntegrationId = Record<string, string | null>
type SelectedGuildByIntegrationId = Record<string, string | null>
type SelectedChannelsByIntegrationId = Record<string, Set<string>>

function useProjectResourceLinkLookup(projectResources: { id: string; integrationId: string; provider: ExternalProvider; providerId: string }[] | undefined) {
    return React.useMemo(() => {
        const byId = new Set<string>()
        const byIntegrationAndProviderId = new Set<string>()
        for (const pr of projectResources ?? []) {
            byId.add(pr.id)
            byIntegrationAndProviderId.add(`${pr.integrationId}:${pr.providerId}`)
        }
        return { byId, byIntegrationAndProviderId }
    }, [projectResources])
}

function isAvailableResourceLinkedToProject(
    r: Pick<GetAvailableResourcesResponse, "id" | "integrationId" | "providerId">,
    lookup: ReturnType<typeof useProjectResourceLinkLookup>
) {
    return (
        lookup.byId.has(r.id) ||
        lookup.byIntegrationAndProviderId.has(`${r.integrationId}:${r.providerId}`)
    )
}

function getLinkedResourceIdForIntegration(
    integrationId: string,
    projectResources: { id: string; integrationId: string }[] | undefined
): string | null {
    const row = projectResources?.find((pr) => pr.integrationId === integrationId)
    return row?.id ?? null
}

export function LinkIntegrationsStep({
    organizationId,
    projectId,
    onNext,
}: {
    organizationId: string
    projectId: string
    onNext: () => void
}) {
    const [selected, setSelected] = React.useState<SelectedByIntegrationId>({})
    const [selectedGuild, setSelectedGuild] = React.useState<SelectedGuildByIntegrationId>({})
    const [selectedChannels, setSelectedChannels] = React.useState<SelectedChannelsByIntegrationId>({})
    const {
        data: availableResources,
        isLoading: integrationsLoading,
        error: integrationsError,
        refetch: refetchAvailableResources,
    } = useGetAvailableResources(organizationId, projectId)
    const { data: project } = useGetProject(organizationId, projectId)
    const linkIntegration = useLinkIntegration(organizationId, projectId)
    const syncDiscordChannels = useSyncDiscordChannels()

    const projectResourceLookup = useProjectResourceLinkLookup(project?.resources)

    const groupedResources = React.useMemo(() => {
        const resources = availableResources?.data ?? []
        const byIntegration = new Map<
            string,
            {
                integrationId: string
                provider: ExternalProvider
                integration: (typeof resources)[number]["integration"]
                resources: typeof resources
            }
        >()

        for (const r of resources) {
            const existing = byIntegration.get(r.integrationId)
            if (existing) {
                existing.resources.push(r)
            } else {
                byIntegration.set(r.integrationId, {
                    integrationId: r.integrationId,
                    provider: r.provider,
                    integration: r.integration,
                    resources: [r],
                })
            }
        }

        return Array.from(byIntegration.values())
    }, [availableResources?.data])

    React.useEffect(() => {
        if (groupedResources.length === 0) {
            return
        }
        setSelected((prev) => {
            let changed = false
            const next = { ...prev }
            for (const g of groupedResources) {
                const linkedId = getLinkedResourceIdForIntegration(
                    g.integrationId,
                    project?.resources
                )
                if (next[g.integrationId] === undefined && linkedId) {
                    next[g.integrationId] = linkedId
                    changed = true
                }
            }
            return changed ? next : prev
        })
    }, [groupedResources, project?.resources])

    const handleLink = React.useCallback(
        (integrationId: string) => {
            const resourceId = selected[integrationId]
            if (!resourceId) { return }

            linkIntegration.mutate({
                integrationId,
                resourceIds: [resourceId],
            })
        },
        [linkIntegration, selected]
    )

    const toggleDiscordChannel = React.useCallback((integrationId: string, channelId: string) => {
        setSelectedChannels((prev) => {
            const current = prev[integrationId] ?? new Set<string>()
            const nextSet = new Set(current)
            if (nextSet.has(channelId)) {
                nextSet.delete(channelId)
            } else {
                nextSet.add(channelId)
            }
            return { ...prev, [integrationId]: nextSet }
        })
    }, [])

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
                        const Icon = appIconMap[group.provider] ?? null
                        const isConnected =
                            group.integration.status === IntegrationStatus.CONNECTED
                        const linkedResourceId = getLinkedResourceIdForIntegration(
                            group.integrationId,
                            project?.resources
                        )

                        const selectedId = selected[group.integrationId] ?? null
                        const selectionMatchesLinked =
                            linkedResourceId !== null &&
                            selectedId !== null &&
                            selectedId === linkedResourceId
                        const isDirty =
                            Boolean(selectedId) &&
                            selectedId !== linkedResourceId
                        const canLink =
                            isConnected &&
                            Boolean(selectedId) &&
                            isDirty &&
                            !linkIntegration.isPending

                        const linkButtonLabel = !isConnected
                            ? "Connect first"
                            : selectionMatchesLinked
                                ? "Linked"
                                : linkedResourceId
                                    ? "Update link"
                                    : "Link"

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
                                            disabled={group.provider === ExternalProvider.DISCORD ? true : !canLink}
                                        >
                                            {linkButtonLabel}
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {!isConnected
                                        ? "Connect OAuth in Organization → Integrations, then return here to link a resource."
                                        : group.provider === ExternalProvider.DISCORD
                                            ? "Pick a guild and link channels for this project."
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
                                    {group.provider === ExternalProvider.DISCORD ? (
                                        <DiscordLinker
                                            orgId={organizationId}
                                            projectId={projectId}
                                            integrationId={group.integrationId}
                                            isConnected={isConnected}
                                            resources={group.resources}
                                            projectResourceLookup={projectResourceLookup}
                                            isLinking={linkIntegration.isPending}
                                            selectedGuildId={selectedGuild[group.integrationId] ?? null}
                                            setSelectedGuildId={(guildId) =>
                                                setSelectedGuild((prev) => ({ ...prev, [group.integrationId]: guildId }))
                                            }
                                            selectedChannelIds={selectedChannels[group.integrationId] ?? new Set()}
                                            toggleChannel={(channelId) => toggleDiscordChannel(group.integrationId, channelId)}
                                            syncChannels={(guildId) =>
                                                syncDiscordChannels.mutateAsync({ integrationId: group.integrationId, guildId })
                                            }
                                            isSyncing={syncDiscordChannels.isPending}
                                            onAfterSync={() => refetchAvailableResources()}
                                            linkResources={(resourceIds) =>
                                                linkIntegration.mutateAsync({
                                                    integrationId: group.integrationId,
                                                    resourceIds,
                                                })
                                            }
                                        />
                                    ) : (
                                        <>
                                            {group.resources.length === 0 ? (
                                                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                                                    No resources available for this integration yet.
                                                </div>
                                            ) : (
                                                group.resources.map((r) => {
                                                    const isSelected = selectedId === r.id
                                                    const isLinkedResource = isAvailableResourceLinkedToProject(
                                                        r,
                                                        projectResourceLookup
                                                    )
                                                    return (
                                                        <button
                                                            key={r.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelected((prev) => ({
                                                                    ...prev,
                                                                    [group.integrationId]: r.id,
                                                                }))
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
                                                    )
                                                })
                                            )}
                                        </>
                                    )}
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function DiscordLinker(props: {
    orgId: string
    projectId: string
    integrationId: string
    isConnected: boolean
    resources: GetAvailableResourcesResponse[]
    projectResourceLookup: ReturnType<typeof useProjectResourceLinkLookup>
    selectedGuildId: string | null
    setSelectedGuildId: (guildId: string | null) => void
    selectedChannelIds: Set<string>
    toggleChannel: (channelId: string) => void
    syncChannels: (guildId: string) => Promise<unknown>
    isSyncing: boolean
    isLinking: boolean
    onAfterSync: () => void
    linkResources: (resourceIds: string[]) => Promise<unknown>
}) {
    const { selectedChannelIds, linkResources, onAfterSync, setSelectedGuildId, syncChannels } = props

    const { data: guilds, isLoading: guildsLoading } = useGetDiscordUserGuilds(props.integrationId)
    const botGuilds = React.useMemo(
        () => (guilds ?? []).filter((g) => g.botInstalled),
        [guilds]
    )

    const { data: channels, isLoading: channelsLoading } = useGetDiscordChannels(
        props.integrationId,
        props.selectedGuildId ?? undefined
    )

    const availableResourceByChannelId = React.useMemo(() => {
        const map = new Map<string, GetAvailableResourcesResponse>()
        for (const r of props.resources) {
            map.set(r.providerId, r)
        }
        return map
    }, [props.resources])

    const resourceIdsForGuildChannels = React.useMemo(() => {
        const ids: string[] = []
        for (const c of channels ?? []) {
            const match = availableResourceByChannelId.get(c.id)
            if (match) { ids.push(match.id) }
        }
        return ids
    }, [availableResourceByChannelId, channels])

    const linkedChannelCountForSelectedGuild = React.useMemo(() => {
        let count = 0
        for (const c of channels ?? []) {
            const match = availableResourceByChannelId.get(c.id)
            if (match && isAvailableResourceLinkedToProject(match, props.projectResourceLookup)) {
                count += 1
            }
        }
        return count
    }, [availableResourceByChannelId, channels, props.projectResourceLookup])

    const onSelectGuild = React.useCallback(
        async (guildId: string) => {
            setSelectedGuildId(guildId)
            await syncChannels(guildId)
            onAfterSync()
        },
        [onAfterSync, setSelectedGuildId, syncChannels]
    )

    const refreshChannels = React.useCallback(async () => {
        if (!props.selectedGuildId) { return }
        await syncChannels(props.selectedGuildId)
        onAfterSync()
    }, [onAfterSync, props.selectedGuildId, syncChannels])

    const linkSelectedChannels = React.useCallback(async () => {
        const resourceIds: string[] = []
        for (const channelId of selectedChannelIds) {
            const match = availableResourceByChannelId.get(channelId)
            if (match) { resourceIds.push(match.id) }
        }
        if (resourceIds.length === 0) { return }
        await linkResources(resourceIds)
    }, [availableResourceByChannelId, linkResources, selectedChannelIds])

    const linkWholeGuild = React.useCallback(async () => {
        if (resourceIdsForGuildChannels.length === 0) { return }
        await linkResources(resourceIdsForGuildChannels)
    }, [linkResources, resourceIdsForGuildChannels])

    if (!props.isConnected) {
        return (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                Connect Discord in Organization → Integrations first.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Guild</p>
                    <Badge variant="secondary">{botGuilds.length} with bot</Badge>
                </div>

                {guildsLoading ? (
                    <Skeleton className="h-9 w-full" />
                ) : botGuilds.length === 0 ? (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                        No guilds found with the bot installed.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {botGuilds.map((g) => {
                            const isSelected = props.selectedGuildId === g.id
                            return (
                                <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => onSelectGuild(g.id)}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                                        isSelected
                                            ? "border-primary/40 bg-primary/5"
                                            : "hover:bg-muted/40"
                                    )}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-medium">{g.name}</p>
                                            {isSelected && linkedChannelCountForSelectedGuild > 0 ? (
                                                <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10">
                                                    Already linked
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <p className="truncate text-xs text-muted-foreground">{g.id}</p>
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
                                        {isSelected ? <Check className="size-4" /> : null}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}

                {props.selectedGuildId ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void refreshChannels()}
                            disabled={props.isSyncing}
                        >
                            {props.isSyncing ? "Syncing..." : "Refresh channels"}
                        </Button>
                        <Button
                            type="button"
                            onClick={linkWholeGuild}
                            disabled={props.isLinking || props.isSyncing || channelsLoading || resourceIdsForGuildChannels.length === 0}
                        >
                            Link whole guild
                        </Button>
                    </div>
                ) : null}
            </div>

            {props.selectedGuildId ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Channels</p>
                        <Badge variant="secondary">{channels?.length ?? 0}</Badge>
                    </div>

                    {channelsLoading ? (
                        <Skeleton className="h-9 w-full" />
                    ) : !channels || channels.length === 0 ? (
                        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                            No channels found for this guild.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {channels.map((c) => {
                                const isSelected = props.selectedChannelIds.has(c.id)
                                const matchingResource = availableResourceByChannelId.get(c.id)
                                const isLinkedResource = matchingResource
                                    ? isAvailableResourceLinkedToProject(matchingResource, props.projectResourceLookup)
                                    : false
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => props.toggleChannel(c.id)}
                                        className={cn(
                                            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                                            isSelected
                                                ? "border-primary/40 bg-primary/5"
                                                : "hover:bg-muted/40"
                                        )}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-medium">{c.name}</p>
                                                {isLinkedResource ? (
                                                    <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10">
                                                        Already linked
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <p className="truncate text-xs text-muted-foreground">{c.id}</p>
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
                                            {isSelected ? <Check className="size-4" /> : null}
                                        </div>
                                    </button>
                                )
                            })}

                            <div className="flex items-center justify-between gap-2 pt-1">
                                <p className="text-xs text-muted-foreground">
                                    Selected: {props.selectedChannelIds.size}
                                </p>
                                <Button
                                    type="button"
                                    onClick={linkSelectedChannels}
                                    disabled={props.isLinking || props.selectedChannelIds.size === 0}
                                >
                                    Link selected channels
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    )
}

