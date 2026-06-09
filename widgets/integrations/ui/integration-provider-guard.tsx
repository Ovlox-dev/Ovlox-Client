"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useOrgByIdentifier, useOrgIntegrations } from "@/shared/queries/org.queries"
import { isProviderConnected } from "@/widgets/integrations/model/integration-utils"

export function IntegrationProviderGuard({
  orgRouteIdentifier,
  providerId,
  children,
}: {
  orgRouteIdentifier: string
  providerId: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const { data: orgData, isLoading: orgLoading } = useOrgByIdentifier(orgRouteIdentifier)
  const org = orgData?.organization
  const resolvedOrgId = org?.id ?? ""
  const orgSlug = org?.slug ?? orgRouteIdentifier

  const { data: integrationsData, isLoading: integrationsLoading } = useOrgIntegrations(resolvedOrgId)
  const integrations = integrationsData ?? []
  const connected = isProviderConnected(integrations, providerId)
  const isLoading = orgLoading || integrationsLoading || !resolvedOrgId

  useEffect(() => {
    if (isLoading || connected) { return }
    router.replace(`/${encodeURIComponent(orgSlug)}/integrations`)
  }, [connected, isLoading, orgSlug, router])

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-(--fg-3)">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading integration…
      </div>
    )
  }

  if (!connected) { return null }

  return children
}
