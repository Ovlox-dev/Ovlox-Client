"use client"

import type { ReactNode } from "react"
import type { IconType } from "react-icons"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export function StatusDot({
  connected,
  processing,
}: {
  connected: boolean
  processing: boolean
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-3 shrink-0 rounded-full",
        processing && "animate-pulse bg-amber-400",
        !processing && connected && "bg-[#55C6F0] shadow-[0_0_10px_3px_rgba(85,198,240,0.55)]",
        !processing && !connected && "bg-zinc-600"
      )}
    />
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
    <div className="block h-full">
      <Card
        className={cn(
          "flex h-full flex-col rounded-xl border border-white/10 bg-[#0D0D0D] shadow-none",
          className
        )}
      >
        <CardContent className="space-y-2 ">
          <div className="flex items-start justify-between">
            <Icon className="text-white size-8" />
            <StatusDot connected={connected} processing={processing} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-sm text-[#79868C]">{description}</p>
          </div>

          {actions ? (
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">{actions}</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

