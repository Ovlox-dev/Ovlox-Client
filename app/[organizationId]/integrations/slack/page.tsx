"use client"

import { Button } from "@/components/ui/button"
import { useSlackChannels, useSyncSlackChannels } from "@/shared/queries/integration-slack.queries"
import { useRemoveOrgIntegration, useResetOrgIntegration } from "@/shared/queries/org.queries"
import { getSlackInstallUrl } from "@/shared/api/integration-slack"
import { useParams, useSearchParams } from "next/navigation"
import * as React from "react"
import { SiSlack } from "react-icons/si"
import { Loader2, RefreshCw, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
    CustomModal,
    CustomModalHeader,
    CustomModalTitle,
    CustomModalDescription,
    CustomModalBody,
    CustomModalFooter,
} from "@/components/ui/custom-modal"


export default function SlackIntegrationPage() {
    const searchParams = useSearchParams();
    const params = useParams<{ organizationId: string }>()
    const organizationId = params?.organizationId ?? ""
    const integrationId = searchParams?.get("integrationId") ?? ""

    const { data: channels } = useSlackChannels(integrationId)
    const syncChannelsMutation = useSyncSlackChannels(integrationId)
    const removeMutation = useRemoveOrgIntegration(organizationId)
    const resetMutation = useResetOrgIntegration(organizationId)

    const [isReinstalling, setIsReinstalling] = React.useState(false)
    const [confirmRemove, setConfirmRemove] = React.useState(false)
    const [confirmReset, setConfirmReset] = React.useState(false)

    /** Re-auth: kicks off the OAuth flow against the SAME integration row, so the user
     *  ends up reconnected without losing their channel selections. */
    const handleReinstall = async () => {
        if (!integrationId || !organizationId) return
        try {
            setIsReinstalling(true)
            const { url } = await getSlackInstallUrl(organizationId, integrationId)
            // Send the user to Slack's OAuth screen; on completion we redirect back to
            // the integrations page with `?provider=slack&connected=slack`.
            window.location.href = url
        } catch (err) {
            toast.error("Couldn't start Slack reauth", {
                description: err instanceof Error ? err.message : "Unknown error",
            })
            setIsReinstalling(false)
        }
    }

    /** Reset: clears tokens + marks NOT_CONNECTED, but keeps the row + channel links so
     *  the user can reinstall without re-picking everything. */
    const handleReset = async () => {
        if (!integrationId) return
        try {
            await resetMutation.mutateAsync(integrationId)
            toast.success("Slack integration reset — click Reinstall to reconnect")
            setConfirmReset(false)
        } catch (err) {
            toast.error("Couldn't reset integration", {
                description: err instanceof Error ? err.message : "Unknown error",
            })
        }
    }

    /** Remove: full delete. Drops tokens, channel links, project connections. */
    const handleRemove = async () => {
        if (!integrationId) return
        try {
            await removeMutation.mutateAsync(integrationId)
            toast.success("Slack integration removed")
            window.location.href = `/${organizationId}/integrations`
        } catch (err) {
            toast.error("Couldn't remove integration", {
                description: err instanceof Error ? err.message : "Unknown error",
            })
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-linear-to-br from-gray-800 to-gray-900 border border-border">
                        <SiSlack className="size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Slack Integration</h1>
                        <p className="text-sm text-muted-foreground">Connect Slack and manage channels.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncChannelsMutation.mutate()}
                        disabled={syncChannelsMutation.isPending}
                    >
                        {syncChannelsMutation.isPending ? (
                            <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Syncing</>
                        ) : (
                            <><RefreshCw className="size-3.5 mr-1.5" /> Sync channels</>
                        )}
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReinstall}
                        disabled={isReinstalling || !integrationId}
                        title="Re-authorize the Slack workspace. Keeps existing channel selections."
                    >
                        {isReinstalling ? (
                            <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Redirecting…</>
                        ) : (
                            <><RotateCcw className="size-3.5 mr-1.5" /> Reinstall / Re-auth</>
                        )}
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmReset(true)}
                        disabled={resetMutation.isPending || !integrationId}
                        title="Disconnect without deleting. Clears tokens and channel cache; channel links to projects are preserved."
                    >
                        <RotateCcw className="size-3.5 mr-1.5" /> Reset
                    </Button>

                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmRemove(true)}
                        disabled={removeMutation.isPending || !integrationId}
                        title="Permanently delete this integration including tokens, channel cache, and project connections."
                    >
                        <Trash2 className="size-3.5 mr-1.5" /> Remove
                    </Button>
                </div>
            </div>

            <CustomModal open={confirmReset} onOpenChange={setConfirmReset}>
                <CustomModalHeader>
                    <CustomModalTitle>Reset Slack integration?</CustomModalTitle>
                    <CustomModalDescription>
                        This will clear stored tokens and mark the workspace as <strong>not connected</strong>.
                        Channel selections and project links are kept, so once you click <strong>Reinstall</strong>
                        afterwards everything will resume. Use this when tokens look broken or the OAuth grant
                        was revoked on the Slack side.
                    </CustomModalDescription>
                </CustomModalHeader>
                <CustomModalBody>{null}</CustomModalBody>
                <CustomModalFooter>
                    <Button variant="outline" onClick={() => setConfirmReset(false)}>Cancel</Button>
                    <Button onClick={handleReset} disabled={resetMutation.isPending}>
                        {resetMutation.isPending ? (
                            <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Resetting</>
                        ) : (
                            "Reset integration"
                        )}
                    </Button>
                </CustomModalFooter>
            </CustomModal>

            <CustomModal open={confirmRemove} onOpenChange={setConfirmRemove}>
                <CustomModalHeader>
                    <CustomModalTitle className="text-destructive">Remove Slack integration?</CustomModalTitle>
                    <CustomModalDescription>
                        This permanently deletes the integration record, tokens, channel cache, and all project
                        connections that depend on it. <strong>Ingested messages stay</strong> as historical
                        events, but no new ones will arrive until you reconnect from scratch.
                        This action cannot be undone.
                    </CustomModalDescription>
                </CustomModalHeader>
                <CustomModalBody>{null}</CustomModalBody>
                <CustomModalFooter>
                    <Button variant="outline" onClick={() => setConfirmRemove(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleRemove} disabled={removeMutation.isPending}>
                        {removeMutation.isPending ? (
                            <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Removing</>
                        ) : (
                            "Yes, remove integration"
                        )}
                    </Button>
                </CustomModalFooter>
            </CustomModal>
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

