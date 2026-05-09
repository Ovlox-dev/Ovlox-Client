"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Users,
    Building2,
    Coins,
    Shield,
    LogOut,
    Loader2,
    ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/entities/auth";
import { UserRole } from "@/types/enum";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
    {
        title: "Users",
        href: "/admin/users",
        icon: Users,
    },
    {
        title: "Organizations",
        href: "/admin/organizations",
        icon: Building2,
    },
    {
        title: "Credits",
        href: "/admin/credits",
        icon: Coins,
    },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const user = useAuthStore((s) => s.auth.user);
    const status = useAuthStore((s) => s.auth.authStatus);
    const fetchUser = useAuthStore((s) => s.auth.fetchUser);
    const logout = useAuthStore((s) => s.auth.logout);

    useEffect(() => {
        if (!user && status !== "loading") {
            void fetchUser();
        }
    }, [user, status, fetchUser]);

    // Bounce non-admins back to the homepage; backend RoleGuard would 403
    // anyway, but blocking the UI prevents flashes of admin chrome.
    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/signin?redirectURI=" + encodeURIComponent(pathname));
            return;
        }
        if (user && user.role !== UserRole.ADMIN) {
            toast.error("You don't have admin access.");
            router.replace("/");
        }
    }, [user, status, router, pathname]);

    if (!user || user.role !== UserRole.ADMIN) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-(--bg)">
                <Loader2 className="size-5 animate-spin text-(--fg-3)" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-(--bg) text-(--fg)">
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] min-h-screen">
                {/* SIDEBAR */}
                <aside className="border-r border-(--line-2) bg-(--bg-2) flex flex-col">
                    <div className="px-5 py-4 border-b border-(--line-2)">
                        <Link
                            href="/"
                            className="text-xs text-(--fg-3) hover:text-(--fg) inline-flex items-center gap-1.5 mb-3 transition-colors"
                        >
                            <ArrowLeft className="size-3" />
                            Back to app
                        </Link>
                        <div className="inline-flex items-center gap-2">
                            <div className="size-7 grid place-items-center rounded-md border border-(--line) bg-(--bg-3) text-(--accent-lime)">
                                <Shield className="size-3.5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold leading-none text-(--fg)">
                                    Admin
                                </p>
                                <p className="text-[10px] font-mono uppercase tracking-wider text-(--fg-3) mt-0.5">
                                    Platform-level
                                </p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 p-2 space-y-0.5">
                        {NAV.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                pathname.startsWith(item.href + "/");
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                                        isActive
                                            ? "bg-(--bg-3) text-(--fg) shadow-[inset_2px_0_0_var(--accent-lime)] [&_svg]:text-(--accent-lime)"
                                            : "text-(--fg-2) hover:bg-(--bg-3) hover:text-(--fg)"
                                    )}
                                >
                                    <Icon className="size-4" />
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-3 border-t border-(--line-2)">
                        <div className="px-3 py-2 mb-2 rounded-md bg-(--bg-3) border border-(--line-2)">
                            <p className="text-xs text-(--fg) truncate font-medium">
                                {user.firstName} {user.lastName}
                            </p>
                            <p className="text-[11px] text-(--fg-3) truncate font-mono">
                                {user.email}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={async () => {
                                await logout();
                                router.replace("/signin");
                            }}
                        >
                            <LogOut className="size-3.5" />
                            Sign out
                        </Button>
                    </div>
                </aside>

                {/* MAIN */}
                <main className="overflow-auto">{children}</main>
            </div>
        </div>
    );
}
