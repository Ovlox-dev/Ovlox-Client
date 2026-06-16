"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Settings, AlertTriangle, Users, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsTab {
    label: string;
    href: (orgId: string) => string;
    matches: (pathname: string, orgId: string) => boolean;
    icon: React.ComponentType<{ className?: string }>;
    /** When true, opens in same tab but lives outside the settings layout — used for the
     *  Members link which has its own dedicated route at `/[orgId]/members`. */
    external?: boolean;
}

const TABS: SettingsTab[] = [
    {
        label: "General",
        href: (orgId) => `/${orgId}/settings/general`,
        matches: (path, orgId) => path === `/${orgId}/settings` || path.startsWith(`/${orgId}/settings/general`),
        icon: Settings,
    },
    {
        label: "Members",
        href: (orgId) => `/${orgId}/members`,
        matches: () => false,
        icon: Users,
        external: true,
    },
    {
        label: "Security",
        href: (orgId) => `/${orgId}/settings/security`,
        matches: (path, orgId) => path.startsWith(`/${orgId}/settings/security`),
        icon: KeyRound,
    },
    {
        label: "Danger zone",
        href: (orgId) => `/${orgId}/settings/danger`,
        matches: (path, orgId) => path.startsWith(`/${orgId}/settings/danger`),
        icon: AlertTriangle,
    },
];

export function OrgSettingsShell({ children }: { children: React.ReactNode }) {
    const params = useParams<{ organizationId: string }>();
    const orgId = params?.organizationId ?? "";
    const pathname = usePathname() ?? "";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="size-6" /> Organization settings
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your organization&apos;s details, members, and lifecycle.
                </p>
            </div>

            <div className="border-b border-border">
                <nav className="flex gap-1 -mb-px">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = tab.matches(pathname, orgId);
                        return (
                            <Link
                                key={tab.label}
                                href={tab.href(orgId)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors",
                                    active
                                        ? "border-primary text-foreground font-medium"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                                )}
                            >
                                <Icon className="size-4" />
                                {tab.label}
                                {tab.external ? (
                                    <span className="text-[10px] text-muted-foreground/70">↗</span>
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div>{children}</div>
        </div>
    );
}
