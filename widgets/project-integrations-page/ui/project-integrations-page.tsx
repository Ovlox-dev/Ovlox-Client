"use client";

import { useParams } from "next/navigation";
import { Plug } from "lucide-react";

import { NangoConnect } from "@/widgets/integrations/ui/nango-connect";
import { useGetProject } from "@/entities/project";

/**
 * Project-scoped integrations surface. Reuses the org-level Nango connect panel but passes the
 * current `projectId`, so connecting a tool tags the session with this project and the per-connection
 * "Select" action wires channel/project/team selection for bulk ingestion into THIS project.
 */
export function ProjectIntegrationsPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    // Nango session tags must be the canonical UUIDs (the URL segments may be slugs), so resolve the
    // project and use its real ids for scoping the connection + per-project resource selection.
    const { data: project } = useGetProject(organizationId, projectId);
    const orgUuid = project?.organizationId ?? organizationId;
    const projectUuid = project?.id ?? projectId;

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                    <Plug className="size-6" /> Integrations
                </h1>
                <p className="text-muted-foreground text-sm">
                    Connect tools to this project. For Slack/Discord pick the channels to ingest; Jira/Linear pick projects/teams.
                </p>
            </header>

            {orgUuid && projectUuid ? (
                <NangoConnect organizationId={orgUuid} projectId={projectUuid} />
            ) : null}
        </div>
    );
}
