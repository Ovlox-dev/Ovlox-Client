"use client"

import { useParams } from "next/navigation"

import { useOrgByIdentifier } from "@/shared/queries/org.queries"
import { PageTitle } from "@/components/page-title"
import { NangoConnect } from "@/widgets/integrations/ui/nango-connect"

/**
 * Org-level integrations. All providers connect through Nango now — the per-provider native
 * cards/manage pages were removed. Connect here; pick per-project resources from a project's
 * Integrations tab.
 */
export default function IntegrationsPage() {
  const params = useParams<{ organizationId: string }>()
  const routeIdentifier = params?.organizationId ?? ""
  const { data: orgData, isLoading: orgLoading } = useOrgByIdentifier(routeIdentifier)
  const organizationId = orgData?.organization?.id ?? ""

  return (
    <div className="space-y-8">
      <PageTitle
        title="Integrations"
        description="Connect your tools through Nango to sync activity, projects, and team updates."
      />

      {!orgLoading && organizationId ? (
        <NangoConnect organizationId={organizationId} />
      ) : null}
    </div>
  )
}
