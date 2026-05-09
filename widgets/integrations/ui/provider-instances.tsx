"use client"

import * as React from "react"
import type { IconType } from "react-icons"
import { Plus, Loader2, ChevronRight } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useOrgIntegrations, useAddOrgIntegrations } from "@/shared/queries/org.queries"
import type { OrgIntegrationStatusItem } from "@/types/api-types"
import { ExternalProvider, IntegrationStatus } from "@/types/enum"

export interface ProviderInstancesProps {
    organizationId: string
    /** External provider matching the backend enum, e.g. ExternalProvider.GITHUB. */
    provider: ExternalProvider
    /** Display name for headings/buttons. */
    providerName: string
    /** Brand icon. */
    icon: IconType
    /** Currently-selected integration id (from URL `?integrationId=`). */
    selectedIntegrationId: string
    /** Called when user picks a different instance. */
    onSelect: (integrationId: string) => void
}

/**
 * Lists every existing integration row for a provider and lets the user:
 *   - switch between them (passes integrationId via onSelect)
 *   - add a new instance (calls /orgs/:id/integrations with the provider)
 *
 * Auto-selects the first instance on mount if none is already selected via
 * the URL.
 */
export function ProviderInstances({
    organizationId,
    provider,
    providerName,
    icon: Icon,
    selectedIntegrationId,
    onSelect,
}: ProviderInstancesProps) {
    const { data: integrations, isLoading, refetch } = useOrgIntegrations(organizationId)
    const addMutation = useAddOrgIntegrations(organizationId)

    const instances = React.useMemo<OrgIntegrationStatusItem[]>(
        () =>
            (integrations ?? []).filter(
                (i) => String(i.app).toUpperCase() === String(provider).toUpperCase()
            ),
        [integrations, provider]
    )

    // Auto-select the first instance if there's none in the URL yet.
    React.useEffect(() => {
        if (selectedIntegrationId) return
        if (instances.length === 0) return
        onSelect(instances[0].integrationId)
    }, [instances, selectedIntegrationId, onSelect])

    const handleAdd = async () => {
        try {
            const res = await addMutation.mutateAsync({
                provider,
                label: `${providerName} ${instances.length + 1}`,
            })
            await refetch()
            const newId = res?.data?.id
            if (newId) onSelect(newId)
            toast.success(`Created a new ${providerName} integration`)
        } catch (err) {
            toast.error(`Couldn't create ${providerName} integration`, {
                description: err instanceof Error ? err.message : "Unknown error",
            })
        }
    }

    if (isLoading) {
        return (
            <div className="rounded-[14px] border border-(--line) bg-(--bg-2) p-5">
                <div className="flex items-center gap-2 text-sm text-(--fg-3)">
                    <Loader2 className="size-4 animate-spin" />
                    Loading {providerName} instances…
                </div>
            </div>
        )
    }

    if (instances.length === 0) {
        return (
            <div className="rounded-[14px] border border-dashed border-(--line) bg-(--bg-2)/50 p-8 text-center">
                <div className="inline-grid size-12 place-items-center rounded-full bg-(--bg-3) border border-(--line-2) mb-3">
                    <Icon className="size-5 text-(--fg-2)" />
                </div>
                <p className="text-(--fg) font-medium mb-1">
                    No {providerName} instances yet
                </p>
                <p className="text-sm text-(--fg-3) max-w-sm mx-auto mb-5">
                    Create your first {providerName} integration to start syncing data
                    from {providerName} into Ovlox.
                </p>
                <Button onClick={handleAdd} disabled={addMutation.isPending}>
                    {addMutation.isPending ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            Creating…
                        </>
                    ) : (
                        <>
                            <Plus className="size-4" />
                            Add {providerName} integration
                        </>
                    )}
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3 px-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--fg-3)">
                    {instances.length} {providerName} {instances.length === 1 ? "instance" : "instances"}
                </span>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAdd}
                    disabled={addMutation.isPending}
                >
                    {addMutation.isPending ? (
                        <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Adding…
                        </>
                    ) : (
                        <>
                            <Plus className="size-3.5" />
                            Add another
                        </>
                    )}
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {instances.map((inst) => {
                    const isSelected = inst.integrationId === selectedIntegrationId
                    const status = inst.status ?? IntegrationStatus.NOT_CONNECTED
                    const account =
                        inst.oauthAccount?.identifier ||
                        inst.externalAccount ||
                        inst.externalAccountId ||
                        "—"

                    return (
                        <button
                            key={inst.integrationId}
                            type="button"
                            onClick={() => onSelect(inst.integrationId)}
                            className={[
                                "group relative text-left rounded-[12px] border bg-(--bg-2) p-4 transition-all",
                                "hover:border-(--accent-lime)/40 hover:bg-(--bg-2)",
                                isSelected
                                    ? "border-(--accent-lime) shadow-[inset_2px_0_0_var(--accent-lime),0_0_24px_rgba(200,255,62,0.08)]"
                                    : "border-(--line)",
                            ].join(" ")}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="size-9 shrink-0 grid place-items-center rounded-[8px] border border-(--line-2) bg-(--bg-3)">
                                    <Icon className="size-4 text-(--fg)" />
                                </div>
                                <StatusPill status={status} />
                            </div>
                            <div className="mt-3">
                                <p className="text-sm font-semibold text-(--fg) truncate">
                                    {providerName} #{inst.integrationId.slice(-6)}
                                </p>
                                <p className="text-xs text-(--fg-3) truncate font-mono mt-0.5">
                                    {account}
                                </p>
                            </div>
                            <div className="mt-3 flex items-center text-xs text-(--fg-3) font-mono">
                                {isSelected ? (
                                    <span className="text-(--accent-lime) inline-flex items-center gap-1">
                                        Active <ChevronRight className="size-3" />
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 group-hover:text-(--fg-2)">
                                        Open <ChevronRight className="size-3" />
                                    </span>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

function StatusPill({ status }: { status: IntegrationStatus }) {
    const map: Record<
        string,
        { label: string; cls: string }
    > = {
        [IntegrationStatus.CONNECTED]: {
            label: "Connected",
            cls:
                "border border-[rgba(124,246,111,0.3)] bg-[rgba(124,246,111,0.12)] text-(--accent-2)",
        },
        [IntegrationStatus.PROCESSING]: {
            label: "Processing",
            cls:
                "border border-[rgba(255,138,61,0.3)] bg-[rgba(255,138,61,0.12)] text-(--warn)",
        },
        [IntegrationStatus.NOT_CONNECTED]: {
            label: "Not connected",
            cls: "border border-(--line-2) bg-(--bg-3) text-(--fg-3)",
        },
    }
    const cfg = map[status] ?? map[IntegrationStatus.NOT_CONNECTED]
    return (
        <span
            className={[
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
                "font-mono uppercase tracking-wider text-[10px] font-semibold whitespace-nowrap",
                cfg.cls,
            ].join(" ")}
        >
            {cfg.label}
        </span>
    )
}
