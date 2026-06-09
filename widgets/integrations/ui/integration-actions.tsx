"use client"

import * as React from "react"
import { Loader2, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    CustomModal,
    CustomModalHeader,
    // CustomModalDescription,
    CustomModalFooter,
    CustomModalDescription,
} from "@/components/ui/custom-modal"
import {
    useRemoveOrgIntegration,
    // useResetOrgIntegration,
} from "@/shared/queries/org.queries"

export interface IntegrationActionsProps {
    /** Provider display name, e.g. "GitHub", "Slack". Used in toast/modal copy. */
    provider: string
    /** Current org id (URL param). */
    organizationId: string
    /** Currently selected integration id (URL search param). */
    integrationId: string

    /**
     * Async kickoff that returns the provider-specific reauthorization URL.
     * On success the page redirects to it. Most providers expose an
     * `installUrl` / `oauthUrl` API for this.
     */
    getReinstallUrl?: (
        organizationId: string,
        integrationId: string
    ) => Promise<{ url: string }>

    /**
     * Optional explicit Sync handler. When provided, the "Sync" button is
     * shown and disabled while `isSyncing` is true.
     */
    onSync?: () => void | Promise<void>
    isSyncing?: boolean

    /**
     * Where to land after a successful Remove. Defaults to the org-level
     * integrations page so the now-deleted row vanishes from view.
     */
    afterRemoveHref?: string

    /**
     * Called after a successful Reset (e.g. refetch provider-specific
     * resources like Slack channels).
     */
    onResetSuccess?: () => void | Promise<void>
}

/**
 * Action bar shown at the top of every per-integration management page:
 *   [ Sync ]  [ Reinstall / Re-auth ]  [ Reset ]  [ Remove ]
 *
 * The two destructive actions (Reset, Remove) gate behind a confirm modal
 * with explicit copy explaining what each does — "reset" keeps the row but
 * clears tokens, "remove" wipes everything.
 */
export function IntegrationActions({
    provider,
    organizationId,
    integrationId,
    // getReinstallUrl,
    onSync,
    isSyncing,
    afterRemoveHref,
    // onResetSuccess,
}: IntegrationActionsProps) {
    const removeMutation = useRemoveOrgIntegration(organizationId)
    // const resetMutation = useResetOrgIntegration(organizationId)

    // const [reinstalling, setReinstalling] = React.useState(false)
    // const [confirmReset, setConfirmReset] = React.useState(false)
    const [confirmRemove, setConfirmRemove] = React.useState(false)

    const disabled = !integrationId

    // const handleReinstall = async () => {
    //     if (!integrationId || !getReinstallUrl) {
    //         return
    //     }
    //     try {
    //         setReinstalling(true)
    //         const { url } = await getReinstallUrl(organizationId, integrationId)
    //         window.location.href = url
    //     } catch (err) {
    //         toast.error(`Couldn't start ${provider} reauth`, {
    //             description: err instanceof Error ? err.message : "Unknown error",
    //         })
    //         setReinstalling(false)
    //     }
    // }

    // const handleReset = async () => {
    //     if (!integrationId) {
    //         return
    //     }
    //     try {
    //         await resetMutation.mutateAsync(integrationId)
    //         setConfirmReset(false)
    //         try {
    //             await onResetSuccess?.()
    //         } catch (err) {
    //             toast.error(`Couldn't reload ${provider} data`, {
    //                 description: err instanceof Error ? err.message : "Unknown error",
    //             })
    //         }
    //         toast.success(`${provider} integration reset`, {
    //             description: "Tokens cleared. Click Reinstall to reconnect.",
    //         })
    //     } catch (err) {
    //         toast.error(`Couldn't reset ${provider} integration`, {
    //             description: err instanceof Error ? err.message : "Unknown error",
    //         })
    //     }
    // }

    const handleSync = async () => {
        if (!onSync || !integrationId) {
            return
        }
        try {
            await onSync()
            toast.success(`Synced ${provider} resources`)
        } catch (err) {
            toast.error(`Couldn't sync ${provider} resources`, {
                description: err instanceof Error ? err.message : "Unknown error",
            })
        }
    }

    const handleRemove = async () => {
        if (!integrationId) {
            return
        }
        try {
            await removeMutation.mutateAsync(integrationId)
            toast.success(`${provider} integration removed`)
            setConfirmRemove(false)
            window.location.href =
                afterRemoveHref ?? `/${organizationId}/integrations`
        } catch (err) {
            toast.error("Couldn't remove integration", {
                description: err instanceof Error ? err.message : "Unknown error",
            })
        }
    }

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                {onSync ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleSync()}
                        disabled={isSyncing || disabled}
                        title={`Re-pull ${provider} resources from the provider`}
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Syncing
                            </>
                        ) : (
                            <>
                                <RefreshCw className="size-3.5" />
                                Sync
                            </>
                        )}
                    </Button>
                ) : null}

                {/* {getReinstallUrl ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReinstall}
                        disabled={reinstalling || disabled}
                        title={`Re-authorize ${provider}. Keeps existing selections.`}
                    >
                        {reinstalling ? (
                            <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Redirecting…
                            </>
                        ) : (
                            <>
                                <Wand2 className="size-3.5" />
                                Reinstall
                            </>
                        )}
                    </Button>
                ) : null}

                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmReset(true)}
                    disabled={resetMutation.isPending || disabled}
                    title={`Disconnect without deleting. Clears tokens; project links are preserved.`}
                >
                    <RotateCcw className="size-3.5" />
                    Reset
                </Button> */}

                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmRemove(true)}
                    disabled={removeMutation.isPending || disabled}
                    title={`Permanently delete this ${provider} integration.`}
                >
                    <Trash2 className="size-3.5" />
                    Remove
                </Button>
            </div>

            {/* RESET confirm */}
            {/* <CustomModal open={confirmReset} onOpenChange={setConfirmReset}>
                <CustomModalHeader>
                    <CustomModalTitle>Reset {provider} integration?</CustomModalTitle>
                    <CustomModalDescription>
                        This clears stored tokens and marks the integration as{" "}
                        <strong>not connected</strong>. Project links and prior
                        selections are kept, so once you click <strong>Reinstall</strong>{" "}
                        afterwards everything resumes. Use this when tokens look broken
                        or the OAuth grant was revoked at {provider}.
                    </CustomModalDescription>
                </CustomModalHeader>
                <CustomModalBody>{null}</CustomModalBody>
                <CustomModalFooter>
                    <Button
                        variant="outline"
                        onClick={() => setConfirmReset(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReset}
                        disabled={resetMutation.isPending}
                    >
                        {resetMutation.isPending ? (
                            <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Resetting
                            </>
                        ) : (
                            "Reset integration"
                        )}
                    </Button>
                </CustomModalFooter>
            </CustomModal> */}

            {/* REMOVE confirm */}
            <CustomModal open={confirmRemove} onOpenChange={setConfirmRemove}>
                <CustomModalHeader className="text-(--danger)">
                    Remove {provider} integration?
                </CustomModalHeader>
                <CustomModalDescription>
                    This permanently deletes the integration record, tokens, cached
                    resources, and all project connections that depend on it.{" "}
                    <strong>Ingested events stay</strong> as historical records,
                    but no new ones will arrive until you reconnect from scratch.
                    This action cannot be undone.
                </CustomModalDescription>
                <CustomModalFooter>
                    <Button
                        variant="outline"
                        onClick={() => setConfirmRemove(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleRemove}
                        disabled={removeMutation.isPending}
                    >
                        {removeMutation.isPending ? (
                            <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Removing
                            </>
                        ) : (
                            "Yes, remove integration"
                        )}
                    </Button>
                </CustomModalFooter>
            </CustomModal>
        </>
    )
}
