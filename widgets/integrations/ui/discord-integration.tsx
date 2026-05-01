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

const ACCENT = "#55C6F0"

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

  const { connected, processing } = computeConnectionFlags(integration)
  const oauthConnected = computeOauthConnected(integration)

  const integrationId = integration?.integrationId ?? ""
  const connectInProgress = connectingAppId === "discord"

  const primaryClassName = "font-semibold text-black hover:opacity-90"
  const primaryStyle = { backgroundColor: ACCENT }

  // Discord should allow "Manage" immediately after OAuth connects (even while processing).
  const showManage = oauthConnected || connected

  const handleAddToSetup = async () => {
    try {
      if (!organizationId) { return }

      await addIntegrations(organizationId, { provider: ExternalProvider.DISCORD, label: "Discord" })
      onAddedToSetup("discord")
      refetchIntegrations()
    } catch (error: unknown) {
      toast.error(formatAuthErrorMessage(error))
    }
  }

  const handleConnect = async () => {
    if (!organizationId) { return }
    if (!integrationId) {
      toast.error("Discord integration is not ready yet. Please wait a moment and try again.")
      return
    }

    try {
      setConnectingAppId("discord")
      const res = await getDiscordOAuthUrl(organizationId, integrationId)
      if (res?.url) {
        window.location.href = res.url
      }
    } catch (error: unknown) {
      toast.error(formatAuthErrorMessage(error))
    } finally {
      setConnectingAppId(null)
    }
  }

  const showConnectedOnConnect = oauthConnected || connected || processing

  const actions = showManage ? (
    <Button
      type="button"
      variant="ghost"
      className="border-[0.5px] border-accent  text-accent hover:bg-accent hover:text-white"
      onClick={() => router.push(`${basePath}/discord?integrationId=${encodeURIComponent(integrationId)}`)}
    >
      Manage
    </Button>
  ) : !inSetup ? (
    <Button
      type="button"
      variant="secondary"
      className="bg-zinc-800 font-medium text-white hover:bg-zinc-700"
      onClick={() => void handleAddToSetup()}
    >
      Add
    </Button>
  ) : (
    <Button
      type="button"
      className={primaryClassName}
      style={primaryStyle}
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

