"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { SetupLayout } from "./setup-layout"
import { LinkIntegrationsStep } from "./steps/link-integrations-setup"
import { AddMembersStep } from "./steps/add-members"
import { ReviewStep } from "./steps/review-step"

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
