import { apiClient } from "@/shared/api/client";
import type { IUser } from "@/types/prisma-generated";

export interface AdminListResponse<T> {
    data: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface AdminUser extends IUser {
    isDisabled?: boolean;
}

export const listAdminUsers = async (params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    blocked?: "true" | "false";
}): Promise<AdminListResponse<AdminUser>> => {
    const res = await apiClient.get<AdminListResponse<AdminUser>>(
        "/admin/users",
        { params }
    );
    return res.data;
};

export const blockUser = async (userId: string) => {
    const res = await apiClient.put<{ id: string; email: string | null; isDisabled: boolean }>(
        `/admin/users/${userId}/block`
    );
    return res.data;
};

export const unblockUser = async (userId: string) => {
    const res = await apiClient.put<{ id: string; email: string | null; isDisabled: boolean }>(
        `/admin/users/${userId}/unblock`
    );
    return res.data;
};

/** Change a user's platform-level role (ADMIN ↔ USER). */
export const setUserRole = async (
    userId: string,
    role: "ADMIN" | "USER"
): Promise<{ id: string; email: string | null; role: "ADMIN" | "USER" }> => {
    const res = await apiClient.put<{
        id: string;
        email: string | null;
        role: "ADMIN" | "USER";
    }>(`/admin/users/${userId}/role`, { role });
    return res.data;
};

export interface AdminOrganization {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    currentPlanId: string | null;
    creditBalance: number;
    createdAt: string;
    updatedAt: string;
    ownerFirstName: string | null;
    ownerLastName: string | null;
    ownerEmail: string | null;
    memberCount: number;
    projectCount: number;
}

export const listAdminOrganizations = async (params: {
    page?: number;
    limit?: number;
    search?: string;
}): Promise<AdminListResponse<AdminOrganization>> => {
    const res = await apiClient.get<AdminListResponse<AdminOrganization>>(
        "/admin/organizations",
        { params }
    );
    return res.data;
};

export interface AdminProject {
    id: string;
    name: string;
    slug: string;
    status: string;
    visibility: string;
    organizationId: string;
    createdById: string;
    createdAt: string;
    updatedAt: string;
}

export const listAdminOrgProjects = async (
    orgId: string
): Promise<AdminProject[]> => {
    const res = await apiClient.get<AdminProject[]>(
        `/admin/organizations/${orgId}/projects`
    );
    return res.data;
};

export interface AdminCreditOverview {
    organization: {
        id: string;
        name: string;
        slug: string;
        creditBalance: number | string;
    };
    activeGrants: Array<{
        id: string;
        originalAmount: string;
        grantBalance: string;
        source: string;
        expiresAt: string | null;
        description: string | null;
        createdAt: string;
    }>;
    recentTransactions: Array<{
        id: string;
        type: string;
        status: string;
        amount: string;
        description: string | null;
        referenceType: string | null;
        referenceId: string | null;
        createdAt: string;
    }>;
}

export const getAdminOrgCredits = async (
    orgId: string
): Promise<AdminCreditOverview> => {
    const res = await apiClient.get<AdminCreditOverview>(
        `/admin/organizations/${orgId}/credits`
    );
    return res.data;
};

export const grantOrgCredits = async (
    orgId: string,
    body: { amount: number; description?: string; expiresAt?: string | null }
) => {
    const res = await apiClient.post(
        `/admin/organizations/${orgId}/credits/grant`,
        body
    );
    return res.data;
};
