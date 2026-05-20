"use client"

import * as React from "react"
import { useRouter, useParams, useSearchParams, usePathname } from "next/navigation"
import { SiSlack } from "react-icons/si"
import { Hash, Lock, MessageCircle } from "lucide-react"

import { useSlackChannels, useSyncSlackChannels } from "@/shared/queries/integration-slack.queries"
import { getSlackInstallUrl } from "@/shared/api/integration-slack"
import { ExternalProvider } from "@/types/enum"
import { Skeleton } from "@/components/ui/skeleton"

import { ProviderHeader } from "@/widgets/integrations/ui/provider-header"
import { ProviderInstances } from "@/widgets/integrations/ui/provider-instances"
import { IntegrationActions } from "@/widgets/integrations/ui/integration-actions"

export default function SlackIntegrationPage() {
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

    const { data: channels, isLoading } = useSlackChannels(integrationId)
    const syncChannelsMutation = useSyncSlackChannels(integrationId)

    return (
        <div className="space-y-6">
            <ProviderHeader
                icon={SiSlack}
                title="Slack"
                description="Manage workspaces and channel access."
                actions={
                    <IntegrationActions
                        provider="Slack"
                        organizationId={organizationId}
                        integrationId={integrationId}
                        getReinstallUrl={getSlackInstallUrl}
                        onSync={() => syncChannelsMutation.mutate()}
                        isSyncing={syncChannelsMutation.isPending}
                    />
                }
            />

            <ProviderInstances
                organizationId={organizationId}
                provider={ExternalProvider.SLACK}
                providerName="Slack"
                icon={SiSlack}
                selectedIntegrationId={integrationId}
                onSelect={setIntegrationId}
            />

            {integrationId ? (
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2)">
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-(--line-2)">
                        <div>
                            <div className="text-sm font-semibold text-(--fg)">
                                Channels
                            </div>
                            <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                                {channels?.length ?? 0} {(channels?.length ?? 0) === 1 ? "channel" : "channels"} indexed
                            </p>
                        </div>
                    </div>

                    <div className="p-5">
                        {isLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-14 bg-(--bg-3) rounded-[10px]" />
                                ))}
                            </div>
                        ) : !channels?.length ? (
                            <div className="text-center py-10">
                                <p className="text-(--fg) font-medium">No channels yet</p>
                                <p className="text-sm text-(--fg-3) mt-1 max-w-sm mx-auto">
                                    Click Sync to pull channels from your Slack workspace.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {channels.map((channel) => {
                                    const Icon = channel.is_im
                                        ? MessageCircle
                                        : channel.is_private
                                            ? Lock
                                            : Hash
                                    const channelType = channel.is_private
                                        ? "Private"
                                        : channel.is_im
                                            ? "DM"
                                            : channel.is_mpim
                                                ? "Group DM"
                                                : "Public"

                                    return (
                                        <div
                                            key={channel.id}
                                            className="flex items-start justify-between gap-3 rounded-[10px] border border-(--line-2) bg-(--bg-3) px-4 py-3 transition-colors hover:border-(--accent-lime)/30"
                                        >
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                <div className="size-8 shrink-0 grid place-items-center rounded-[8px] border border-(--line-2) bg-(--bg-2) text-(--fg-2)">
                                                    <Icon className="size-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-medium text-(--fg) truncate">
                                                            #{channel.name}
                                                        </p>
                                                        {channel.is_archived ? (
                                                            <span className="rounded-full px-2 py-0.5 font-mono uppercase tracking-wider text-[10px] font-semibold border border-(--line-2) bg-(--bg-2) text-(--fg-3)">
                                                                Archived
                                                            </span>
                                                        ) : null}
                                                        {channel.is_member ? (
                                                            <span className="rounded-full px-2 py-0.5 font-mono uppercase tracking-wider text-[10px] font-semibold border border-[rgba(124,246,111,0.3)] bg-[rgba(124,246,111,0.12)] text-(--accent-2)">
                                                                Member
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {channel.purpose?.value ? (
                                                        <p className="text-xs text-(--fg-3) mt-1 line-clamp-1">
                                                            {channel.purpose.value}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="text-right text-[10px] font-mono uppercase tracking-wider text-(--fg-3) shrink-0">
                                                <div>{channelType}</div>
                                                <div className="text-(--fg-2) normal-case tracking-normal mt-0.5">
                                                    {channel.num_members ?? 0} members
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </section>
            ) : null}
        </div>
    )
}
