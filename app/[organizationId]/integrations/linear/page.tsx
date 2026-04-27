"use client"
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'

import { PageTitle } from '@/components/page-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { listLinearTeams, syncLinearTeams } from '@/shared/api/integration-linear'
import { toast } from 'sonner'

const Linear = () => {
  const searchParams = useSearchParams()
  const integrationId = searchParams?.get("integrationId") ?? ""
  const [syncing, setSyncing] = useState(false)

  const { data: teams, isLoading: teamsLoading, error: teamsError, refetch: refetchTeams } = useQuery({
    queryKey: ["linear-teams", integrationId],
    queryFn: () => listLinearTeams(integrationId),
  })

  const syncTeamsMutation = useMutation({
    mutationFn: () => syncLinearTeams(integrationId),
    onSuccess: () => {
      refetchTeams()
      toast.success("Synced Linear teams")
      setSyncing(false)
    },
    onError: (error) => {
      toast.error(`Failed to sync Linear teams: ${error instanceof Error ? error.message : "Unknown error"}`)
      setSyncing(false)
    },
  })



  return (
    <div className="space-y-4">
      <PageTitle
        title="Linear Integration"
        description="Connect Linear and manage teams."
      />
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Teams</div>
              <p className="text-sm text-muted-foreground">Teams available to this integration.</p>
            </div>
            <Button onClick={() => syncTeamsMutation.mutate()} disabled={syncing}>
              {syncing ? "Syncing..." : "Sync Teams"}
            </Button>
          </div>
          <Separator />
          {teamsLoading && <div>Loading...</div>}
          {teamsError && <div>Error: {teamsError.message}</div>}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {teams?.map((team) => (
              <Card key={team.id} className="border-border/60">
                <CardContent className="space-y-2 w-full">
                  <div className="min-w-0">
                    <div className="space-y-1 flex items-center justify-between gap-2">
                      <div className="text-lg font-medium truncate">{team.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Key: {team.key}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Linear