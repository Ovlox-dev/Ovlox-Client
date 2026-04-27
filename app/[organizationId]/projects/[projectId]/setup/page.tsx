"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SetupLayout from "./SetupLayout";
import LinkIntegrationsStep from "./steps/LinkIntegrationsSetup";
import AddMembersStep from "./steps/AddMembers";
import ReviewStep from "./steps/ReviewStep";
import { listIntegrations } from "@/shared/api/org";
import { syncGithubRepositories } from "@/shared/api/integration-github";
import { syncJiraProjects } from "@/shared/api/integration-jira";
import { syncLinearTeams } from "@/shared/api/integration-linear";
import { syncSlackChannels } from "@/shared/api/integration-slack";
import { ExternalProvider, IntegrationStatus } from "@/types/enum";

type SetupStep = "integrations" | "members" | "review";

export default function ProjectSetupPage() {
    const params = useParams<{
        organizationId: string;
        projectId: string;
    }>();

    const organizationId = params?.organizationId ?? "";
    const projectId = params?.projectId ?? "";
    const [step, setStep] = useState<SetupStep>("integrations");

    useEffect(() => {
        if (!organizationId) { return; }

        let cancelled = false;

        (async () => {
            try {
                const integrations = await listIntegrations(organizationId);
                if (cancelled) { return; }

                const connected = integrations.filter((i) => i.status === IntegrationStatus.CONNECTED);

                const syncPromises: Array<Promise<unknown>> = [];
                for (const i of connected) {
                    switch (i.app) {
                        case ExternalProvider.GITHUB:
                            syncPromises.push(syncGithubRepositories(i.integrationId, projectId || undefined));
                            break;
                        case ExternalProvider.JIRA:
                            syncPromises.push(syncJiraProjects(i.integrationId));
                            break;
                        case ExternalProvider.LINEAR:
                            syncPromises.push(syncLinearTeams(i.integrationId));
                            break;
                        case ExternalProvider.SLACK:
                            syncPromises.push(syncSlackChannels(i.integrationId));
                            break;
                        case ExternalProvider.DISCORD:
                            // Discord channel sync requires a selected guild; handled in the Discord card UI.
                            break;
                        default:
                            break;
                    }
                }

                await Promise.all(syncPromises);
            } catch {
                // best-effort sync; UI should remain usable even if sync fails
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [organizationId, projectId]);

    
    return (
        <SetupLayout step={step}>
            {step === "integrations" && (
                <LinkIntegrationsStep
                    organizationId={organizationId}
                    projectId={projectId}
                    onNext={() => setStep("members")}
                />
            )}

            {step === "members" && (
                <AddMembersStep
                    organizationId={organizationId}
                    projectId={projectId}
                    onNext={() => setStep("review")}
                    onBack={() => setStep("integrations")}
                />
            )}

            {step === "review" && (
                <ReviewStep
                    organizationId={organizationId}
                    projectId={projectId}
                    onBack={() => setStep("members")}
                />
            )}
        </SetupLayout>
    );
}