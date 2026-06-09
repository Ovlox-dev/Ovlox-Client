"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LogOut, Loader2, Plus, Check, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import createWorkspace from "@/assets/create-workspace.svg"
// import joinWorkspace from "@/assets/join-workspace.svg"
import CreateWorkspace from "./components/create-workspace"
// import JoinWorkspace from "./components/join-workspace"

import { buildDashboardOrgRoute, getActiveOrgId, syncActiveOrgId } from "@/shared/lib/auth/post-auth-org-resolver"
import { useAuthStore } from "@/entities/auth"

// const CREATE_WORKSPACE_STEPS = [
//     { id: 1 as const, label: "Workspace" },
//     { id: 2 as const, label: "Tools" },
//     { id: 3 as const, label: "Team" },
// ]

type WorkspaceChoice = "create" | "join" | null
type Phase = "setupWorkspace" | "create" | "join"
type CreateStep = 1 | 2 | 3

export default function NewUserPage() {
    const router = useRouter()
    const [workspaceChoice, setWorkspaceChoice] = useState<WorkspaceChoice>("create")
    const [phase, setPhase] = useState<Phase>("setupWorkspace")
    const [createStep, setCreateStep] = useState<CreateStep>(1)
    const { logout, isLoading } = useAuthStore((s) => s.auth)

    const handleContinueFromChoice = () => {
        if (workspaceChoice === "create") {
            setPhase("create")
            setCreateStep(1)
        } else if (workspaceChoice === "join") {
            setPhase("join")
        }
    }

    const handleBackFromCreateStep1 = () => {
        setPhase("setupWorkspace")
        setWorkspaceChoice(null)
    }

    // const handleCreateNext = () => {
    //     if (createStep < 3) { setCreateStep((createStep + 1) as CreateStep) }
    // }

    const handleCreateBack = () => {
        if (createStep === 1) { handleBackFromCreateStep1() }
        else { setCreateStep((createStep - 1) as CreateStep) }
    }

    // const handleJoinBack = () => {
    //     setPhase("setupWorkspace")
    //     setWorkspaceChoice(null)
    // }

    const handleLogout = async () => {
        try {
            await logout()
            toast.success("Signed out")
            router.replace("/signin")
        } catch (error) {
            toast.error("Failed to sign out", {
                description:
                    (error as Error).message || "Something went wrong.",
            })
        }
    }

    const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() => getActiveOrgId())

    useEffect(() => {
        let cancelled = false
        void (async () => {
            const synced = await syncActiveOrgId()
            if (!cancelled) {
                setActiveOrgIdState(synced)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    return (
        <div className="relative min-h-screen w-full bg-(--bg) overflow-hidden">
            <div className="aurora" aria-hidden="true" />

            <div className="relative z-10">
                {phase === "setupWorkspace" && (
                    <div className="min-h-screen flex items-center justify-center px-4 py-10">
                        <div className="w-full max-w-2xl">
                            {/* HERO */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-(--line) bg-(--bg-2) mb-5">
                                    <span className="size-1.5 rounded-full bg-(--accent-lime) shadow-[0_0_8px_var(--accent-lime)]" />
                                    <span className="font-mono uppercase tracking-widest text-[10px] text-(--accent-lime)">
                                        Workspace setup
                                    </span>
                                </div>
                                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-(--fg) leading-tight">
                                    Set up your{" "}
                                    <span className="serif italic bg-linear-to-br from-(--accent-lime) via-(--accent-3) to-(--accent-4) bg-clip-text text-transparent">
                                        workspace.
                                    </span>
                                </h1>
                                <p className="mt-2 text-sm text-(--fg-2) max-w-md mx-auto">
                                    Pick how you want to get started — we&apos;ll set up the rest.
                                </p>
                            </div>

                            {/* CHOICE CARDS */}
                            <div className="grid gap-4 sm:grid-cols-1 mb-6">
                                <ChoiceCard
                                    selected={workspaceChoice === "create"}
                                    onSelect={() => setWorkspaceChoice("create")}
                                    icon={
                                        <Image
                                            src={createWorkspace}
                                            alt=""
                                            width={56}
                                            height={56}
                                            className="size-12 object-contain"
                                        />
                                    }
                                    fallbackIcon={<Plus className="size-5 text-(--accent-lime)" />}
                                    title="Create a workspace"
                                    description="Starting something new and building from scratch."
                                />
                                {/* <ChoiceCard
                                    selected={workspaceChoice === "join"}
                                    onSelect={() => setWorkspaceChoice("join")}
                                    icon={
                                        <Image
                                            src={joinWorkspace}
                                            alt=""
                                            width={56}
                                            height={56}
                                            className="size-12 object-contain"
                                        />
                                    }
                                    fallbackIcon={
                                        <UserPlus className="size-5 text-(--accent-lime)" />
                                    }
                                    title="Join a workspace"
                                    description={"You’ve been invited by your team."}
                                /> */}
                            </div>

                            {/* CONTINUE */}
                            <Button
                                size="lg"
                                disabled={workspaceChoice === null}
                                onClick={handleContinueFromChoice}
                                className="w-full"
                            >
                                Continue
                                <ArrowRight className="size-4" />
                            </Button>

                            {/* Existing-org escape hatch */}
                            {activeOrgId ? (
                                <div className="mt-6 rounded-[12px] border border-(--line-2) bg-(--bg-2) p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm text-(--fg) font-medium">
                                            Already part of an organization?
                                        </p>
                                        <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                                            {activeOrgId}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                router.push(
                                                    buildDashboardOrgRoute(activeOrgId)
                                                )
                                            }
                                        >
                                            Open dashboard
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleLogout}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="size-3.5 animate-spin" />
                                            ) : (
                                                <LogOut className="size-3.5" />
                                            )}
                                            Sign out
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}

                {phase === "create" && (
                    <div className="max-w-5xl mx-auto px-4 py-10">
                        {/* <StepIndicator currentStep={createStep} /> */}
                        <CreateWorkspace
                            handleCreateBack={handleCreateBack}
                            activeOrgId={activeOrgId}
                        />
                    </div>
                )}

                {/* {phase === "join" && (
                    <div className="max-w-5xl mx-auto px-4 py-10">
                        <JoinWorkspace handleJoinBack={handleJoinBack} />
                    </div>
                )} */}
            </div>
        </div>
    )
}

/* ---------- subcomponents ---------- */

function ChoiceCard({
    selected,
    onSelect,
    icon,
    fallbackIcon,
    title,
    description,
}: {
    selected: boolean
    onSelect: () => void
    icon: React.ReactNode
    fallbackIcon: React.ReactNode
    title: string
    description: string
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={cn(
                "group relative text-left rounded-[14px] border bg-(--bg-2) p-5 transition-all",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(200,255,62,0.18)]",
                selected
                    ? "border-(--accent-lime) shadow-[0_0_24px_rgba(200,255,62,0.10)]"
                    : "border-(--line) hover:border-(--accent-lime)/30"
            )}
        >
            {/* selected check */}
            {selected ? (
                <span className="absolute top-3 right-3 size-5 grid place-items-center rounded-full bg-(--accent-lime) text-[#07070a]">
                    <Check className="size-3" strokeWidth={3} />
                </span>
            ) : (
                <span aria-hidden className="absolute top-3 right-3 size-5 rounded-full border border-(--line-2)" />
            )}

            <div className="size-12 grid place-items-center rounded-[10px] border border-(--line-2) bg-(--bg-3) mb-4">
                {/* SVG asset; if it fails to load, fallback icon shines through via hidden trick */}
                <div className="relative size-12 grid place-items-center">
                    {icon}
                    <span className="absolute inset-0 grid place-items-center opacity-0 group-[.no-img]:opacity-100">
                        {fallbackIcon}
                    </span>
                </div>
            </div>

            <p className="text-base font-semibold text-(--fg)">{title}</p>
            <p className="mt-1 text-sm text-(--fg-2) leading-relaxed">
                {description}
            </p>
        </button>
    )
}

// function StepIndicator({ currentStep }: { currentStep: CreateStep }) {
//     return (
//         <div className="mb-8">
//             <div className="flex items-baseline gap-3 mb-3">
//                 <span className="font-mono uppercase tracking-widest text-[10px] text-(--fg-3)">
//                     Step {currentStep} of {CREATE_WORKSPACE_STEPS.length}
//                 </span>
//                 <span className="font-mono text-[10px] text-(--fg-3)">·</span>
//                 <span className="text-sm font-semibold text-(--fg)">
//                     {CREATE_WORKSPACE_STEPS.find((s) => s.id === currentStep)?.label}
//                 </span>
//             </div>
//             <div className="flex gap-2 w-full">
//                 {CREATE_WORKSPACE_STEPS.map((step) => {
//                     const isCompleted = step.id < currentStep
//                     const isActive = step.id === currentStep
//                     return (
//                         <div key={step.id} className="flex-1 flex flex-col gap-2">
//                             <div
//                                 className={cn(
//                                     "h-[3px] rounded-full transition-all duration-300",
//                                     isCompleted
//                                         ? "bg-(--accent-lime) shadow-[0_0_8px_var(--accent-glow)]"
//                                         : isActive
//                                             ? "bg-linear-to-r from-(--accent-lime) to-(--accent-lime)/30"
//                                             : "bg-(--line-2)"
//                                 )}
//                             />
//                             <span
//                                 className={cn(
//                                     "text-[10px] font-mono uppercase tracking-wider transition-colors",
//                                     isActive
//                                         ? "text-(--accent-lime)"
//                                         : isCompleted
//                                             ? "text-(--fg-2)"
//                                             : "text-(--fg-3)"
//                                 )}
//                             >
//                                 {step.label}
//                             </span>
//                         </div>
//                     )
//                 })}
//             </div>
//         </div>
//     )
// }
