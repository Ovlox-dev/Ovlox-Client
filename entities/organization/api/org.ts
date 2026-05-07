import { apiClient } from "@/shared/api/client";
import {
    ApiResponse,
    CreateOrgRequest,
    CreateOrgResponse,
    UpdateOrgRequest,
    InviteMemberRequest,
    UpdateMemberRequest,
    ListMembersResponse,
    ListInvitesResponse,
    OrgIntegrationStatusItem,
    AddIntegrationsRequest
} from "@/types/api-types";
import { IOrganization, IOrganizationMember, IInvite, IIntegration } from "@/types/prisma-generated";

export type CreateOrgPayload = CreateOrgRequest;

export const createOrg = async (data: CreateOrgPayload): Promise<CreateOrgResponse> => {
    const response = await apiClient.post<CreateOrgResponse>(`/orgs/create`, data);
    return response.data;
};

export type UserOrgsFilters = {
    keyword?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: "asc" | "desc";
};

export const userOrgs = async (params?: UserOrgsFilters): Promise<ApiResponse<IOrganization[]>> => {
    const response = await apiClient.get<ApiResponse<IOrganization[]>>(`/orgs/user`, { params });
    return response.data;
};

export const userOrgById = async (id: string): Promise<{ organization: IOrganization; message?: string }> => {
    const response = await apiClient.get<{ organization: IOrganization; message?: string }>(`/orgs/user/byId/${id}`);
    return response.data;
};

export const userOrgBySlug = async (slug: string): Promise<{ organization: IOrganization; message?: string }> => {
    const response = await apiClient.get<{ organization: IOrganization; message?: string }>(`/orgs/user/bySlug/${slug}`);
    return response.data;
};

export const updateOrg = async (orgId: string, data: UpdateOrgRequest): Promise<IOrganization> => {
    const response = await apiClient.put<IOrganization>(`/orgs/${orgId}`, data);
    return response.data;
};

export const deleteOrg = async (orgId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/orgs/${orgId}`);
    return response.data;
};

export const inviteMember = async (orgId: string, data: InviteMemberRequest): Promise<IInvite> => {
    const response = await apiClient.post<IInvite>(`/orgs/${orgId}/members/invite`, data);
    return response.data;
};

export const listMembers = async (orgId: string, params?: { page?: number; limit?: number; search?: string; sort?: string }): Promise<ListMembersResponse> => {
    const response = await apiClient.get<ListMembersResponse>(`/orgs/${orgId}/members`, { params });
    return response.data;
};

export const updateMember = async (
    orgId: string,
    memberId: string,
    data: UpdateMemberRequest
): Promise<IOrganizationMember> => {
    const response = await apiClient.put<IOrganizationMember>(`/orgs/${orgId}/members/${memberId}`, data);
    return response.data;
};

export const removeMember = async (orgId: string, memberId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/orgs/${orgId}/members/${memberId}`);
    return response.data;
};

export const listInvites = async (orgId: string, params?: { page?: number; limit?: number }): Promise<ListInvitesResponse> => {
    const response = await apiClient.get<ListInvitesResponse>(`/orgs/${orgId}/invites`, { params });
    return response.data;
};

export const acceptInvite = async (token: string): Promise<IOrganizationMember> => {
    const response = await apiClient.post<IOrganizationMember | ApiResponse<IOrganizationMember>>(
        `/orgs/invites/${token}/accept`
    );
    const payload = response.data as IOrganizationMember | ApiResponse<IOrganizationMember>;
    if (payload && typeof payload === "object" && "data" in payload) {
        const unwrapped = (payload as ApiResponse<IOrganizationMember>).data;
        if (unwrapped) { return unwrapped; }
    }
    return payload as IOrganizationMember;
};

export const declineInvite = async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
        `/orgs/invites/${token}/decline`
    );
    return response.data;
};

export const listIntegrations = async (orgId: string): Promise<OrgIntegrationStatusItem[]> => {
    const response = await apiClient.get<OrgIntegrationStatusItem[]>(`/orgs/${orgId}/integrations`);
    return response.data;
};

export interface OrgAvailableResource {
    id: string;
    integrationId?: string;
    provider?: string;
    type?: string;
    name?: string;
    metadata?: Record<string, unknown>;
}

export interface ListOrgAvailableResourcesParams {
    provider?: string;
    integrationId?: string;
    keyword?: string;
    page?: number;
    limit?: number;
}

export interface ListOrgAvailableResourcesResponse {
    data: OrgAvailableResource[];
    total?: number;
    page?: number;
    limit?: number;
}

export const listOrgAvailableResources = async (
    orgId: string,
    params?: ListOrgAvailableResourcesParams,
): Promise<ListOrgAvailableResourcesResponse | OrgAvailableResource[]> => {
    const response = await apiClient.get<ListOrgAvailableResourcesResponse | OrgAvailableResource[]>(
        `/orgs/${orgId}/integrations/resources`,
        { params },
    );
    return response.data;
};

export const getOrgIntegrationStatusByIntegrationId = async (orgId: string, integrationId: string): Promise<OrgIntegrationStatusItem> => {
    const response = await apiClient.get<OrgIntegrationStatusItem>(`/orgs/${orgId}/integrations/${integrationId}`);
    return response.data;
};


export const addIntegrations = async (
    orgId: string,
    data: AddIntegrationsRequest
): Promise<ApiResponse<IIntegration>> => {
    const response = await apiClient.post<ApiResponse<IIntegration>>(`/orgs/${orgId}/integrations`, data);
    return response.data;
};

/**
 * Permanently delete an integration. Removes its config (tokens, refresh tokens),
 * IntegrationResource rows, and any IntegrationConnection links to projects.
 * Requires MANAGE_INTEGRATIONS permission. Idempotent — calling on a non-existent
 * integrationId returns a 404; otherwise returns a success message.
 */
export const removeOrgIntegration = async (
    orgId: string,
    integrationId: string,
): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
        `/orgs/${orgId}/integrations/${integrationId}`,
    );
    return response.data;
};

/**
 * Reset (disconnect) an integration without deleting the row. Clears stored tokens
 * and marks status NOT_CONNECTED, so the user can reinstall via the same row instead
 * of creating a new integration. Useful when tokens are corrupted or the OAuth grant
 * was revoked at the provider side and we want a clean reauth slate.
 */
export const resetOrgIntegration = async (
    orgId: string,
    integrationId: string,
): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
        `/orgs/${orgId}/integrations/${integrationId}/reset`,
        null,
    );
    return response.data;
};