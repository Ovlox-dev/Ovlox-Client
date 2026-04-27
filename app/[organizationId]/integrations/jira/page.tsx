"use client"
import { PageTitle } from '@/components/page-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useGetJiraProjects, useSyncJiraProjects } from '@/shared/queries/jira.queries'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

const Jira = () => {
    const searchParams = useSearchParams()
    const integrationId = searchParams?.get("integrationId") ?? ""
    const [syncing, setSyncing] = useState(false)
    const { data: integrationData, isLoading: integrationLoading, error: integrationError } = useGetJiraProjects(integrationId)
    const syncProjectsMutation = useSyncJiraProjects();


    const handleSync = () => {
        setSyncing(true)
        syncProjectsMutation.mutate(
            { integrationId },
            {
                onSuccess: () => {
                    toast.success("Synced Jira projects");
                    setSyncing(false)
                },
                onError: (error) => {
                    toast.error(
                        `Failed to sync Jira projects: ${error instanceof Error ? error.message : "Unknown error"
                        }`
                    );
                    setSyncing(false)
                },
            }
        );
    };

    return (
        <div className="space-y-4">
            <PageTitle
                title="Jira Integration"
                description="Connect Jira and manage issues."
            />
            <Card className="rounded-2xl border-border bg-card">
                <CardContent className=" space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="font-semibold">Projects</div>
                            <p className="text-sm text-muted-foreground">Projects available to this integration.</p>
                        </div>
                        <Button onClick={handleSync} disabled={syncing}>{syncing ? "Syncing..." : "Sync"}</Button>
                    </div>
                    <Separator />
                    {integrationLoading && <div>Loading...</div>}
                    {integrationError && <div>Error: {integrationError.message}</div>}
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {integrationData?.map((project) => (
                                <Card key={project.id} >
                                    <CardContent className="space-y-2 w-full">
                                        <div className="min-w-0">
                                            <div className="space-y-1 flex items-center justify-between gap-2">
                                                <div className="text-lg font-medium truncate">{project.name}</div>
                                                <Badge variant={project.isPrivate ? "secondary" : "default"}>{project.isPrivate ? "Private" : "Public"}</Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-muted-foreground">Key: {project.key}</p>
                                                <p className="text-sm text-muted-foreground">Type: {project.projectTypeKey}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Jira