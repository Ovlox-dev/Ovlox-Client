"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuthStore } from "@/entities/auth";
import { userOrgs } from "@/entities/organization/api/org";
import {
    memberHasPermission,
    type CurrentMember,
    type PermissionName,
    type PredefinedOrgRole,
} from "@/shared/lib/auth/permissions";

type RawMember = {
    userId?: string;
    predefinedRole?: PredefinedOrgRole | null;
    roleId?: string | null;
    permissions?: PermissionName[] | null;
};

type RawOrg = {
    id: string;
    slug?: string;
    ownerId?: string;
    members?: RawMember[];
};

/**
 * Resolves the current user's membership in `orgId` from the cached `userOrgs()` response.
 *
 * The backend computes effective permissions (predefined-role ∪ custom RoleTemplate) and
 * returns them as `member.permissions`. The frontend just reads them — no local mirror,
 * no drift.
 */
export function useCurrentMember(orgId: string | null | undefined): {
    member: CurrentMember | null;
    isLoading: boolean;
} {
    const sessionUser = useAuthStore((s) => s.auth.user);
    const userId = sessionUser?.id ?? null;

    const { data, isLoading } = useQuery({
        queryKey: ["org", "current-user-orgs", userId],
        queryFn: () => userOrgs({ limit: 100 }),
        enabled: Boolean(userId),
        staleTime: 60 * 1000,
    });

    const member = useMemo<CurrentMember | null>(() => {
        if (!orgId || !userId || !data?.data) { return null; }
        // `orgId` may be a slug (post-migration) or a UUID (legacy). Match either.
        const org = (data.data as unknown as RawOrg[]).find(
            (o) => o.id === orgId || o.slug === orgId,
        );
        if (!org) { return null; }
        const isOwner = org.ownerId === userId;
        const memberRow = (org.members ?? []).find((m) => m.userId === userId);
        const permissions = memberRow?.permissions ?? [];
        return {
            isOrgOwner: isOwner,
            predefinedRole: memberRow?.predefinedRole ?? null,
            roleId: memberRow?.roleId ?? null,
            permissions,
        };
    }, [data, orgId, userId]);

    return { member, isLoading };
}

export function usePermission(orgId: string | null | undefined): {
    can: (permission: PermissionName) => boolean;
    member: CurrentMember | null;
    isLoading: boolean;
} {
    const { member, isLoading } = useCurrentMember(orgId);
    const can = useMemo(() => {
        return (permission: PermissionName) => memberHasPermission(member, permission);
    }, [member]);
    return { can, member, isLoading };
}
