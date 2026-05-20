import { cn } from "@/lib/utils"
import { PredefinedOrgRole } from "@/types/enum"

const ROLE_STYLES: Record<PredefinedOrgRole, string> = {
    [PredefinedOrgRole.OWNER]:
        "border border-[rgba(255,138,61,0.3)] bg-[rgba(255,138,61,0.12)] text-(--warn)",
    [PredefinedOrgRole.ADMIN]:
        "border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.12)] text-(--danger)",
    [PredefinedOrgRole.DEVELOPER]:
        "border border-[rgba(124,246,111,0.3)] bg-[rgba(124,246,111,0.12)] text-(--accent-2)",
    [PredefinedOrgRole.VIEWER]:
        "border border-(--line-2) bg-(--bg-3) text-(--fg-3)",
    [PredefinedOrgRole.CEO]:
        "border border-[rgba(167,139,255,0.3)] bg-[rgba(167,139,255,0.12)] text-(--accent-4)",
    [PredefinedOrgRole.CTO]:
        "border border-[rgba(74,243,217,0.3)] bg-[rgba(74,243,217,0.12)] text-(--accent-3)",
}

const FALLBACK_STYLE =
    "border border-(--line-2) bg-(--bg-3) text-(--fg-3)"

function formatRoleLabel(role: string): string {
    return role
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ")
}

function roleStyleClasses(role: string | null | undefined): string {
    if (!role) return FALLBACK_STYLE
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
        <span
            className={cn(
                "inline-flex items-center w-fit px-2 py-0.5 rounded-full",
                "font-mono uppercase tracking-wider text-[10px] font-semibold",
                "whitespace-nowrap",
                roleStyleClasses(role),
                className,
            )}
        >
            {label}
        </span>
    )
}
