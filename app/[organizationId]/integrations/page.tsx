"use client"

import React, { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

import { IoLogoGithub } from "react-icons/io5"
import type { IconType } from "react-icons"
import { SiDiscord, SiJira, SiLinear, SiSlack } from "react-icons/si"

import { cn } from "@/lib/utils"

import { IntegrationStatus } from "@/types/enum"
import type { OrgIntegrationStatusItem } from "@/types/api-types"
import { listIntegrations } from "@/services/integration.service"
import { getGithubInstallUrl } from "@/shared/api/integration-github"

import { PageTitle } from "@/components/page-title"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const ACCENT = "#55C6F0"

type IntegrationToolDef = {
  id: string
  name: string
  icon: IconType
  description: string
  /**
   * When true, the org already uses this tool — it appears under Setup and shows
   * Connect/Install (not Add). When false, it starts under Available until the user clicks Add.
   */
  toolsUsed: boolean
  /** When true, show an Install control after the tool is in Setup. */
  install?: boolean
  /** When true, show a Connect control after the tool is in Setup. */
  connect: boolean
  /** Relative path under `.../integrations/` for Manage when connected. */
  managePath?: string
  comingSoon?: boolean
}

const INTEGRATION_CATALOG: IntegrationToolDef[] = [
  {
    id: "github",
    name: "GitHub",
    icon: IoLogoGithub,
    description: "Connect your repositories and pull requests.",
    toolsUsed: true,
    connect: true,
    install: true,
    managePath: "github",
  },
  {
    id: "jira",
    name: "Jira",
    icon: SiJira,
    description: "Sync issues and sprint progress automatically.",
    toolsUsed: true,
    connect: true,
    install: false,
    managePath: "jira",
  },
  {
    id: "slack",
    name: "Slack",
    icon: SiSlack,
    description: "Send updates and notifications to your team channels.",
    toolsUsed: true,
    connect: true,
    install: false,
    managePath: "slack",
  },
  {
    id: "linear",
    name: "Linear",
    icon: SiLinear,
    description: "Track issues, manage sprints, and plan product development.",
    toolsUsed: false,
    install: false,
    connect: true,
    managePath: "linear",
  },
  {
    id: "discord",
    name: "Discord",
    icon: SiDiscord,
    description: "Communicate with your team through channels and voice chat.",
    toolsUsed: false,
    connect: true,
    managePath: "discord",
  },
]

function integrationForApp(integrations: OrgIntegrationStatusItem[], appId: string) {
  return integrations.find((i) => String(i.app).toLowerCase() === appId) ?? null
}

function isToolInSetup(app: IntegrationToolDef, addedIds: ReadonlySet<string>) {
  return app.toolsUsed || addedIds.has(app.id)
}

function StatusDot({
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

  const [integrations, setIntegrations] = React.useState<OrgIntegrationStatusItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pendingAppId, setPendingAppId] = React.useState<string | null>(null)
  /** Apps moved from Available → Setup via Add (until persisted by your API). */
  const [addedIds, setAddedIds] = React.useState(() => new Set<string>())

  const setupTools = React.useMemo(
    () => INTEGRATION_CATALOG.filter((t) => isToolInSetup(t, addedIds)),
    [addedIds]
  )
  const availableTools = React.useMemo(
    () => INTEGRATION_CATALOG.filter((t) => !isToolInSetup(t, addedIds)),
    [addedIds]
  )

  useEffect(() => {
    if (!organizationId) return
    let cancelled = false

    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const items = await listIntegrations(organizationId)
        if (!cancelled) setIntegrations(items)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load integrations")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [organizationId])

  const basePath = `/${encodeURIComponent(organizationId)}/integrations`

  const handleAddToSetup = (appId: string) => {
    setAddedIds((prev) => {
      const next = new Set(prev)
      next.add(appId)
      return next
    })
  }

  const handleInstall = async (appId: string) => {
    if (!organizationId) return
    if (appId === "github") {
      try {
        setPendingAppId("github")
        const res = await getGithubInstallUrl(organizationId)
        if (res?.url) window.location.href = res.url
      } finally {
        setPendingAppId(null)
      }
    }
  }

  const handleConnect = React.useCallback(
    (appId: string) => {
      const app = INTEGRATION_CATALOG.find((a) => a.id === appId)
      const path = app?.managePath
      if (path) router.push(`${basePath}/${path}`)
    },
    [basePath, router]
  )

  const renderActions = (app: IntegrationToolDef, inSetup: boolean) => {
    const integration = integrationForApp(integrations, app.id)
    const status = integration?.status ?? IntegrationStatus.NOT_CONNECTED
    const connected = status === IntegrationStatus.CONNECTED
    const processing = status === IntegrationStatus.PROCESSING
    const pending = pendingAppId === app.id

    const primaryClassName = "font-semibold text-black hover:opacity-90"
    const primaryStyle = { backgroundColor: ACCENT }

    if (connected && app.managePath) {
      return (
        <>
          <Button
            type="button"
            variant="ghost"
            className="border-[0.5px] border-accent  text-accent hover:bg-accent hover:text-white"
            onClick={() => router.push(`${basePath}/${app.managePath}`)}
          >
            Manage
          </Button>
          <span className="px-4 py-2 inline-flex items-center gap-2 rounded-md border border-border bg-black text-xs font-medium text-green-500">
            Connected
          </span>
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
      return (
        <>
          <Button
            type="button"
            className={primaryClassName}
            style={primaryStyle}
            onClick={() => handleConnect(app.id)}
            disabled={processing}
          >
            {processing ? "Connecting..." : "Connect"}
          </Button>
          <Button
            type="button"
            className={primaryClassName}
            style={primaryStyle}
            onClick={() => void handleInstall(app.id)}
            disabled={pending || processing}
          >
            {pending || processing ? "Installing..." : "Install"}
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
          onClick={() => void handleInstall(app.id)}
          disabled={pending || processing}
        >
          {pending || processing ? "Installing..." : "Install"}
        </Button>
      )
    }

    if (showConnect) {
      return (
        <Button
          type="button"
          className={primaryClassName}
          style={primaryStyle}
          onClick={() => handleConnect(app.id)}
          disabled={processing || !app.managePath}
        >
          {processing ? "Connecting..." : "Connect"}
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
    const inSetup = isToolInSetup(app, addedIds)

    return (
      <Card
        key={app.id}
        className="flex h-full flex-col rounded-xl border border-white/10 bg-[#0D0D0D] shadow-none"
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
  }

  return (
    <div className="space-y-8">
      <PageTitle
        title="Setup Integrations"
        description="Connect your tools to sync activity, projects, and team updates."
      />

      {loading ? <p className="text-sm text-[#888888]">Loading integrations...</p> : null}
      {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}

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
