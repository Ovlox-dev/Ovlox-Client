import * as React from "react"
import { Check } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

type SetupStep = "integrations" | "members" | "review"

const STEPS: Array<{
    id: SetupStep
    title: string
    description: string
}> = [
    {
        id: "integrations",
        title: "Connect apps",
        description: "Choose integrations and resources",
    },
    {
        id: "members",
        title: "Add members",
        description: "Grant team access to this project",
    },
    {
        id: "review",
        title: "Review",
        description: "Confirm and finish setup",
    },
]

function stepIndex(step: SetupStep) {
    return STEPS.findIndex((s) => s.id === step)
}

export function SetupLayout({
    step,
    children,
    onStepChange,
}: {
    step: SetupStep
    children: React.ReactNode
    onStepChange?: (step: SetupStep) => void
}) {
    const activeIndex = stepIndex(step)
    const router = useRouter()
    const searchParams = useSearchParams()

    const goToStep = React.useCallback((next: SetupStep) => {
        onStepChange?.(next)
        // Use "flag" query params like "?members" (serialized as "members=").
        const params = new URLSearchParams(searchParams)
        params.delete("integrations")
        params.delete("members")
        params.delete("review")
        params.set(next, "")
        router.push(`?${params.toString()}`)
    }, [onStepChange, router, searchParams])

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card/40">
                <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Project setup
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Connect apps, add your team, and start shipping.
                        </p>
                    </div>

                    <nav aria-label="Setup steps">
                        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {STEPS.map((s, idx) => {
                                const isActive = idx === activeIndex
                                const isCompleted = idx < activeIndex

                                return (
                                    <li
                                        key={s.id}
                                        className="list-none"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => goToStep(s.id)}
                                            className={cn(
                                                "w-full rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/20",
                                                isActive && "border-primary/50"
                                            )}
                                            aria-current={isActive ? "step" : undefined}
                                        >
                                            <div className="flex items-start gap-3">
                                            <div
                                                className={cn(
                                                    "mt-0.5 flex size-8 items-center justify-center rounded-full border text-sm font-semibold",
                                                    isCompleted &&
                                                    "border-primary bg-primary text-primary-foreground",
                                                    !isCompleted &&
                                                    isActive &&
                                                    "border-primary text-primary",
                                                    !isCompleted &&
                                                    !isActive &&
                                                    "border-border text-muted-foreground"
                                                )}
                                                aria-hidden
                                            >
                                                {isCompleted ? (
                                                    <Check className="size-4" />
                                                ) : (
                                                    idx + 1
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <p
                                                    className={cn(
                                                        "text-sm font-medium",
                                                        isActive
                                                            ? "text-foreground"
                                                            : "text-muted-foreground"
                                                    )}
                                                >
                                                    {s.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {s.description}
                                                </p>
                                            </div>
                                        </div>
                                        </button>
                                    </li>
                                )
                            })}
                        </ol>
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-6 py-8">
                <Card className="overflow-hidden">
                    <CardContent className="p-6 sm:p-8">
                        {children}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
