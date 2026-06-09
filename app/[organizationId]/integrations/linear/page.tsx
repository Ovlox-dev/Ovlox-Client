"use client"

import * as React from "react"
import { useRouter, useParams, useSearchParams, usePathname } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { SiLinear } from "react-icons/si"
import { Users } from "lucide-react"
import { toast } from "sonner"
import {
    listLinearTeams,
    syncLinearTeams,
    getLinearInstallUrl,
} from "@/shared/api/integration-linear"
import { ExternalProvider } from "@/types/enum"
import { Skeleton } from "@/components/ui/skeleton"
import { decodeApiError } from "@/hooks/useApiError"
import { useRemoveOrgIntegration } from "@/shared/queries/org.queries"

import { ProviderHeader } from "@/widgets/integrations/ui/provider-header"
import { ProviderInstances } from "@/widgets/integrations/ui/provider-instances"
import { IntegrationActions } from "@/widgets/integrations/ui/integration-actions"

export default function LinearIntegrationPage() {
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

    const removeMutation = useRemoveOrgIntegration(organizationId)
    const handledUnauthorizedRef = React.useRef(false)

    const {
        data: teams,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ["linear-teams", integrationId],
        queryFn: () => listLinearTeams(integrationId),
        enabled: !!integrationId,
    })

    const errorInfo = error ? decodeApiError(error) : null
    const isUnauthorized = errorInfo?.status === 400

    const handleUnauthorizedAccess = React.useCallback(async () => {
        if (!integrationId || handledUnauthorizedRef.current) {
            return
        }
        handledUnauthorizedRef.current = true

        toast.error("Unauthorized access", {
            description: "Removing the integration. Please reconnect Linear.",
        })

        try {
            await removeMutation.mutateAsync(integrationId)
        } catch {
            // Integration may already be removed.
        }

        router.replace(`/${organizationId}/integrations`)
    }, [integrationId, organizationId, removeMutation, router])

    React.useEffect(() => {
        handledUnauthorizedRef.current = false
    }, [integrationId])

    React.useEffect(() => {
        if (!error || !isUnauthorized) {
            return
        }
        void handleUnauthorizedAccess()
    }, [error, isUnauthorized, handleUnauthorizedAccess])

    const syncMutation = useMutation({
        mutationFn: () => syncLinearTeams(integrationId),
        onSuccess: () => {
            refetch()
        },
    })

    return (
        <div className="space-y-6">
            <ProviderHeader
                icon={SiLinear}
                title="Linear"
                description="Manage teams and sync issues."
                actions={
                    <IntegrationActions
                        provider="Linear"
                        organizationId={organizationId}
                        integrationId={integrationId}
                        getReinstallUrl={getLinearInstallUrl}
                        onSync={async () => {
                            try {
                                await syncMutation.mutateAsync()
                            } catch (err) {
                                if (decodeApiError(err).status === 400) {
                                    await handleUnauthorizedAccess()
                                    return
                                }
                                throw err
                            }
                        }}
                        isSyncing={syncMutation.isPending}
                    />
                }
            />

            <ProviderInstances
                organizationId={organizationId}
                provider={ExternalProvider.LINEAR}
                providerName="Linear"
                icon={SiLinear}
                selectedIntegrationId={integrationId}
                onSelect={setIntegrationId}
            />

            {integrationId ? (
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2)">
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-(--line-2)">
                        <div>
                            <div className="text-sm font-semibold text-(--fg)">Teams</div>
                            <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                                {teams?.length ?? 0} {(teams?.length ?? 0) === 1 ? "team" : "teams"} synced
                            </p>
                        </div>
                    </div>

                    <div className="p-5">
                        {error ? (
                            <div className="rounded-[10px] border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.06)] p-4">
                                <p className="text-sm text-(--danger)">
                                    {isUnauthorized ? "Unauthorized access" : errorInfo?.message}
                                </p>
                                {isUnauthorized ? (
                                    <p className="text-sm text-(--fg-3) mt-1">
                                        Removing the integration. Please reconnect Linear from the integrations page.
                                    </p>
                                ) : null}
                            </div>
                        ) : isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Skeleton
                                        key={i}
                                        className="h-20 bg-(--bg-3) rounded-[12px]"
                                    />
                                ))}
                            </div>
                        ) : !teams?.length ? (
                            <div className="text-center py-10">
                                <p className="text-(--fg) font-medium">No teams yet</p>
                                <p className="text-sm text-(--fg-3) mt-1 max-w-sm mx-auto">
                                    Click Sync to pull teams from Linear.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {teams.map((team) => (
                                    <article
                                        key={team.id}
                                        className="rounded-[12px] border border-(--line-2) bg-(--bg-3) p-4 transition-colors hover:border-(--accent-lime)/30"
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="size-9 shrink-0 grid place-items-center rounded-[10px] border border-(--line-2) bg-(--bg-2) text-(--fg-2)">
                                                <Users className="size-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-(--fg) truncate">
                                                    {team.name}
                                                </p>
                                                <p className="text-xs text-(--fg-3) font-mono mt-0.5 truncate">
                                                    {team.key}
                                                </p>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            ) : null}
        </div>
    )
}
