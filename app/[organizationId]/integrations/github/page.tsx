"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { IoLogoGithub } from "react-icons/io5"
import { listIntegrations } from "@/services/integration.service"
import { getGithubInstallUrl, getGithubRepositories, syncGithubRepositories } from "@/shared/api/integration-github"
import type { GitHubRepo, OrgIntegrationStatusItem } from "@/types/api-types"
import { IntegrationStatus } from "@/types/enum"

function githubIntegration(integrations: OrgIntegrationStatusItem[]) {
  return integrations.find((i) => String(i.app).toLowerCase() === "github") ?? null
}

export default function GitHubIntegrationPage() {
  const params = useParams<{ organizationId: string }>()
  const router = useRouter()
  const organizationId = params?.organizationId ?? ""

  const [integrations, setIntegrations] = React.useState<OrgIntegrationStatusItem[]>([])
  const [repos, setRepos] = React.useState<GitHubRepo[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadingRepos, setLoadingRepos] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [connecting, setConnecting] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)

  const gh = React.useMemo(() => githubIntegration(integrations), [integrations])
  const isConnected = gh?.status === IntegrationStatus.CONNECTED
  const integrationId = gh?.integrationId ?? null

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

  React.useEffect(() => {
    if (!isConnected || !integrationId) {
      setRepos([])
      return
    }

    let cancelled = false
    const run = async () => {
      try {
        setLoadingRepos(true)
        const data = await getGithubRepositories(integrationId)
        if (!cancelled) setRepos(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load repositories")
      } finally {
        if (!cancelled) setLoadingRepos(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isConnected, integrationId])

  const handleConnect = async () => {
    if (!organizationId) return
    try {
      setConnecting(true)
      const res = await getGithubInstallUrl(organizationId)
      if (res?.url) window.location.href = res.url
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    if (!integrationId) return
    try {
      setSyncing(true)
      await syncGithubRepositories(integrationId)
      const data = await getGithubRepositories(integrationId)
      setRepos(data)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-linear-to-br from-gray-800 to-gray-900 border border-border">
            <IoLogoGithub className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">GitHub Integration</h1>
            <p className="text-sm text-muted-foreground">Connect GitHub and manage repositories.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/${encodeURIComponent(organizationId)}/integrations`)}>
            Back
          </Button>
          {isConnected ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>
          ) : gh?.status === IntegrationStatus.PROCESSING ? (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Processing</Badge>
          ) : (
            <Badge variant="secondary" className="border-border">Not connected</Badge>
          )}
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading status...</p> : null}
      {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!isConnected ? (
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect GitHub to start syncing repositories and viewing activity.
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={() => void handleConnect()} disabled={connecting || gh?.status === IntegrationStatus.PROCESSING}>
                {gh?.status === IntegrationStatus.PROCESSING ? "Connecting..." : connecting ? "Redirecting..." : "Connect GitHub"}
              </Button>
              <Button variant="outline" onClick={() => router.push(`/${encodeURIComponent(organizationId)}/dashboard`)}>
                Go to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Repositories</div>
                <p className="text-sm text-muted-foreground">Repositories available to this integration.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => void handleSync()} disabled={syncing}>
                  {syncing ? "Syncing..." : "Sync repositories"}
                </Button>
              </div>
            </div>

            <Separator />

            {loadingRepos ? (
              <p className="text-sm text-muted-foreground">Loading repositories...</p>
            ) : repos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repositories found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {repos.map((r) => (
                  <Card key={String(r.id)} className="border-border/60">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{r.full_name ?? r.name}</div>
                        <Badge variant="secondary" className="border-border">
                          {r.private ? "Private" : "Public"}
                        </Badge>
                      </div>
                      {r.description ? <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

