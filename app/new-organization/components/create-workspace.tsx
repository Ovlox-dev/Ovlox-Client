"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent
} from "@/components/ui/card"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { InputField } from "@/components/form-components"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from "@/components/ui/label"
import { IoLogoGithub } from "react-icons/io5";
import { SiDiscord, SiJira, SiLinear, SiSlack } from "react-icons/si"
import Team, { TeamInvitedMember } from "./team"
import { PageTitle } from "@/components/page-title"
import { buildDashboardOrgRoute, getActiveOrgId, setActiveOrgId } from "@/shared/lib/auth/post-auth-org-resolver"
import { createOrg, inviteMember } from "@/shared/api/org"
import { ExternalProvider, PredefinedOrgRole } from "@/types/enum"
import { toast } from "sonner"

const BORDER_SELECTED = "dark:border-accent ring-1 ring-accent"
const BORDER_DEFAULT = "dark:border-border"


export const TOOLS_OPTIONS = [
    {
        id: "github",
        label: "Github",
        description: "Track code updates and connect them to product progress.",
        icon: IoLogoGithub,
    },
    {
        id: "slack",
        label: "Slack",
        description: "Keep team updates and product progress in one place.",
        icon: SiSlack,
    },
    {
        id: "jira",
        label: "Jira",
        description: "Connect issues and tickets to real product goals.",
        icon: SiJira,
    },
    {
        id: "linear",
        label: "Linear",
        description: "Sync product cycles and milestones with your workspace.",
        icon: SiLinear,
    },
    {
        id: "discord",
        label: "Discord",
        description: "Bring team conversations into your workflow.",
        icon: SiDiscord,
    },
] as const

type CreateStep = 1 | 2 | 3
type TeamRoleLabel = "Admin" | "Member" | "Guest"

const TEAM_ROLE_TO_PREDEFINED_ROLE: Record<TeamRoleLabel, PredefinedOrgRole> = {
    Admin: PredefinedOrgRole.ADMIN,
    Member: PredefinedOrgRole.DEVELOPER,
    Guest: PredefinedOrgRole.VIEWER,
}

const createWorkspaceSchema = z.object({
    workspaceName: z.string().min(1, { message: "Workspace name is required" }),
})

type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>

interface CreateWorkspaceProps {
    createStep: CreateStep
    handleCreateNext: () => void
    handleCreateBack: () => void
}

export default function CreateWorkspace({
    createStep,
    handleCreateNext,
    handleCreateBack,
}: CreateWorkspaceProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedTools, setSelectedTools] = useState<ExternalProvider[]>([])
    const [invitedMembers, setInvitedMembers] = useState<TeamInvitedMember[]>([])
    const [teamStepCompleted, setTeamStepCompleted] = useState(false)
    const { register, getValues, trigger } = useForm<CreateWorkspaceFormValues>({
        resolver: zodResolver(createWorkspaceSchema),
        mode: 'onChange',
    })

    const toggleTool = (provider: ExternalProvider) => {
        setSelectedTools((prev) =>
            prev.includes(provider) ? prev.filter((item) => item !== provider) : [...prev, provider]
        )
    }

    const handleAddTeamMembers = (emails: string[]) => {
        setInvitedMembers((prev) => [
            ...prev,
            ...emails.map((email, i) => ({
                id: `new-${Date.now()}-${i}`,
                email,
                name: null,
                role: "Member",
                status: "pending" as const,
            })),
        ])
    }

    const handleUpdateTeamMemberRole = (memberId: string, role: string) => {
        setInvitedMembers((prev) =>
            prev.map((member) =>
                member.id === memberId ? { ...member, role } : member
            )
        )
    }

    const mapUiRoleToPredefinedRole = (role: string): PredefinedOrgRole => {
        if (role in TEAM_ROLE_TO_PREDEFINED_ROLE) {
            return TEAM_ROLE_TO_PREDEFINED_ROLE[role as TeamRoleLabel]
        }
        return PredefinedOrgRole.DEVELOPER
    }

    const handleSkipTeamStep = () => {
        setTeamStepCompleted(true)
    }

    const handleNextStep = async () => {
        if (createStep === 1) {
            const isValid = await trigger("workspaceName")
            const workspaceName = getValues("workspaceName")?.trim()
            if (!isValid || !workspaceName) {
                toast.error("Workspace name is required")
                return
            }
        }
        handleCreateNext()
    }

    const handleFinish = async (data: CreateWorkspaceFormValues) => {
        const workspaceName = data.workspaceName?.trim()

        if (!workspaceName) {
            toast.error("Workspace name is required")
            return
        }

        try {
            setIsSubmitting(true)
            const response = await createOrg({
                name: workspaceName,
                appProviders: selectedTools.map((provider) => ({ provider })),
            })

            const orgId = response.organization?.id
            if (!orgId) {
                toast.error("Workspace created, but redirect failed. Please refresh.")
                return
            }

            const pendingMembers = invitedMembers.filter((member) => member.status === "pending")
            const uniquePendingMembers = Array.from(
                new Map(pendingMembers.map((member) => [member.email.toLowerCase(), member])).values()
            )

            if (uniquePendingMembers.length > 0) {
                const sentEmails = new Set<string>()
                await Promise.all(
                    uniquePendingMembers.map(async (member) => {
                        try {
                            await inviteMember(orgId, {
                                email: member.email,
                                predefinedRole: mapUiRoleToPredefinedRole(member.role),
                            })
                            sentEmails.add(member.email.toLowerCase())
                        } catch {
                            toast.error(`Failed to send invite to ${member.email}`)
                        }
                    })
                )

                if (sentEmails.size > 0) {
                    setInvitedMembers((prev) =>
                        prev.map((member) =>
                            sentEmails.has(member.email.toLowerCase())
                                ? { ...member, status: "sent" as const }
                                : member
                        )
                    )
                }
            }

            setActiveOrgId(orgId)
            router.push(buildDashboardOrgRoute(orgId))
        } catch {
            toast.error("Failed to create workspace. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full space-y-8">

            {/* Step content */}
            <div className="text-left ">
                {/* Workspace Step */}
                {createStep === 1 && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <PageTitle
                                title="Create Workspace"
                                description="Tell us about your Workspace"
                            />
                            {getActiveOrgId() ? (
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => router.push(buildDashboardOrgRoute(getActiveOrgId() as string))}
                                    className="rounded-full border-border bg-accent-contrast"
                                >
                                    Go To Dashboard
                                </Button>
                            ) : null}
                        </div>

                        <div className="space-y-4">
                            <Label htmlFor="workspaceName" className="text-2xl font-semibold">Workspace Name *</Label>
                            <InputField
                                name="workspaceName"
                                register={register}
                                placeholder="My Workspace"
                                className="bg-background border-[0.5px] border-border py-2 px-4"
                                required
                            />
                        </div>
                    </div>
                )}

                {/* Tools Step */}
                {createStep === 2 && (
                    <div className="space-y-8">
                        <PageTitle
                            title="Connect your tools"
                            description="Just the basics. You can change this anytime. Ovlox works better when it understands your stack. You can connect these later."
                        />

                        <div className="space-y-3">
                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                                {TOOLS_OPTIONS.map((option) => {
                                    const Icon = option.icon
                                    const provider = option.id.toUpperCase() as ExternalProvider
                                    const selected = selectedTools.includes(provider)
                                    return (
                                        <Card
                                            key={option.id}
                                            role="button"
                                            tabIndex={0}
                                            aria-pressed={selected}
                                            onClick={() => toggleTool(provider)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault()
                                                    toggleTool(provider)
                                                }
                                            }}
                                            className={cn(
                                                "cursor-pointer bg-white dark:bg-card border transition-colors text-left",
                                                selected ? BORDER_SELECTED : BORDER_DEFAULT
                                            )}
                                        >
                                            <CardContent className="space-y-1">
                                                <div className="flex items-center gap-4 text-white">
                                                    <Icon className="size-6 " />
                                                    <p className="text-xl font-semibold">
                                                        {option.label}
                                                    </p>
                                                </div>
                                                <p className="text-sm text-muted">
                                                    {option.description}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Team Step */}
                {createStep === 3 && (
                    <Team
                        invitedMembers={invitedMembers}
                        onAddMembers={handleAddTeamMembers}
                        onUpdateMemberRole={handleUpdateTeamMemberRole}
                    />
                )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={handleCreateBack}
                        className="rounded-full bg-card border-[0.5px] border-border"
                    >
                        <ArrowLeft /> Go Back
                    </Button>
                    {(createStep === 3) && (
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={handleSkipTeamStep}
                            className="rounded-full bg-card border-[0.5px] border-border text-muted"
                        >
                            Skip for now
                        </Button>
                    )}
                </div>
                <div className="flex gap-3">
                    {createStep < 3 ? (
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={handleNextStep}
                            className="bg-card border-[0.5px] border-border rounded-full"
                        >
                            {createStep === 1 ?
                                <>
                                    Continue <ArrowRight />
                                </>
                                : <>
                                    Next <ArrowRight />
                                </>
                            }
                        </Button>
                    ) : (
                        <Button
                            size="lg"
                            onClick={() => handleFinish(getValues())}
                            disabled={isSubmitting || !teamStepCompleted}
                            className="bg-card text-white font-medium text-sm hover:bg-[#191b1b]"
                        >
                            {isSubmitting ? "Creating..." : "Finish"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
