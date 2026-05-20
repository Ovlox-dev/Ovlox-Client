"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { toast } from "sonner"
import { IoLogoGithub } from "react-icons/io5"

import type { OrgIntegrationStatusItem } from "@/types/api-types"
import { ExternalProvider } from "@/types/enum"

import { addIntegrations } from "@/entities/organization/api/org"
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils"
import { getGithubInstallUrl, getGithubOAuthUrl } from "@/entities/github"

import { Button } from "@/components/ui/button"
import { computeConnectionFlags, computeOauthConnected } from "@/widgets/integrations/model/integration-utils"
import { IntegrationCardShell } from "@/widgets/integrations/ui/integration-card-shell"

export function GitHubIntegration({
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
  const [connectingAppId, setConnectingAppId] = useState<string | null>(null)

  const { connected, processing } = computeConnectionFlags(integration)
  const oauthConnected = computeOauthConnected(integration)

  const integrationId = integration?.integrationId ?? ""
  const pending = pendingAppId === "github"
  const connectInProgress = connectingAppId === "github"

  const showManage = connected
  const showConnectedOnConnect = oauthConnected || connected || processing

  const handleAddToSetup = async () => {
    setPendingAppId("github")
    try {
      if (!organizationId) return
      await addIntegrations(organizationId, { provider: ExternalProvider.GITHUB, label: "Personal Account" })
      onAddedToSetup("github")
      refetchIntegrations()
    } catch (error: unknown) {
      toast.error(formatAuthErrorMessage(error))
    } finally {
      setPendingAppId(null)
    }
  }

  const handleConnect = async () => {
    if (!organizationId) return
    try {
      setConnectingAppId("github")
      const res = await getGithubOAuthUrl(organizationId)
      if (res?.url) window.location.href = res.url
    } catch (error: unknown) {
      toast.error(formatAuthErrorMessage(error))
    } finally {
      setConnectingAppId(null)
    }
  }

  const handleInstall = async () => {
    if (!organizationId) return
    try {
      setPendingAppId("github")
      const res = await getGithubInstallUrl(organizationId)
      if (res?.url) window.location.href = res.url
    } finally {
      setPendingAppId(null)
    }
  }

  const actions = showManage ? (
    <Button
      type="button"
      variant="outline"
      onClick={() => router.push(`${basePath}/github?integrationId=${encodeURIComponent(integrationId)}`)}
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
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleConnect()}
        disabled={showConnectedOnConnect || connectInProgress || !integrationId}
      >
        {connectInProgress ? "Connecting..." : showConnectedOnConnect ? "Connected" : "Connect"}
      </Button>
      <Button
        type="button"
        onClick={() => void handleInstall()}
        disabled={pending || !integrationId || !oauthConnected}
      >
        {pending ? "Installing..." : "Install"}
      </Button>
    </>
  )

  return (
    <IntegrationCardShell
      icon={IoLogoGithub}
      title="GitHub"
      description="Connect your repositories and pull requests."
      connected={connected}
      processing={processing}
      actions={actions}
    />
  )
}
