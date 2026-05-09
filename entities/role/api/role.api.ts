import { apiClient } from "@/shared/api/client";
import type { PermissionName, PredefinedOrgRole } from "@/types/enum";

/**
 * Shape returned by `GET /orgs/:orgId/roles`. The backend gives us a single
 * payload with both default (read-only) and custom roles, plus each custom
 * role's permissions joined in via the RoleTemplatePermission link table.
 */
export interface OrgRolesResponse {
    predefinedRoles: PredefinedRoleSummary[];
    customRoles: CustomRoleTemplate[];
}

export interface PredefinedRoleSummary {
    predefinedRole: PredefinedOrgRole;
    name: string;
    description: string;
    isSystem: true;
}

export interface RoleTemplatePermissionRow {
    id: string;
    roleTemplateId: string;
    permissionId: string;
    createdAt: string;
    /** The joined Permission record. Always present (server-side INNER JOIN). */
    permission: {
        id: string;
        name: PermissionName | string;
        code: string;
        description: string | null;
        scope: string;
    };
}

export interface CustomRoleTemplate {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
    /** Each row is a (RoleTemplate × Permission) link with the Permission inlined. */
    rolePermissions: RoleTemplatePermissionRow[];
}

export const listOrgRoles = async (
    orgId: string
): Promise<OrgRolesResponse> => {
    const res = await apiClient.get<OrgRolesResponse>(`/orgs/${orgId}/roles`);
    return res.data;
};
