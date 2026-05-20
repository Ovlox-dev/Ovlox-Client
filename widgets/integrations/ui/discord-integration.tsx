"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { SiDiscord } from "react-icons/si"
import { toast } from "sonner"

import type { OrgIntegrationStatusItem } from "@/types/api-types"
import { ExternalProvider } from "@/types/enum"

import { addIntegrations } from "@/entities/organization/api/org"
import { getDiscordOAuthUrl } from "@/shared/api/integration-discord"
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils"

import { Button } from "@/components/ui/button"
import {
  computeConnectionFlags,
  computeOauthConnected,
} from "@/widgets/integrations/model/integration-utils"
import { IntegrationCardShell } from "@/widgets/integrations/ui/integration-card-shell"

export function DiscordIntegration({
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
  const [connectingAppId, setConnectingAppId] = useState<string | null>(null)
  const [pendingAdd, setPendingAdd] = useState(false)

  const { connected, processing } = computeConnectionFlags(integration)
  const oauthConnected = computeOauthConnected(integration)

  const integrationId = integration?.integrationId ?? ""
  const connectInProgress = connectingAppId === "discord"

  // Discord should allow "Manage" immediately after OAuth connects (even while processing).
  const showManage = oauthConnected || connected
  const showConnectedOnConnect = oauthConnected || connected || processing

  const handleAddToSetup = async () => {
    setPendingAdd(true)
    try {
      if (!organizationId) return
      await addIntegrations(organizationId, { provider: ExternalProvider.DISCORD, label: "Discord" })
      onAddedToSetup("discord")
      refetchIntegrations()
    } catch (error: unknown) {
      toast.error(formatAuthErrorMessage(error))
    } finally {
      setPendingAdd(false)
    }
  }

  const handleConnect = async () => {
    if (!organizationId) return
    if (!integrationId) {
      toast.error("Discord integration is not ready yet. Please wait a moment and try again.")
      return
    }
    try {
      setConnectingAppId("discord")
      const res = await getDiscordOAuthUrl(organizationId, integrationId)
      if (res?.url) window.location.href = res.url
    } catch (error: unknown) {
      toast.error(formatAuthErrorMessage(error))
    } finally {
      setConnectingAppId(null)
    }
  }

  const actions = showManage ? (
    <Button
      type="button"
      variant="outline"
      onClick={() => router.push(`${basePath}/discord?integrationId=${encodeURIComponent(integrationId)}`)}
    >
      Manage
    </Button>
  ) : !inSetup ? (
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleAddToSetup()}
      disabled={pendingAdd}
    >
      {pendingAdd ? "Adding..." : "Add"}
    </Button>
  ) : (
    <Button
      type="button"
      onClick={() => void handleConnect()}
      disabled={showConnectedOnConnect || connectInProgress || !integrationId}
    >
      {connectInProgress ? "Connecting..." : showConnectedOnConnect ? "Connected" : "Connect"}
    </Button>
  )

  return (
    <IntegrationCardShell
      icon={SiDiscord}
      title="Discord"
      description="Communicate with your team through channels and voice chat."
      connected={connected}
      processing={processing}
      actions={actions}
    />
  )
}
