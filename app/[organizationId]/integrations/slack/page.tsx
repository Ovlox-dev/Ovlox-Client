"use client"

import { Button } from "@/components/ui/button"
import { useSlackChannels, useSyncSlackChannels } from "@/shared/queries/integration-slack.queries"
import { useSearchParams } from "next/navigation"
import * as React from "react"
import { SiSlack } from "react-icons/si"


export default function SlackIntegrationPage() {
    const searchParams = useSearchParams();
    const integrationId = searchParams?.get("integrationId") ?? ""

    const { data: channels } = useSlackChannels(integrationId)
    const syncChannelsMutation = useSyncSlackChannels(integrationId)

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-linear-to-br from-gray-800 to-gray-900 border border-border">
                        <SiSlack className="size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Slack Integration</h1>
                        <p className="text-sm text-muted-foreground">Connect Slack and manage channels.</p>
                    </div>
                    <Button onClick={() => syncChannelsMutation.mutate()}>
                        Sync
                    </Button>

                </div>
            </div>
            <div className="space-y-3">
                {channels?.map((channel) => {
                    const channelType = channel.is_private
                        ? 'Private'
                        : channel.is_im
                            ? 'DM'
                            : channel.is_mpim
                                ? 'Group DM'
                                : 'Public';

                    return (
                        <div
                            key={channel.id}
                            className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition"
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                        #{channel.name}
                                    </span>

                                    {channel.is_archived && (
                                        <span className="text-xs rounded bg-gray-200 px-2 py-0.5">
                                            Archived
                                        </span>
                                    )}

                                    {channel.is_member && (
                                        <span className="text-xs rounded bg-green-100 text-green-700 px-2 py-0.5">
                                            Member
                                        </span>
                                    )}
                                </div>

                                {channel.purpose?.value && (
                                    <p className="text-xs text-muted-foreground">
                                        {channel.purpose.value}
                                    </p>
                                )}

                                {channel.topic?.value && (
                                    <p className="text-xs italic text-muted-foreground">
                                        Topic: {channel.topic.value}
                                    </p>
                                )}
                            </div>

                            <div className="text-right text-xs text-muted-foreground space-y-1">
                                <div>{channelType}</div>
                                <div>{channel.num_members} members</div>
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    )
}

