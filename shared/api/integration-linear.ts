import { apiClient } from "@/shared/api/client";
import { GetInstallUrlResponse, ApiResponse, ListLinearTeamsResponse, ListLinearIssuesResponse } from "@/types/api-types";

export const getLinearInstallUrl = async (orgId: string, integrationId: string): Promise<GetInstallUrlResponse> => {
    const response = await apiClient.get<GetInstallUrlResponse>(`/integrations/linear/install/${orgId}/${integrationId}`);
    return response.data;
};

export const listLinearTeams = async (integrationId: string): Promise<ListLinearTeamsResponse[]> => {
    const response = await apiClient.get<ListLinearTeamsResponse[]>(`/integrations/linear/teams/${integrationId}`);
    return response.data;
};

export const syncLinearTeams = async (integrationId: string) => {
    const response = await apiClient.post<ApiResponse>(`/integrations/linear/sync-teams/${integrationId}`);
    return response.data;
};

export const listLinearIssues = async (integrationId: string): Promise<ListLinearIssuesResponse[]> => {
    const response = await apiClient.get<ListLinearIssuesResponse[]>(`/integrations/linear/issues/${integrationId}`);
    return response.data;
};

export const ingestLinearIssues = async (integrationId: string, projectId?: string, teamKey?: string) => {
    const response = await apiClient.post<ApiResponse>(`/integrations/linear/ingest/${integrationId}`, {
        params: {
            projectId,
            teamKey,
        }
    });
    return response.data;
};
