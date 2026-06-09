"use client"

import * as React from "react"
import { useRouter, useParams, useSearchParams, usePathname } from "next/navigation"
import { SiDiscord } from "react-icons/si"
import { ChevronDown, Hash, RefreshCcw, Server } from "lucide-react"
import { toast } from "sonner"

import {
    useGetChannels,
    useGetDiscordUserGuilds,
    useSyncChannels,
} from "@/shared/queries/discord.queries"
import {
    getBotInstallUrlForGuild,
    getDiscordOAuthUrl,
} from "@/shared/api/integration-discord"
import { ExternalProvider } from "@/types/enum"
import { formatAuthErrorMessage } from "@/features/auth"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { ProviderHeader } from "@/widgets/integrations/ui/provider-header"
import { ProviderInstances } from "@/widgets/integrations/ui/provider-instances"
import { IntegrationActions } from "@/widgets/integrations/ui/integration-actions"

export default function DiscordIntegrationPage() {
    const router = useRouter()
    const pathname = usePathname()
    const params = useParams<{ organizationId: string }>()
    const searchParams = useSearchParams()
    const organizationId = params?.organizationId ?? ""
    const integrationId = searchParams?.get("integrationId") ?? ""

    const setIntegrationId = React.useCallback(
        (id: string) => {
            const next = new URLSearchParams(searchParams?.toString() ?? "")
            next.set("integrationId", id)
            router.replace(`${pathname}?${next.toString()}`, { scroll: false })
        },
        [router, pathname, searchParams]
    )

    const { data: guilds, isLoading, error } = useGetDiscordUserGuilds(integrationId)
    const syncGuildsMutation = useSyncChannels()
    const [expandedGuildId, setExpandedGuildId] = React.useState<string | null>(null)
    const [syncingGuildId, setSyncingGuildId] = React.useState<string | null>(null)
    const initialExpandDoneRef = React.useRef<string | null>(null)

    React.useEffect(() => {
        initialExpandDoneRef.current = null
        setExpandedGuildId(null)
    }, [integrationId])

    React.useEffect(() => {
        if (!guilds?.length || !integrationId) {
            return
        }
        if (initialExpandDoneRef.current === integrationId) {
            return
        }
        initialExpandDoneRef.current = integrationId
        setExpandedGuildId(guilds[0].id)
    }, [guilds, integrationId])

    const handleBotInstall = async (guildId: string) => {
        try {
            const res = await getBotInstallUrlForGuild(integrationId, guildId)
            if (res?.url) {
                window.open(res.url, "_blank", "noopener,noreferrer")
            }
        } catch (err) {
            toast.error(formatAuthErrorMessage(err))
        }
    }

    const handleSyncGuildChannels = React.useCallback(
        (guildId: string) => {
            setSyncingGuildId(guildId)
            syncGuildsMutation.mutate(
                { integrationId, guildId },
                {
                    onSuccess: () => {
                        toast.success("Synced channels")
                        setSyncingGuildId(null)
                    },
                    onError: (err) => {
                        toast.error(formatAuthErrorMessage(err))
                        setSyncingGuildId(null)
                    },
                }
            )
        },
        [integrationId, syncGuildsMutation]
    )

    return (
        <div className="space-y-6">
            <ProviderHeader
                icon={SiDiscord}
                title="Discord"
                description="Manage servers and channel access."
                actions={
                    <IntegrationActions
                        provider="Discord"
                        organizationId={organizationId}
                        integrationId={integrationId}
                        getReinstallUrl={getDiscordOAuthUrl}
                    />
                }
            />

            <ProviderInstances
                organizationId={organizationId}
                provider={ExternalProvider.DISCORD}
                providerName="Discord"
                icon={SiDiscord}
                selectedIntegrationId={integrationId}
                onSelect={setIntegrationId}
            />

            {integrationId ? (
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2)">
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-(--line-2)">
                        <div>
                            <div className="text-sm font-semibold text-(--fg)">Servers</div>
                            <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                                Expand a server to view and sync its channels
                            </p>
                        </div>
                    </div>

                    <div className="p-5">
                        {error ? (
                            <div className="rounded-[10px] border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.06)] p-4">
                                <p className="text-sm text-(--danger)">{formatAuthErrorMessage(error)}</p>
                            </div>
                        ) : isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Skeleton
                                        key={i}
                                        className="h-32 bg-(--bg-3) rounded-[12px]"
                                    />
                                ))}
                            </div>
                        ) : !guilds?.length ? (
                            <div className="text-center py-10">
                                <p className="text-(--fg) font-medium">No Discord servers</p>
                                <p className="text-sm text-(--fg-3) mt-1 max-w-sm mx-auto">
                                    Connect Discord and grant access to your servers.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {guilds.map((guild) => (
                                    <GuildCard
                                        key={guild.id}
                                        integrationId={integrationId}
                                        guild={guild}
                                        expanded={expandedGuildId === guild.id}
                                        onToggleExpanded={() =>
                                            setExpandedGuildId((prev) =>
                                                prev === guild.id ? null : guild.id
                                            )
                                        }
                                        onInstallBot={() => handleBotInstall(guild.id)}
                                        onSyncChannels={() => handleSyncGuildChannels(guild.id)}
                                        syncingChannels={syncingGuildId === guild.id}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            ) : null}
        </div>
    )
}

function GuildCard(props: {
    integrationId: string
    guild: { id: string; name: string; botInstalled: boolean }
    expanded: boolean
    onToggleExpanded: () => void
    onInstallBot: () => void
    onSyncChannels: () => void
    syncingChannels: boolean
}) {
    const { data: channels, isLoading } = useGetChannels(
        props.integrationId,
        props.expanded ? props.guild.id : undefined
    )

    return (
        <article className="rounded-[12px] border border-(--line-2) bg-(--bg-3) p-4 transition-colors hover:border-(--accent-lime)/30">
            <div className="flex items-start gap-3 min-w-0">
                <div className="size-9 shrink-0 grid place-items-center rounded-[10px] border border-(--line-2) bg-(--bg-2) text-(--fg-2)">
                    <Server className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-(--fg) truncate flex-1">
                            {props.guild.name}
                        </p>
                        <span
                            className={cn(
                                "shrink-0 inline-flex rounded-full px-2 py-0.5",
                                "font-mono uppercase tracking-wider text-[10px] font-semibold",
                                props.guild.botInstalled
                                    ? "border border-[rgba(124,246,111,0.3)] bg-[rgba(124,246,111,0.12)] text-(--accent-2)"
                                    : "border border-(--line-2) bg-(--bg-2) text-(--fg-3)"
                            )}
                        >
                            {props.guild.botInstalled ? "Bot installed" : "No bot"}
                        </span>
                    </div>
                    <p className="text-xs text-(--fg-3) font-mono mt-0.5 truncate">
                        {props.guild.id}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={props.onToggleExpanded}
                    aria-label={props.expanded ? "Collapse channels" : "Expand channels"}
                    className="shrink-0"
                >
                    <ChevronDown
                        className={cn(
                            "size-4 transition-transform",
                            props.expanded ? "rotate-180" : ""
                        )}
                    />
                </Button>
                {props.guild.botInstalled ? (
                    <>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={props.onSyncChannels}
                            disabled={props.syncingChannels}
                        >
                            <RefreshCcw
                                className={cn(
                                    "size-3.5",
                                    props.syncingChannels ? "animate-spin" : ""
                                )}
                            />
                        </Button>
                    </>
                ) : (
                    <Button type="button" size="sm" onClick={props.onInstallBot}>
                        Install bot
                    </Button>
                )}
            </div>



            {props.expanded ? (
                <div className="mt-3 rounded-[10px] border border-(--line-2) bg-(--bg-2) p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-(--fg-3)">
                            Channels
                        </p>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-(--fg-2)">
                            {channels?.length ?? 0}
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-7 w-full bg-(--bg-3)" />
                            <Skeleton className="h-7 w-full bg-(--bg-3)" />
                            <Skeleton className="h-7 w-full bg-(--bg-3)" />
                        </div>
                    ) : !channels?.length ? (
                        <p className="text-xs text-(--fg-3) py-2">
                            No channels found. Try syncing channels.
                        </p>
                    ) : (
                        <div className="max-h-56 space-y-1 overflow-auto pr-1">
                            {channels.map((c) => (
                                <div
                                    key={c.id}
                                    className="flex items-center justify-between rounded-[6px] border border-(--line-2) bg-(--bg-3) px-2.5 py-1.5"
                                >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <Hash className="size-3 shrink-0 text-(--fg-3)" />
                                        <p className="text-xs text-(--fg) ">{c.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}
        </article>
    )
}
