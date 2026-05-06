"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { SetupLayout } from "./setup-layout"
import { LinkIntegrationsStep } from "./steps/link-integrations-setup"
import { AddMembersStep } from "./steps/add-members"
import { ReviewStep } from "./steps/review-step"

import { listIntegrations } from "@/entities/organization/api/org"
import { projectKeys } from "@/entities/project/queries/projects.queries"
import { syncGithubRepositories } from "@/entities/github"
import { syncChannels } from "@/shared/api/integration-discord"
import { syncJiraProjects } from "@/shared/api/integration-jira"
import { syncLinearTeams } from "@/shared/api/integration-linear"
import { syncSlackChannels } from "@/shared/api/integration-slack"
import { ExternalProvider, IntegrationStatus } from "@/types/enum"

type SetupStep = "integrations" | "members" | "review"

function stepFromSearchParams(searchParams: Pick<URLSearchParams, "has">): SetupStep {
    if (searchParams.has("members")) { return "members" }
    if (searchParams.has("review")) { return "review" }
    // default / "?integrations"
    return "integrations"
}

export function ProjectSetupWizard() {
    const params = useParams<{
        organizationId: string
        projectId: string
    }>()

    const organizationId = params?.organizationId ?? ""
    const projectId = params?.projectId ?? ""
    const [step, setStep] = useState<SetupStep>("integrations")
    const queryClient = useQueryClient()
    const router = useRouter()
    const searchParams = useSearchParams()

    const navigateStep = (next: SetupStep) => {
        setStep(next)
        const params = new URLSearchParams(searchParams)
        params.delete("integrations")
        params.delete("members")
        params.delete("review")
        params.set(next, "")
        router.push(`?${params.toString()}`)
    }

    useEffect(() => {
        setStep(stepFromSearchParams(searchParams))
    }, [searchParams])

    useEffect(() => {
        if (!organizationId) { return }

        let cancelled = false

        ; (async () => {
            try {
                const integrations = await listIntegrations(organizationId)
                if (cancelled) { return }

                const connected = integrations.filter((i) => i.status === IntegrationStatus.CONNECTED)

                const syncPromises: Array<Promise<unknown>> = []
                for (const i of connected) {
                    switch (i.app) {
                        case ExternalProvider.GITHUB:
                            syncPromises.push(syncGithubRepositories(i.integrationId, projectId || undefined))
                            break
                        case ExternalProvider.JIRA:
                            syncPromises.push(syncJiraProjects(i.integrationId))
                            break
                        case ExternalProvider.LINEAR:
                            syncPromises.push(syncLinearTeams(i.integrationId))
                            break
                        case ExternalProvider.SLACK:
                            syncPromises.push(syncSlackChannels(i.integrationId))
                            break
                        case ExternalProvider.DISCORD:
                            syncPromises.push(syncChannels(i.integrationId))
                            break
                        default:
                            break
                    }
                }

                await Promise.allSettled(syncPromises)

                if (cancelled) { return }
                await queryClient.invalidateQueries({
                    queryKey: projectKeys.resources(organizationId, projectId),
                })
            } catch {
                // best-effort sync; UI should remain usable even if sync fails
            }
        })()

        return () => {
            cancelled = true
        }
    }, [organizationId, projectId, queryClient])

    return (
        <SetupLayout step={step} onStepChange={navigateStep}>
            {step === "integrations" && (
                <LinkIntegrationsStep
                    organizationId={organizationId}
                    projectId={projectId}
                    onNext={() => navigateStep("members")}
                />
            )}

            {step === "members" && (
                <AddMembersStep
                    organizationId={organizationId}
                    projectId={projectId}
                    onNext={() => navigateStep("review")}
                    onBack={() => navigateStep("integrations")}
                />
            )}

            {step === "review" && (
                <ReviewStep
                    organizationId={organizationId}
                    projectId={projectId}
                    onBack={() => navigateStep("members")}
                />
            )}
        </SetupLayout>
    )
}

