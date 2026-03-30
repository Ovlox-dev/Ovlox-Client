"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import createWorkspace from "@/assets/create-workspace.svg"
import joinWorkspace from "@/assets/join-workspace.svg"
import CreateWorkspace from "./components/create-workspace"
import JoinWorkspace from "./components/join-workspace"
import { buildDashboardOrgRoute, getActiveOrgId } from "@/shared/lib/auth/post-auth-org-resolver"
import { useRouter } from "next/navigation"

const BORDER_SELECTED = "border-blue-400 dark:border-accent"
const BORDER_DEFAULT = "border-gray-200 dark:border-border"

const CREATE_WORKSPACE_STEPS = [
  { id: 1 as const, label: "Workspace" },
  { id: 2 as const, label: "Tools" },
  { id: 3 as const, label: "Team" },
]

type WorkspaceChoice = "create" | "join" | null
type Phase = "setupWorkspace" | "create" | "join"
type CreateStep = 1 | 2 | 3

export default function NewUserPage() {
  const router = useRouter()
  const [workspaceChoice, setWorkspaceChoice] = useState<WorkspaceChoice>(null)
  const [phase, setPhase] = useState<Phase>("setupWorkspace")
  const [createStep, setCreateStep] = useState<CreateStep>(1);

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

  const handleCreateNext = () => {
    if (createStep < 3) setCreateStep((createStep + 1) as CreateStep)
  }

  const handleCreateBack = () => {
    if (createStep === 1) handleBackFromCreateStep1()
    else setCreateStep((createStep - 1) as CreateStep)
  }

  const handleJoinBack = () => {
    setPhase("setupWorkspace")
    setWorkspaceChoice(null)
  }

  return (
    <div>
      {phase === "setupWorkspace" && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="max-w-3xl mx-auto space-y-8 text-center w-full">
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-medium tracking-tight md:text-3xl">
                  Set up your Workspace
                </h1>
                <p className="text-muted-foreground text-base">
                  This helps us get things ready for you.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card
                  role="button"
                  tabIndex={0}
                  aria-pressed={workspaceChoice === "create"}
                  onClick={() => setWorkspaceChoice("create")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setWorkspaceChoice("create")
                    }
                  }}
                  className={cn(
                    "cursor-pointer bg-white dark:bg-card border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    workspaceChoice === "create" ? BORDER_SELECTED : BORDER_DEFAULT
                  )}
                >
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg">
                      <Image
                        src={createWorkspace}
                        alt="Create workspace"
                        width={100}
                        height={100}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardTitle className="text-left text-base font-medium">
                      Create a workspace
                    </CardTitle>
                    <CardDescription className="text-left">
                      You&apos;re starting something new and want to build from scratch.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card
                  role="button"
                  tabIndex={0}
                  aria-pressed={workspaceChoice === "join"}
                  onClick={() => setWorkspaceChoice("join")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setWorkspaceChoice("join")
                    }
                  }}
                  className={cn(
                    "cursor-pointer bg-white dark:bg-card border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    workspaceChoice === "join" ? BORDER_SELECTED : BORDER_DEFAULT
                  )}
                >
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg">
                      <Image
                        src={joinWorkspace}
                        alt="Join workspace"
                        width={100}
                        height={100}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardTitle className="text-left text-base font-medium">
                      Join a workspace
                    </CardTitle>
                    <CardDescription className="text-left">
                      You&apos;ve been invited to an existing workspace by your team.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>

              <Button
                size="lg"
                disabled={workspaceChoice === null}
                onClick={handleContinueFromChoice}
                className="w-full bg-card text-white font-medium text-sm hover:bg-[#191b1b]"
              >
                Continue
              </Button>

              {getActiveOrgId() ? (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => router.push(buildDashboardOrgRoute(getActiveOrgId() as string))}
                  className="w-full bg-accent text-accent-contrast font-medium border border-accent text-sm dark:hover:bg-text-accent hover:text-accent-contrast"
                >
                  Go To Dashboard
                </Button>
              ) : null}
            </>
          </div>
        </div>
      )}

      {phase === "create" && (

        <div className="max-w-7xl mx-auto py-10">
          {/* Step indicator */}
          <div className="w-full pb-6">
            <div className="flex gap-2 w-full">
              {CREATE_WORKSPACE_STEPS.map((step) => {
                const isCompleted = step.id < createStep;
                const isActive = step.id === createStep;
                return (
                  <div key={step.id} className="flex-1 flex flex-col gap-2">
                    <div
                      className="w-full h-[4px] rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: isCompleted ? '#F2F3F4' : '#252828',
                      }}
                    />
                    <span
                      className={cn(
                        "text-sm transition-colors",
                        isActive
                          ? "text-text font-medium"
                          : "text-[#7c8c79]"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <CreateWorkspace
            createStep={createStep}
            handleCreateNext={handleCreateNext}
            handleCreateBack={handleCreateBack}
          />
        </div>
      )}

      {phase === "join" && (
        <div className="max-w-7xl mx-auto py-10">
          <JoinWorkspace
            handleJoinBack={handleJoinBack}
          />
        </div>
      )}
    </div>
  )
}
