import { ExternalProvider, IntegrationStatus } from "@/types/enum"
import type { OrgIntegrationStatusItem } from "@/types/api-types"

export function integrationForApp(integrations: OrgIntegrationStatusItem[], appId: string) {
  return integrations.find((i) => String(i.app).toLowerCase() === appId) ?? null
}

export function computeOauthConnected(integration: OrgIntegrationStatusItem | null | undefined) {
  return (
    String(integration?.oauthStatus ?? "").toUpperCase() === "CONNECTED" ||
    Boolean(integration?.oauthConnectedAt) ||
    Boolean(integration?.oauthAccount) ||
    Boolean(integration?.externalAccountId)
  )
}

export function computeConnectionFlags(integration: OrgIntegrationStatusItem | null | undefined) {
  const status = integration?.status ?? IntegrationStatus.NOT_CONNECTED
  const connected = status === IntegrationStatus.CONNECTED
  const processing = status === IntegrationStatus.PROCESSING
  return { status, connected, processing }
}

export function isDiscordIntegration(integration: OrgIntegrationStatusItem | null | undefined, appId?: string) {
  return (
    appId === "discord" ||
    String(integration?.app ?? "").toUpperCase() === ExternalProvider.DISCORD
  )
}

