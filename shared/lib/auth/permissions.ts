/**
 * Permission types — codes match backend src/database/enums.ts.
 *
 * The role-to-permissions matrix is computed server-side and returned on each
 * `OrganizationMember.permissions` field via `userOrgs()`. The frontend never
 * mirrors the matrix locally — that prevented backend/frontend drift.
 */

import { PermissionName, PredefinedOrgRole } from "@/types/enum";

export { PermissionName, PredefinedOrgRole };

export type CurrentMember = {
    /** True when the current user owns the org. Backend already includes owner permissions in the array, but this flag is convenient for UI affordances. */
    isOrgOwner: boolean;
    predefinedRole: PredefinedOrgRole | null;
    roleId: string | null;
    /** Effective permissions resolved by the backend (predefined-role permissions ∪ custom RoleTemplate permissions). */
    permissions: PermissionName[];
};

export function memberHasPermission(member: CurrentMember | null | undefined, permission: PermissionName): boolean {
    if (!member) { return false; }
    return member.permissions.includes(permission);
}
