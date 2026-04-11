"use client"

import { useState } from "react"
import { useParams, useSearchParams } from "next/navigation"

import { IoLogoGithub } from "react-icons/io5"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getGithubInstallUrl, getGithubOAuthUrl, getGithubRepositories, syncGithubRepositories } from "@/shared/api/integration-github"
import { useQuery } from "@tanstack/react-query"
import { getOrgIntegrationStatusByIntegrationId } from "@/shared/api/org"

export default function GitHubIntegrationPage() {
  const params = useParams<{ organizationId: string }>()
  const searchParams = useSearchParams();
  const organizationId = params?.organizationId ?? ""
  const integrationId = searchParams?.get("integrationId") ?? ""

  console.log("integrationId", integrationId);
  console.log("organizationId", organizationId);

  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [installing, setInstalling] = useState(false)

  const { data: integrationData, isLoading: integrationLoading, error: integrationError } = useQuery({
    queryKey: ["getOrgIntegrationStatusByIntegrationId", organizationId, integrationId],
    queryFn: async () => {
      const res = await getOrgIntegrationStatusByIntegrationId(organizationId, integrationId ?? "")
      return res ?? null
    },
    enabled: !!integrationId,
  })

  console.log(integrationData);


  const {
    data: repositoriesData,
    isLoading: repositoriesLoading,
    error: repositoriesError,
    refetch: refetchRepositories,
  } = useQuery({
    queryKey: ["getGithubRepositories", integrationId],
    queryFn: async () => {
      const res = await getGithubRepositories(integrationId ?? "")
      return res ?? null
    },
    enabled: !!integrationId,
  })

  console.log("Integration data", integrationData);
  console.log("Repositories data", repositoriesData);

  const handleConnectOAuth = async () => {
    if (!organizationId) return
    try {
      setConnecting(true)
      const res = await getGithubOAuthUrl(organizationId)
      if (res?.url) window.location.href = res.url
    } finally {
      setConnecting(false)
    }
  }

  const handleInstall = async () => {
    if (!organizationId) return
    try {
      setInstalling(true)
      const res = await getGithubInstallUrl(organizationId)
      if (res?.url) window.location.href = res.url
    } finally {
      setInstalling(false)
    }
  }

  const handleSync = async () => {
    if (!integrationId) return
    try {
      setSyncing(true)
      await syncGithubRepositories(integrationId)
      await refetchRepositories()
    } finally {
      setSyncing(false)
    }
  }

  const repos = repositoriesData?.data ?? []

  return (
    <div className=" space-y-6">
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
          {integrationData?.oauthStatus === "CONNECTED" ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>
          ) : (
            <Badge variant="secondary" className="border-border">Not connected</Badge>
          )
          }
        </div>
      </div>

      {integrationLoading ? <p className="text-sm text-muted-foreground">Loading status...</p> : null}
      {!integrationLoading && integrationError ? <p className="text-sm text-destructive">{integrationError.message}</p> : null}

      {integrationData?.status !== "CONNECTED" ? (
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect GitHub to start syncing repositories and viewing activity.

              {integrationData?.oauthStatus}
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => void handleConnectOAuth()}
                disabled={connecting || integrationData?.oauthStatus === "CONNECTED"}
              >
                {integrationData?.oauthStatus === "CONNECTED" ? "Connected" : connecting ? "Redirecting..." : "Connect GitHub"}
              </Button>
              <Button
                variant="default"
                onClick={() => void handleInstall()}
                disabled={installing}
              >
                {installing ? "Redirecting..." : "Install Github App"}
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

            {repositoriesLoading ? (
              <p className="text-sm text-muted-foreground">Loading repositories...</p>
            ) : repos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repositories found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {repos.map((r) => (
                  <Card key={String(r.id)} className="border-border/60">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.name}</div>
                          {r.url ? (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-muted-foreground hover:underline break-all"
                            >
                              {r.url}
                            </a>
                          ) : null}
                        </div>
                        {/* <Badge variant="secondary" className="border-border shrink-0">
                          {r.default_branch ?? "—"}
                        </Badge> */}
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        <span>Updated: {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}</span>
                        <span>Pushed: {r.pushed_at ? new Date(r.pushed_at).toLocaleString() : "—"}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {repositoriesError ? <p className="text-sm text-destructive">{repositoriesError.message}</p> : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

