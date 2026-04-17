"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import SetupLayout from "./SetupLayout";
import LinkIntegrationsStep from "./steps/LinkIntegrationsSetup";
import AddMembersStep from "./steps/AddMembers";
import ReviewStep from "./steps/ReviewStep";

type SetupStep = "integrations" | "members" | "review";

export default function ProjectSetupPage() {
    const params = useParams<{
        organizationId: string;
        projectId: string;
    }>();

    const organizationId = params?.organizationId ?? "";
    const projectId = params?.projectId ?? "";
    const [step, setStep] = useState<SetupStep>("integrations");

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