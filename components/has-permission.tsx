"use client";

import type { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import type { PermissionName } from "@/shared/lib/auth/permissions";

export function HasPermission({
    orgId,
    name,
    fallback = null,
    children,
}: {
    orgId: string | null | undefined;
    name: PermissionName;
    fallback?: ReactNode;
    children: ReactNode;
}) {
    const { can, isLoading } = usePermission(orgId);
    if (isLoading) { return null; }
    return can(name) ? <>{children}</> : <>{fallback}</>;
}
