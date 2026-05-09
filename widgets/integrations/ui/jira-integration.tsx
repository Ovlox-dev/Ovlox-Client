"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { toast } from "sonner"
import { SiJira } from "react-icons/si"

import type { OrgIntegrationStatusItem } from "@/types/api-types"
import { ExternalProvider } from "@/types/enum"

import { addIntegrations } from "@/entities/organization/api/org"
import { getJiraInstallUrl } from "@/shared/api/integration-jira"
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils"

import { Button } from "@/components/ui/button"
import { computeConnectionFlags } from "@/widgets/integrations/model/integration-utils"
import { IntegrationCardShell } from "@/widgets/integrations/ui/integration-card-shell"

export function JiraIntegration({
  organizationId,
  basePath,
  integration,
  inSetup,
  onAddedToSetup,
  refetchIntegrations,
}: {
  organizationId: string
  basePath: string
  integration: OrgIntegrationStatusItem | null
  inSetup: boolean
  onAddedToSetup(appId: string): void
  refetchIntegrations(): void
}) {
  const router = useRouter()
  const [pendingAppId, setPendingAppId] = useState<string | null>(null)

  const { connected, processing } = computeConnectionFlags(integration)
  const integrationId = integration?.integrationId ?? ""
  const pending = pendingAppId === "jira"

  const showManage = connected

  const handleAddToSetup = async () => {
    setPendingAppId("jira")
    try {
      if (!organizationId) return
      await addIntegrations(organizationId, { provider: ExternalProvider.JIRA, label: "Jira" })
      onAddedToSetup("jira")
      refetchIntegrations()
    } catch (error: unknown) {
      toast.error(formatAuthErrorMessage(error))
    } finally {
      setPendingAppId(null)
    }
  }

  const handleInstall = async () => {
    if (!organizationId) return
    if (!integrationId) return
    try {
      setPendingAppId("jira")
      const res = await getJiraInstallUrl(organizationId, integrationId)
      if (res?.url) window.location.href = res.url
    } finally {
      setPendingAppId(null)
    }
  }

  const actions = showManage ? (
    <Button
      type="button"
      variant="outline"
      onClick={() => router.push(`${basePath}/jira?integrationId=${encodeURIComponent(integrationId)}`)}
    >
      Manage
    </Button>
  ) : !inSetup ? (
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleAddToSetup()}
      disabled={pending}
    >
      {pending ? "Adding..." : "Add"}
    </Button>
  ) : (
    <Button
      type="button"
      onClick={() => void handleInstall()}
      disabled={pending || processing || !integrationId}
    >
      {pending || processing ? "Installing..." : "Install"}
    </Button>
  )

  return (
    <IntegrationCardShell
      icon={SiJira}
      title="Jira"
      description="Sync issues and sprint progress automatically."
      connected={connected}
      processing={processing}
      actions={actions}
    />
  )
}
