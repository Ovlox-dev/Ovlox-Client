"use client";

import { useParams } from "next/navigation";

import { useOrganizationAccess } from "@/entities/organization/model/useOrganizationAccess";

/**
 * Gates every route under `/[organizationId]/*` (dashboard, projects, settings, …) behind a
 * membership check. Previously only the dashboard/root org pages were gated, so project routes
 * (e.g. /[organizationId]/projects/new-project) would render and submit for an org the user isn't
 * a member of. `useOrganizationAccess` verifies the URL org against the user's memberships and
 * redirects to one they actually belong to when it doesn't match.
 */
export function OrgAccessGate({ children }: { children: React.ReactNode }) {
    const params = useParams<{ organizationId: string }>();
    const hasAccess = useOrganizationAccess(params?.organizationId ?? "");

    if (!hasAccess) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-6">
                <p className="text-(--fg-3)">Redirecting…</p>
            </div>
        );
    }

    return <>{children}</>;
}
