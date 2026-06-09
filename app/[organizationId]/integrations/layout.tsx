"use client"

import { useParams, usePathname } from "next/navigation"

import { IntegrationProviderGuard } from "@/widgets/integrations/ui/integration-provider-guard"

const PROVIDER_SEGMENTS = new Set(["github", "slack", "jira", "linear", "discord"])

function providerIdFromPathname(pathname: string | null): string | null {
  if (!pathname) { return null }
  const match = pathname.match(/\/integrations\/([^/?#]+)/)
  if (!match) { return null }
  const segment = match[1].toLowerCase()
  return PROVIDER_SEGMENTS.has(segment) ? segment : null
}

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ organizationId: string }>()
  const pathname = usePathname()
  const orgRouteIdentifier = params?.organizationId ?? ""
  const providerId = providerIdFromPathname(pathname)

  if (!providerId) { return children }

  return (
    <IntegrationProviderGuard
      orgRouteIdentifier={orgRouteIdentifier}
      providerId={providerId}
    >
      {children}
    </IntegrationProviderGuard>
  )
}
