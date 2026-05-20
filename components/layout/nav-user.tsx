"use client"

import {
    BadgeCheck,
    Bell,
    ChevronsUpDown,
    CreditCard,
    LogOut,
    Shield,
    Sparkles,
} from "lucide-react"
import Link from "next/link"
import { UserRole } from "@/types/enum"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/entities/auth"

export function NavUser({
    user,
}: {
    user: {
        name: string
        email: string
        avatar: string | undefined
    }
}) {
    const router = useRouter();
    const { isMobile } = useSidebar();
    const { logout, isLoading } = useAuthStore((s) => s.auth);
    const sessionUser = useAuthStore((s) => s.auth.user);
    const isAdmin = sessionUser?.role === UserRole.ADMIN;

    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Logged out successfully");
            router.replace("/signin");
        } catch (error) {
            toast.error("Failed to logout", { description: (error as Error).message || "Something went wrong!." });
        }
    }

    const fallbackLabel =
        user.name
            .split(/\s+/)
            .filter(Boolean)
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "?"

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-(--bg-3) data-[state=open]:text-(--fg) hover:bg-(--bg-3)"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="rounded-lg bg-(--bg-3) text-(--fg) text-xs font-medium">{fallbackLabel}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium text-(--fg)">{user.name}</span>
                                <span className="truncate text-xs text-(--fg-3)">{user.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-(--fg-3)" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback className="rounded-lg">{fallbackLabel}</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user.name}</span>
                                    <span className="truncate text-xs">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link href="/account">
                                    <BadgeCheck />
                                    Account
                                </Link>
                            </DropdownMenuItem>
                            {isAdmin ? (
                                <DropdownMenuItem asChild>
                                    <Link href="/admin">
                                        <Shield className="text-(--accent-lime)" />
                                        Admin panel
                                    </Link>
                                </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem>
                                <CreditCard />
                                Billing
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Bell />
                                Notifications
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Sparkles />
                                Upgrade to Pro
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
                            <LogOut />
                            {isLoading ? "Loading..." : "Log out"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}