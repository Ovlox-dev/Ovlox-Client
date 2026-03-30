"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IoLogoGithub } from "react-icons/io5"
import { SiDiscord, SiJira, SiLinear, SiSlack } from "react-icons/si"
import { listIntegrations } from "@/services/integration.service"
import { getGithubInstallUrl } from "@/shared/api/integration-github"
import type { OrgIntegrationStatusItem } from "@/types/api-types"
import { IntegrationStatus } from "@/types/enum"

const APP_CATALOG = [
  { id: "github", name: "GitHub", icon: IoLogoGithub },
  { id: "slack", name: "Slack", icon: SiSlack },
  { id: "jira", name: "Jira", icon: SiJira },
  { id: "discord", name: "Discord", icon: SiDiscord },
  { id: "linear", name: "Linear", icon: SiLinear },
]

function integrationForApp(integrations: OrgIntegrationStatusItem[], appId: string) {
  return integrations.find((i) => String(i.app).toLowerCase() === appId) ?? null
}

export default function IntegrationsPage() {
  const params = useParams<{ organizationId: string }>()
  const router = useRouter()
  const organizationId = params?.organizationId ?? ""

  const [integrations, setIntegrations] = React.useState<OrgIntegrationStatusItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [connectingAppId, setConnectingAppId] = React.useState<string | null>(null)

  React.useEffect(() => {
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

  const handleConnectGithub = async () => {
    if (!organizationId) return
    try {
      setConnectingAppId("github")
      const res = await getGithubInstallUrl(organizationId)
      if (res?.url) window.location.href = res.url
    } finally {
      setConnectingAppId(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect tools and view their connection status.</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading integrations...</p> : null}
      {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {APP_CATALOG.map((app) => {
          const Icon = app.icon
          const integration = integrationForApp(integrations, app.id)
          const status = integration?.status ?? IntegrationStatus.NOT_CONNECTED
          const connected = status === IntegrationStatus.CONNECTED

          return (
            <Card key={app.id} className="rounded-2xl border-border bg-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className="size-5" />
                    <div className="font-semibold">{app.name}</div>
                  </div>
                  <Badge variant={connected ? "default" : "secondary"} className="border-border">
                    {connected ? "Connected" : status === IntegrationStatus.PROCESSING ? "Processing" : "Not connected"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {app.id === "github" ? (
                    connected ? (
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/${encodeURIComponent(organizationId)}/integrations/github`)}
                      >
                        View details
                      </Button>
                    ) : (
                      <Button onClick={() => void handleConnectGithub()} disabled={connectingAppId === "github"}>
                        {connectingAppId === "github" ? "Connecting..." : "Connect GitHub"}
                      </Button>
                    )
                  ) : (
                    <Button variant="outline" disabled>
                      Coming soon
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

