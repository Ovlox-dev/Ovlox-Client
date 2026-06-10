"use client"

import { ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NangoConnect } from "@/widgets/integrations/ui/nango-connect"
import { useGetProject } from "@/entities/project"

/**
 * Connect-apps step. Integrations are connected through Nango: authorize in the popup, then use
 * "Select" on a connection to choose the channels/projects/teams to ingest for this project.
 */
export function LinkIntegrationsStep({
    organizationId,
    projectId,
    onNext,
}: {
    organizationId: string
    projectId: string
    onNext: () => void
}) {
    // The wizard may pass slugs; Nango session tags need the canonical UUIDs.
    const { data: project } = useGetProject(organizationId, projectId)
    const orgUuid = project?.organizationId ?? organizationId
    const projectUuid = project?.id ?? projectId

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-(--fg)">Connect apps</h3>
                    <p className="text-sm text-(--fg-2)">
                        Connect your tools through Nango, then pick the resources to import for this project.
                    </p>
                </div>
                <Button onClick={onNext}>
                    Continue <ChevronRight className="size-4" />
                </Button>
            </div>

            {orgUuid && projectUuid ? (
                <NangoConnect organizationId={orgUuid} projectId={projectUuid} />
            ) : null}
        </div>
    )
}
