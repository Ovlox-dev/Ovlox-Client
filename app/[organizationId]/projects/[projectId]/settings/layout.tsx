"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { GitBranch, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

const SETTINGS_SUBTABS = [
    { label: "Branches", segment: "branches", icon: GitBranch },
    { label: "Recovery", segment: "recovery", icon: RotateCcw },
] as const;

export default function ProjectSettingsLayout({ children }: { children: ReactNode }) {
    const params = useParams<{ organizationId: string; projectId: string }>();
    const organizationId = params?.organizationId ?? "";
    const projectId = params?.projectId ?? "";
    const pathname = usePathname() ?? "";

    const base = `/${organizationId}/projects/${projectId}/settings`;

    return (
        <div className="space-y-4 px-4 sm:px-6">
            <nav aria-label="Settings sub-sections" className="flex gap-1 border-b border-border">
                {SETTINGS_SUBTABS.map((tab) => {
                    const href = `${base}/${tab.segment}`;
                    const isActive = pathname === href || pathname.startsWith(`${href}/`);
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.segment}
                            href={href}
                            className={cn(
                                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors -mb-px",
                                isActive
                                    ? "border-accent text-text"
                                    : "border-transparent text-muted-foreground hover:text-text"
                            )}
                        >
                            <Icon className="size-4" />
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
            <div>{children}</div>
        </div>
    );
}
