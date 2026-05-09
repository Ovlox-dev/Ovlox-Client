"use client"

import type { ReactNode } from "react"
import type { IconType } from "react-icons"

export interface ProviderHeaderProps {
    icon: IconType
    title: string
    description: string
    /** Optional right-aligned action bar (sync / reinstall / reset / remove). */
    actions?: ReactNode
}

/**
 * Header used at the top of every per-provider integration management page.
 * Mirrors the v3 frame-card aesthetic used elsewhere in the app shell.
 */
export function ProviderHeader({
    icon: Icon,
    title,
    description,
    actions,
}: ProviderHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
                <div className="size-12 shrink-0 grid place-items-center rounded-[12px] border border-(--line-2) bg-(--bg-3)">
                    <Icon className="size-6 text-(--fg)" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-(--fg) leading-tight">
                        {title}
                    </h1>
                    <p className="text-sm text-(--fg-2) mt-0.5">{description}</p>
                </div>
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
    )
}
