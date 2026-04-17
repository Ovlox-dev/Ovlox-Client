import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PredefinedOrgRole } from "@/types/enum"

const ROLE_STYLES: Record<PredefinedOrgRole, string> = {
    [PredefinedOrgRole.OWNER]: "bg-amber-500/15 text-amber-300",
    [PredefinedOrgRole.ADMIN]: "bg-rose-500/15 text-rose-300",
    [PredefinedOrgRole.DEVELOPER]: "bg-emerald-500/15 text-emerald-300",
    [PredefinedOrgRole.VIEWER]: "bg-zinc-700/60 text-zinc-300",
    [PredefinedOrgRole.CEO]: "bg-violet-500/15 text-violet-300",
    [PredefinedOrgRole.CTO]: "bg-sky-500/15 text-sky-300",
}

const FALLBACK_STYLE = "bg-zinc-800/80 text-zinc-400"

function formatRoleLabel(role: string): string {
    return role
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ")
}

function roleStyleClasses(role: string | null | undefined): string {
    if (!role) { return FALLBACK_STYLE; }
    const styles = ROLE_STYLES[role as PredefinedOrgRole]
    return styles ?? FALLBACK_STYLE
}

type RoleBadgeProps = {
    role?: string | null
    className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
    const label = role ? formatRoleLabel(role) : "—"

    return (
        <Badge
            className={cn(
                "border-0 px-2 py-0.5 text-xs font-medium shadow-none",
                roleStyleClasses(role),
                className,
            )}
        >
            {label}
        </Badge>
    )
}
