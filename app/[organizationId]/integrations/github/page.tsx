"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getGithubRepositories, syncGithubRepositories } from "@/shared/api/integration-github"
import { useQuery } from "@tanstack/react-query"
import { PageTitle } from "@/components/page-title"

export default function GitHubIntegrationPage() {
  const searchParams = useSearchParams();
  const integrationId = searchParams?.get("integrationId") ?? ""

  const [syncing, setSyncing] = useState(false)

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

  const handleSync = async () => {
    if (!integrationId) { return; }
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
        <PageTitle
          title="GitHub Integration"
          description="Connect GitHub and manage repositories."
        />

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
    </div>
  )
}

