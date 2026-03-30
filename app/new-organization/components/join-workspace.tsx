"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { z } from "zod"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { cn } from "@/lib/utils"
import inviteEmptyIcon from "@/assets/invite.svg"

import { acceptInvite } from "@/shared/api/org"
import { buildDashboardOrgRoute, setActiveOrgId } from "@/shared/lib/auth/post-auth-org-resolver"

import { ArrowLeft } from "lucide-react"
import { IoLogoGithub } from "react-icons/io5"
import { SiDiscord, SiJira, SiLinear, SiSlack } from "react-icons/si"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { InputField } from "@/components/form-components"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"

interface JoinWorkspaceProps {
    handleJoinBack: () => void
}

export type ToolName = "github" | "slack" | "jira" | "discord" | "linear"

const TOOL_ICONS: Record<ToolName, React.ComponentType<{ className?: string }>> = {
    github: IoLogoGithub,
    slack: SiSlack,
    jira: SiJira,
    discord: SiDiscord,
    linear: SiLinear,
}

const TOOL_LABELS: Record<ToolName, string> = {
    github: "GitHub",
    slack: "Slack",
    jira: "Jira",
    discord: "Discord",
    linear: "Linear",
}

type WorkspaceInvite = {
    id: string
    workspaceName: string
    inviterName: string
    role: string
    memberCount: number
    toolsIntegrated: ToolName[]
}

const MOCK_INVITES: WorkspaceInvite[] = [
    {
        id: "1",
        workspaceName: "Rishi's Workspace",
        inviterName: "Rishi Paul",
        role: "Member",
        memberCount: 12,
        toolsIntegrated: ["github", "slack", "jira", "linear", "discord"],
    },
    {
        id: "2",
        workspaceName: "John's Workspace",
        inviterName: "John Doe",
        role: "Member",
        memberCount: 8,
        toolsIntegrated: ["discord", "linear"],
    },
    {
        id: "3",
        workspaceName: "Jane's Workspace",
        inviterName: "Jane Smith",
        role: "Admin",
        memberCount: 5,
        toolsIntegrated: [],
    },
]

const inviteCodeSchema = z.object({
    inviteCode: z.string().min(1, { message: "This invite code is invalid or expired." }),
})

type InviteCodeFormValues = z.infer<typeof inviteCodeSchema>


export default function JoinWorkspace({ handleJoinBack }: JoinWorkspaceProps) {
    const router = useRouter()
    const [invites, setInvites] = useState<WorkspaceInvite[]>(MOCK_INVITES)
    const [isJoining, setIsJoining] = useState(false)
    const { register, handleSubmit, formState: { errors }, setError } = useForm<InviteCodeFormValues>({
        resolver: zodResolver(inviteCodeSchema),
        mode: 'onChange',
    })

    const handleDecline = (id: string) => {
        setInvites((prev) => prev.filter((inv) => inv.id !== id))
    }

    const joinWorkspaceWithToken = async (token: string): Promise<boolean> => {
        try {
            setIsJoining(true)
            const member = await acceptInvite(token)
            const orgId = member.organizationId
            if (!orgId) {
                toast.error("Joined workspace, but redirect failed. Please refresh.")
                return false
            }

            setActiveOrgId(orgId)
            toast.success("Workspace joined successfully")
            router.push(buildDashboardOrgRoute(orgId))
            return true
        } catch {
            toast.error("This invite code is invalid or expired.")
            return false
        } finally {
            setIsJoining(false)
        }
    }

    const handleJoin = async (id: string) => {
        const joined = await joinWorkspaceWithToken(id)
        if (joined) {
            setInvites((prev) => prev.filter((inv) => inv.id !== id))
        }
    }

    const handleJoinWithCode = async (data: InviteCodeFormValues) => {
        const joined = await joinWorkspaceWithToken(data.inviteCode)
        if (!joined) {
            setError("inviteCode", { message: "This invite code is invalid or expired." })
        }
    }

    return (
        <div className="w-full space-y-8">
            <div className="space-y-8">
                <div className="space-y-1 text-center">
                    <h2 className="text-4xl font-semibold tracking-tight text-foreground">
                        Your Invites
                    </h2>
                </div>

                {invites.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {invites.map((invite) => (
                            <div
                                key={invite.id}
                                className={cn(
                                    "border border-border rounded-2xl"
                                )}
                            >
                                <div className="flex gap-4 min-w-0 bg-card p-6 rounded-t-2xl">
                                    <Avatar className="size-10 shrink-0 bg-accent/20 text-[#184F68]">
                                        <AvatarFallback className="bg-accent/20 text-accent text-xl font-semibold">
                                            {invite.inviterName[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 space-y-1">
                                        <p className="text-base text-muted truncate">
                                            {invite.workspaceName}
                                        </p>
                                        <p className="text-sm text-muted">
                                            Invited by {invite.inviterName} • Role: <span className="text-accent">{invite.role}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between gap-2 shrink-0 text-left bg-background px-6 py-4 rounded-b-2xl">
                                    <div>
                                        <p className="text-base font-medium text-text">
                                            {invite.memberCount || 0}
                                        </p>
                                        <p className="text-xs text-muted">
                                            Members
                                        </p>
                                    </div>
                                    <div>
                                        <>
                                            {invite.toolsIntegrated.length > 0 ? (
                                                <AvatarGroup
                                                    data-size="sm"
                                                    className="flex items-center"
                                                >
                                                    {invite.toolsIntegrated
                                                        .slice(0, 3)
                                                        .map((name) => {
                                                            const Icon =
                                                                TOOL_ICONS[name]
                                                            return Icon ? (
                                                                <Avatar
                                                                    key={name}
                                                                    className="size-6 shrink-0 rounded-full bg-border flex items-center justify-center ring-2 ring-background"
                                                                    title={
                                                                        TOOL_LABELS[
                                                                        name
                                                                        ]
                                                                    }
                                                                >
                                                                    <AvatarFallback className="bg-transparent border-0 size-full p-0 rounded-full">
                                                                        <Icon className="size-6 text-text" />
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            ) : null
                                                        })}
                                                    {invite.toolsIntegrated
                                                        .length > 3 && (
                                                            <AvatarGroupCount className="size-6 text-[10px] font-medium text-text">
                                                                +
                                                                {invite.toolsIntegrated.length - 3}
                                                            </AvatarGroupCount>
                                                        )}
                                                </AvatarGroup>
                                            ) : (
                                                <>
                                                    <p className="text-base font-medium text-text">
                                                        No
                                                    </p>
                                                </>
                                            )}
                                            <p className="text-xs text-muted mt-1">
                                                Tools integrated
                                            </p>
                                        </>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleDecline(invite.id)}
                                            className="rounded-full px-4 py-2 text-[#E5666A] bg-red-500/10 hover:text-red-500 hover:border-red-500/80"
                                        >
                                            Decline
                                        </Button>
                                        <Button
                                            onClick={() => handleJoin(invite.id)}
                                            disabled={isJoining}
                                            className="rounded-full px-4 py-2 bg-accent text-card hover:bg-[#4fb8e8]"
                                        >
                                            Join
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div
                        className={cn(
                            "flex flex-col items-center justify-center gap-4 rounded-2xl border border-border",
                            "bg-card dark:bg-card py-16 px-6"
                        )}
                    >
                        <Image
                            src={inviteEmptyIcon}
                            alt=""
                            width={64}
                            height={64}
                            className="opacity-60"
                        />
                        <p className="text-sm text-muted-foreground text-center">
                            No pending invites right now.
                        </p>
                    </div>
                )}

                <div className="relative flex items-center gap-4">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                        or join with a code
                    </span>
                    <div className="flex-1 border-t border-border" />
                </div>

                <div className="space-y-4">
                    <Label htmlFor="invite-code" className="text-foreground">
                        Invite Code
                    </Label>
                    <div className="flex justify-between items-center gap-2">
                        <div className="flex-1">
                            <InputField
                                name="inviteCode"
                                placeholder="Paste invite code."
                                register={register}
                                className="w-full rounded-lg border-border dark:bg-background text-foreground placeholder:text-muted-foreground bg-transparent"
                            />
                        </div>
                        <Button
                            type="button"
                            size="default"
                            onClick={handleSubmit(handleJoinWithCode)}
                            disabled={isJoining}
                            className="rounded-full bg-white text-card hover:bg-muted font-medium shrink-0"
                        >
                            {isJoining ? "Joining..." : "Join Workspace"}
                        </Button>
                    </div>
                    {errors.inviteCode && <p className="text-red-500 text-sm mt-1">{errors.inviteCode.message}</p>}
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleJoinBack}
                    className="rounded-full bg-card border-[0.5px] border-border text-muted"
                >
                    <ArrowLeft /> Go Back
                </Button>
            </div>
        </div>
    )
}
