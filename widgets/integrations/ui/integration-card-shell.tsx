"use client"

import type { ReactNode } from "react"
import type { IconType } from "react-icons"

import { cn } from "@/lib/utils"

export function StatusDot({
    connected,
    processing,
}: {
    connected: boolean
    processing: boolean
}) {
    if (processing) {
        return (
            <span
                aria-label="Processing"
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,138,61,0.3)] bg-[rgba(255,138,61,0.12)] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-(--warn)"
            >
                <span className="size-1.5 rounded-full bg-(--warn) animate-pulse shadow-[0_0_8px_var(--warn)]" />
                Processing
            </span>
        )
    }
    if (connected) {
        return (
            <span
                aria-label="Connected"
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(124,246,111,0.3)] bg-[rgba(124,246,111,0.12)] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-(--accent-2)"
            >
                <span className="size-1.5 rounded-full bg-(--accent-2) shadow-[0_0_8px_var(--accent-2)]" />
                Connected
            </span>
        )
    }
    return (
        <span
            aria-label="Not connected"
            className="inline-flex items-center gap-2 rounded-full border border-(--line-2) bg-(--bg-3) px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-(--fg-3)"
        >
            <span className="size-1.5 rounded-full bg-(--fg-3)" />
            Not connected
        </span>
    )
}

export function IntegrationCardShell({
    icon: Icon,
    title,
    description,
    connected,
    processing,
    actions,
    className,
}: {
    icon: IconType
    title: string
    description: string
    connected: boolean
    processing: boolean
    actions?: ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                "group flex h-full flex-col rounded-[14px] border border-(--line) bg-(--bg-2) p-5",
                "transition-colors duration-300",
                "hover:border-(--accent-lime)/30",
                "relative overflow-hidden",
                className
            )}
        >
            {/* hover gradient hint */}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[14px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background:
                        "radial-gradient(ellipse at top right, rgba(200,255,62,0.05), transparent 60%)",
                }}
            />

            <div className="relative z-1 flex items-start justify-between gap-3">
                <div className="size-12 shrink-0 grid place-items-center rounded-[10px] border border-(--line-2) bg-(--bg-3)">
                    <Icon className="size-6 text-(--fg)" />
                </div>
                <StatusDot connected={connected} processing={processing} />
            </div>

            <div className="relative z-1 mt-4">
                <h2 className="text-base font-semibold text-(--fg) leading-tight">
                    {title}
                </h2>
                <p className="mt-1 text-sm text-(--fg-2) leading-relaxed">
                    {description}
                </p>
            </div>

            {actions ? (
                <div className="relative z-1 mt-5 flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-(--line-2)">
                    {actions}
                </div>
            ) : null}
        </div>
    )
}
