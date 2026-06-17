"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check, Sparkles } from "lucide-react"
import { InputField } from "@/components/form-components"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from "@/components/ui/label"
import { IoLogoGithub } from "react-icons/io5";
import { SiDiscord, SiJira, SiLinear, SiSlack } from "react-icons/si"
import Team, { TeamInvitedMember } from "./team"
import { PageTitle } from "@/components/page-title"
import { buildDashboardOrgRoute, setActiveOrgId } from "@/shared/lib/auth/post-auth-org-resolver"
import { createOrg, inviteMember } from "@/entities/organization/api/org"
import { useAuthStore } from "@/entities/auth"
import { ExternalProvider, PredefinedOrgRole } from "@/types/enum"
import { toast } from "sonner"


const TOOLS_OPTIONS = [
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

const PREDEFINED_ORG_ROLES = Object.values(PredefinedOrgRole)

const createWorkspaceSchema = z.object({
    workspaceName: z.string().min(1, { message: "Workspace name is required" }),
})

type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>

interface CreateWorkspaceProps {
    handleCreateBack: () => void
    activeOrgId?: string | null
}

export default function CreateWorkspace({
    handleCreateBack,
    activeOrgId,
}: CreateWorkspaceProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const fetchUser = useAuthStore((s) => s.auth.fetchUser)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedTools, setSelectedTools] = useState<ExternalProvider[]>([])
    const [invitedMembers, setInvitedMembers] = useState<TeamInvitedMember[]>([])
    const [toolsAcknowledged, setToolsAcknowledged] = useState(false)
    const [toolsSkipped, setToolsSkipped] = useState(false)
    const [inviteSkipped, setInviteSkipped] = useState(false)
    const { register, getValues, trigger, watch } = useForm<CreateWorkspaceFormValues>({
        resolver: zodResolver(createWorkspaceSchema),
        mode: 'onChange',
    })

    const toggleTool = (provider: ExternalProvider) => {
        setSelectedTools((prev) => {
            const next = prev.includes(provider)
                ? prev.filter((item) => item !== provider)
                : [...prev, provider]
            if (next.length > 0) {
                setToolsAcknowledged(true)
            }
            return next
        })
    }

    const handleAddTeamMembers = (emails: string[]) => {
        setInvitedMembers((prev) => [
            ...prev,
            ...emails.map((email, i) => ({
                id: `new-${Date.now()}-${i}`,
                email,
                name: null,
                role: PredefinedOrgRole.DEVELOPER,
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

    const handleRemoveTeamMember = (memberId: string) => {
        setInvitedMembers((prev) => prev.filter((member) => member.id !== memberId))
    }

    const mapUiRoleToPredefinedRole = (role: string): PredefinedOrgRole => {
        if (PREDEFINED_ORG_ROLES.includes(role as PredefinedOrgRole)) {
            return role as PredefinedOrgRole
        }
        return PredefinedOrgRole.DEVELOPER
    }

    const workspaceName = (watch("workspaceName") ?? "").trim()
    const isNameValid = workspaceName.length > 0
    const toolsEnabled = isNameValid
    const inviteEnabled = isNameValid && (toolsAcknowledged || toolsSkipped)
    // Tools + invites are optional — the workspace name is the only requirement to create. (Previously
    // you were forced to either add a member or explicitly click "Skip for now" on invites.)
    const canFinish = isNameValid

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
            // Refresh the cached org list + the signed-in user's memberships BEFORE navigating —
            // otherwise the dashboard loads against stale data (the new org isn't in the cached
            // ["userOrgs"] / user record yet) and you land "outside" the org until a manual refresh.
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["userOrgs"] }),
                // also the permission-cache key so the new org's permission-gated UI is fresh immediately
                queryClient.invalidateQueries({ queryKey: ["org", "current-user-orgs"] }),
                fetchUser({ silent: true }).catch(() => null),
            ])
            router.push(buildDashboardOrgRoute(orgId))
        } catch {
            toast.error("Failed to create workspace. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full space-y-10">
            <div className="flex items-center justify-between gap-4">
                <PageTitle
                    title="Create Workspace"
                    description="Name your workspace, connect your stack, and invite your team."
                />
                {activeOrgId ? (
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => router.push(buildDashboardOrgRoute(activeOrgId))}
                        className="rounded-full border-border bg-accent-contrast"
                    >
                        Go To Dashboard
                    </Button>
                ) : null}
            </div>

            {/* Section 1: Workspace name */}
            <section className="rounded-[14px] border border-(--line) bg-(--bg-2) p-6 sm:p-7 space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-mono uppercase tracking-widest text-(--fg-3)">
                            Workspace
                        </p>
                        <h2 className="text-xl sm:text-2xl font-semibold text-(--fg)">
                            Choose a name
                        </h2>
                        <p className="mt-1 text-sm text-(--fg-2)">
                            This becomes the home for your projects, integrations, and team.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="workspaceName" className="text-sm text-(--fg-2) font-medium">
                        Workspace Name *
                    </Label>
                    <InputField
                        name="workspaceName"
                        register={register}
                        placeholder="My Workspace"
                        className="bg-(--bg) border-[0.5px] border-border py-2 px-4"
                        required
                    />
                </div>
            </section>

            {/* Section 2: Tools */}
            <section className="rounded-[14px] border border-(--line) bg-(--bg-2) p-6 sm:p-7 space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-mono uppercase tracking-widest text-(--fg-3)">
                            Tools
                        </p>
                        <h2 className="text-xl sm:text-2xl font-semibold text-(--fg)">
                            Connect your stack
                        </h2>
                        <p className="mt-1 text-sm text-(--fg-2)">
                            Optional. Pick what you use — you can connect more later.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if (!toolsEnabled || selectedTools.length > 0) { return }
                            setToolsSkipped(true)
                            setToolsAcknowledged(true)
                        }}
                        disabled={!toolsEnabled || selectedTools.length > 0}
                        className={cn(
                            "rounded-full border-[0.5px] border-[rgba(200,255,62,0.50)] text-(--fg-2) bg-[rgba(200,255,62,0.10)] transition-all duration-300",
                            (!toolsEnabled || selectedTools.length > 0) && "bg-[#33383B] border-[#33383B] text-[#666666] "
                        )}
                    >
                        Skip for now
                    </Button>
                </div>

                <div
                    className={cn(
                        "space-y-3",
                        !toolsEnabled && "opacity-50 pointer-events-none"
                    )}
                >
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {TOOLS_OPTIONS.map((option) => {
                            const Icon = option.icon
                            const provider = option.id.toUpperCase() as ExternalProvider
                            const selected = selectedTools.includes(provider)

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={selected}
                                    onClick={() => toggleTool(provider)}
                                    className={cn(
                                        "group relative text-left rounded-[12px] border bg-(--bg-2) p-4 transition-all",
                                        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(200,255,62,0.18)]",
                                        selected
                                            ? "border-(--accent-lime) shadow-[0_0_24px_rgba(200,255,62,0.10)]"
                                            : "border-(--line) hover:border-(--accent-lime)/30"
                                    )}
                                >
                                    {selected ? (
                                        <span className="absolute top-3 right-3 size-5 grid place-items-center rounded-full bg-(--accent-lime) text-[#07070a]">
                                            <Check className="size-3" strokeWidth={3} />
                                        </span>
                                    ) : (
                                        <span aria-hidden className="absolute top-3 right-3 size-5 rounded-full border border-(--line-2)" />
                                    )}

                                    <div className="flex items-start gap-3">
                                        <div className="size-10 shrink-0 grid place-items-center rounded-[10px] border border-(--line-2) bg-(--bg-3) text-(--fg)">
                                            <Icon className="size-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-base font-semibold text-(--fg)">
                                                {option.label}
                                            </p>
                                            <p className="mt-1 text-sm text-(--fg-2) leading-relaxed">
                                                {option.description}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {!toolsAcknowledged ? (
                        <div className="flex items-center gap-2 text-xs text-(--fg-3)">
                            <Sparkles className="size-3.5" />
                            Select at least one tool or click “Skip for now” to continue.
                        </div>
                    ) : null}
                </div>
            </section>

            {/* Section 3: Invite */}
            <section className="rounded-[14px] border border-(--line) bg-(--bg-2) p-6 sm:p-7 space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-mono uppercase tracking-widest text-(--fg-3)">
                            Team
                        </p>
                        <h2 className="text-xl sm:text-2xl font-semibold text-(--fg)">
                            Invite members
                        </h2>
                        <p className="mt-1 text-sm text-(--fg-2)">
                            Optional. Invite teammates now, or add them later from Members.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if (!inviteEnabled || invitedMembers.length > 0 || inviteSkipped) { return }
                            setInviteSkipped(true)
                        }}
                        disabled={!inviteEnabled || invitedMembers.length > 0 || inviteSkipped}
                        className={cn(
                            "rounded-full border-[0.5px] border-[rgba(200,255,62,0.50)] text-(--fg-2) bg-[rgba(200,255,62,0.10)] transition-all duration-300",
                            (!inviteEnabled || invitedMembers.length > 0 || inviteSkipped) && "bg-[#33383B] border-[#33383B] text-[#666666] "
                        )}
                    >
                        {inviteSkipped ? "Skipped" : "Skip for now"}
                    </Button>
                </div>

                <div className={cn(!inviteEnabled && "opacity-50")}>
                    <Team
                        invitedMembers={invitedMembers}
                        onAddMembers={handleAddTeamMembers}
                        onUpdateMemberRole={handleUpdateTeamMemberRole}
                        onRemoveMember={handleRemoveTeamMember}
                        disabled={!inviteEnabled}
                    />
                </div>

                {!inviteEnabled ? (
                    <p className="text-xs text-(--fg-3)">
                        Complete the Tools section above to unlock invites.
                    </p>
                ) : null}
            </section>

            {/* Footer actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleCreateBack}
                    className="rounded-full bg-card border-[0.5px] border-border"
                >
                    <ArrowLeft /> Go Back
                </Button>

                <Button
                    size="lg"
                    onClick={async () => {
                        const isValid = await trigger("workspaceName")
                        const name = getValues("workspaceName")?.trim()
                        if (!isValid || !name) {
                            toast.error("Workspace name is required")
                            return
                        }
                        await handleFinish(getValues())
                    }}
                    disabled={isSubmitting || !isNameValid || !canFinish}
                    className="bg-card text-white border border-[rgba(200,255,62,0.80)] font-medium text-sm hover:bg-[#191b1b]"
                >
                    {isSubmitting ? "Creating..." : "Create workspace"}
                </Button>
            </div>
        </div>
    )
}
