"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import { IoLogoGithub } from "react-icons/io5"
import type { IconType } from "react-icons"
import { SiDiscord, SiJira, SiLinear, SiSlack } from "react-icons/si"

import { cn } from "@/lib/utils"

import { ExternalProvider, IntegrationStatus } from "@/types/enum"
import type { OrgIntegrationStatusItem } from "@/types/api-types"
import { listIntegrations, addIntegrations } from "@/shared/api/org"
import { getGithubInstallUrl, getGithubOAuthUrl } from "@/shared/api/integration-github"

import { PageTitle } from "@/components/page-title"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils"
import { toast } from "sonner"
import { getDiscordOAuthUrl } from "@/shared/api/integration-discord"
import { getSlackInstallUrl } from "@/shared/api/integration-slack"
import { getJiraInstallUrl } from "@/shared/api/integration-jira"
import { getLinearInstallUrl } from "@/shared/api/integration-linear"

const ACCENT = "#55C6F0"

type IntegrationToolDef = {
  id: string
  name: string
  icon: IconType
  description: string
  install?: boolean
  connect: boolean
  managePath?: string
  comingSoon?: boolean
}

const INTEGRATION_CATALOG: IntegrationToolDef[] = [
  {
    id: "github",
    name: "GitHub",
    icon: IoLogoGithub,
    description: "Connect your repositories and pull requests.",
    connect: true,
    install: true,
    managePath: "github",
  },
  {
    id: "jira",
    name: "Jira",
    icon: SiJira,
    description: "Sync issues and sprint progress automatically.",
    connect: false,
    install: true,
    managePath: "jira",
  },
  {
    id: "slack",
    name: "Slack",
    icon: SiSlack,
    description: "Send updates and notifications to your team channels.",
    connect: false,
    install: true,
    managePath: "slack",
  },
  {
    id: "linear",
    name: "Linear",
    icon: SiLinear,
    description: "Track issues, manage sprints, and plan product development.",
    install: true,
    connect: false,
    managePath: "linear",
  },
  {
    id: "discord",
    name: "Discord",
    icon: SiDiscord,
    description: "Communicate with your team through channels and voice chat.",
    install: false,
    connect: true,
    managePath: "discord",
  },
]

function integrationForApp(integrations: OrgIntegrationStatusItem[], appId: string) {
  return integrations.find((i) => String(i.app).toLowerCase() === appId) ?? null
}

function isToolInSetup(app: IntegrationToolDef, integrations: OrgIntegrationStatusItem[], addedIds: ReadonlySet<string>) {
  return addedIds.has(app.id) || Boolean(integrationForApp(integrations, app.id))
}

export function StatusDot({
  connected,
  processing,
}: {
  connected: boolean
  processing: boolean
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-3 shrink-0 rounded-full",
        processing && "animate-pulse bg-amber-400",
        !processing && connected && "bg-[#55C6F0] shadow-[0_0_10px_3px_rgba(85,198,240,0.55)]",
        !processing && !connected && "bg-zinc-600"
      )}
    />
  )
}

export default function IntegrationsPage() {
  const params = useParams<{ organizationId: string }>()
  const router = useRouter()
  const organizationId = params?.organizationId ?? ""
  const [pendingAppId, setPendingAppId] = useState<string | null>(null)
  const [connectingAppId, setConnectingAppId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState(() => new Set<string>())

  const { data: integrationsData, isLoading: integrationsLoading, error: integrationsError, refetch } = useQuery({
    queryKey: ["listIntegrations", organizationId],
    queryFn: async () => {
      const res = await listIntegrations(organizationId)
      return res ?? null
    },
  })

  const integrations = useMemo(() => integrationsData ?? [], [integrationsData])

  const setupTools = useMemo(
    () => INTEGRATION_CATALOG.filter((t) => isToolInSetup(t, integrations, addedIds)),
    [addedIds, integrations]
  )
  const availableTools = useMemo(
    () => INTEGRATION_CATALOG.filter((t) => !isToolInSetup(t, integrations, addedIds)),
    [addedIds, integrations]
  )

  const basePath = `/${encodeURIComponent(organizationId)}/integrations`

  const handleAddToSetup = async (appId: string) => {
    setPendingAppId(appId)
    try {
      if (organizationId) {
        await addIntegrations(organizationId, { provider: appId as ExternalProvider, label: appId })
      }
      setAddedIds((prev) => {
        const next = new Set(prev)
        next.add(appId)
        return next
      })
      refetch()
    } finally {
      setPendingAppId(null)
    }
  }

  const handleInstall = async (appId: string, integrationId: string) => {
    if (!organizationId) { return; }
    if (appId === "github") {
      try {
        setPendingAppId("github")
        const res = await getGithubInstallUrl(organizationId)
        if (res?.url) {
          window.location.href = res.url
        }
      } finally {
        setPendingAppId(null)
      }
    }

    if (appId === "slack") {
      try {
        setPendingAppId("slack")
        const res = await getSlackInstallUrl(organizationId, integrationId)
        if (res?.url) {
          window.location.href = res.url
        }
      } finally {
        setPendingAppId(null)
      }
    }

    if (appId === "jira") {
      try {
        setPendingAppId("jira")
        const res = await getJiraInstallUrl(organizationId, integrationId)
        if (res?.url) {
          window.location.href = res.url
        }
      } finally {
        setPendingAppId(null)
      }
    }

    if (appId === "linear") {
      try {
        setPendingAppId("linear")
        const res = await getLinearInstallUrl(organizationId, integrationId)
        if (res?.url) {
          window.location.href = res.url
        }
      } finally {
        setPendingAppId(null)
      }
    }
  }

  const handleConnect = async (appId: string, integrationId: string) => {
    if (!organizationId) { return; }

    if (appId === "github") {
      try {
        setConnectingAppId("github")
        const res = await getGithubOAuthUrl(organizationId)
        if (res?.url) {
          window.location.href = res.url
        }
      } catch (error: unknown) {
        toast.error(formatAuthErrorMessage(error))
      } finally {
        setConnectingAppId(null)
      }
    }

    if (appId === "discord") {
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
  }

  const renderActions = (app: IntegrationToolDef, inSetup: boolean) => {
    const integration = integrationForApp(integrations, app.id)
    const status = integration?.status ?? IntegrationStatus.NOT_CONNECTED
    const connected = status === IntegrationStatus.CONNECTED
    const processing = status === IntegrationStatus.PROCESSING
    const oauthConnected = integration?.oauthStatus === "CONNECTED" || Boolean(integration?.oauthConnectedAt)
    const pending = pendingAppId === app.id

    const primaryClassName = "font-semibold text-black hover:opacity-90"
    const primaryStyle = { backgroundColor: ACCENT }

    if (connected && app.managePath) {
      const integrationId = integration?.integrationId ?? ""
      return (
        <>
          <Button
            type="button"
            variant="ghost"
            className="border-[0.5px] border-accent  text-accent hover:bg-accent hover:text-white"
            onClick={() =>
              router.push(
                `${basePath}/${app.managePath}?integrationId=${encodeURIComponent(integrationId)}`
              )
            }
          >
            Manage
          </Button>
        </>
      )
    }

    if (!inSetup) {
      return (
        <Button
          type="button"
          variant="secondary"
          className="bg-zinc-800 font-medium text-white hover:bg-zinc-700"
          onClick={() => handleAddToSetup(app.id)}
        >
          Add
        </Button>
      )
    }

    if (app.comingSoon) {
      return (
        <Button type="button" className={primaryClassName} style={primaryStyle} disabled title="Coming soon">
          {app.install ? "Install" : "Connect"}
        </Button>
      )
    }

    const showInstall = Boolean(app.install)
    const showConnect = Boolean(app.connect)

    if (showInstall && showConnect) {
      const connectInProgress = connectingAppId === app.id
      const showConnectedOnConnect = oauthConnected || connected || processing
      return (
        <>
          <Button
            type="button"
            className={primaryClassName}
            style={primaryStyle}
            onClick={() => handleConnect(app.id, integration?.integrationId ?? "")}
            disabled={showConnectedOnConnect || connectInProgress || !integration?.integrationId}
          >
            {connectInProgress ? "Connecting..." : showConnectedOnConnect ? "Connected" : "Connect"}
          </Button>
          <Button
            type="button"
            className={primaryClassName}
            style={primaryStyle}
            onClick={() => void handleInstall(app.id, integration?.integrationId ?? "")}
            disabled={pending || !integration?.integrationId || !oauthConnected}
          >
            {pending ? "Installing..." : "Install"}
          </Button>
        </>
      )
    }

    if (showInstall) {
      return (
        <Button
          type="button"
          className={primaryClassName}
          style={primaryStyle}
          onClick={() => void handleInstall(app.id, integration?.integrationId ?? "")}
          disabled={pending || processing || !integration?.integrationId}
        >
          {pending || processing ? "Installing..." : "Install"}
        </Button>
      )
    }

    if (showConnect) {
      const connectInProgress = connectingAppId === app.id
      const showConnectedOnConnect = oauthConnected || connected || processing
      return (
        <Button
          type="button"
          className={primaryClassName}
          style={primaryStyle}
          onClick={() => handleConnect(app.id, integration?.integrationId ?? "")}
          disabled={showConnectedOnConnect || connectInProgress || !app.managePath || !integration?.integrationId}
        >
          {connectInProgress ? "Connecting..." : showConnectedOnConnect ? "Connected" : "Connect"}
        </Button>
      )
    }

    return null
  }

  const renderCard = (app: IntegrationToolDef) => {
    const Icon = app.icon
    const integration = integrationForApp(integrations, app.id)
    const status = integration?.status ?? IntegrationStatus.NOT_CONNECTED
    const connected = status === IntegrationStatus.CONNECTED
    const processing = status === IntegrationStatus.PROCESSING
    const inSetup = isToolInSetup(app, integrations, addedIds)

    const card = (
      <Card
        key={app.id}
        className={cn(
          "flex h-full flex-col rounded-xl border border-white/10 bg-[#0D0D0D] shadow-none",
        )}
      >
        <CardContent className="space-y-2 ">
          <div className="flex items-start justify-between">
            <Icon className="text-white size-8" />
            <StatusDot connected={connected} processing={processing} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-white">{app.name}</h2>
            <p className="text-sm text-[#79868C]">{app.description}</p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">{renderActions(app, inSetup)}</div>
        </CardContent>
      </Card>
    )


    return (
      <div key={app.id} className="block h-full">
        {card}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageTitle
        title="Setup Integrations"
        description="Connect your tools to sync activity, projects, and team updates."
      />

      {integrationsLoading ? <p className="text-sm text-[#888888]">Loading integrations...</p> : null}
      {!integrationsLoading && integrationsError ? (
        <p className="text-sm text-destructive">
          {integrationsError instanceof Error ? integrationsError.message : "Failed to load integrations"}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {setupTools.map((app) => renderCard(app))}
      </div>

      {availableTools.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-white">Available Integrations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableTools.map((app) => renderCard(app))}
          </div>
        </section>
      ) : null}
    </div>
  )
}



// "use client"

// import { useMemo, useState } from "react"
// import { useParams, useRouter } from "next/navigation"
// import { useQuery } from "@tanstack/react-query"

// import { PageTitle } from "@/components/page-title"
// import { IntegrationStatus } from "@/types/enum"
// import type { OrgIntegrationStatusItem } from "@/types/api-types"
// import { listIntegrations, addIntegrations } from "@/shared/api/org"
// import { integrationCardRegistry } from "./registry"

// function resolveIntegrationState(
//   appId: string,
//   integrations: OrgIntegrationStatusItem[],
//   addedIds: Set<string>
// ) {
//   const integration =
//     integrations.find(i => String(i.app).toLowerCase() === appId) ?? null

//   return {
//     status: integration?.status ?? IntegrationStatus.NOT_CONNECTED,
//     integrationId: integration?.integrationId ?? "",
//     inSetup: addedIds.has(appId) || Boolean(integration),
//   }
// }

// export default function IntegrationsPage() {
//   const params = useParams<{ organizationId: string }>()
//   const router = useRouter()
//   const organizationId = params.organizationId

//   const [pendingAppId, setPendingAppId] = useState<string | null>(null)
//   const [connectingAppId] = useState<string | null>(null)
//   const [addedIds, setAddedIds] = useState(new Set<string>())

//   const { data } = useQuery({
//     queryKey: ["integrations", organizationId],
//     queryFn: () => listIntegrations(organizationId),
//   })

//   const integrations = useMemo(() => data ?? [], [data])
//   const basePath = `/${organizationId}/integrations`

//   const handleAdd = async (appId: string) => {
//     setPendingAppId(appId)
//     await addIntegrations(organizationId, { provider: appId as any, label: appId })
//     setAddedIds(prev => new Set(prev).add(appId))
//     setPendingAppId(null)
//   }

//   return (
//     <div className="space-y-8">
//       <PageTitle
//         title="Setup Integrations"
//         description="Connect your tools to sync activity and updates."
//       />

//       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
//         {Object.keys(integrationCardRegistry).map(appId => {
//           const Card = integrationCardRegistry[appId]
//           const state = resolveIntegrationState(
//             appId,
//             integrations,
//             addedIds
//           )

//           return (
//             <Card
//               key={appId}
//               status={state.status}
//               integrationId={state.integrationId}
//               inSetup={state.inSetup}
//               pending={pendingAppId === appId}
//               connecting={connectingAppId === appId}
//               onAdd={() => handleAdd(appId)}
//               onInstall={() => { }}
//               onConnect={() => { }}
//               onManage={() =>
//                 router.push(
//                   `${basePath}/${appId}?integrationId=${state.integrationId}`
//                 )
//               }
//             />
//           )
//         })}
//       </div>
//     </div>
//   )
// }