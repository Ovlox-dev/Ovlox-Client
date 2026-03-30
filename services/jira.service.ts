import { apiClient } from "@/shared/api/client";
import { GetInstallUrlResponse, JiraProject, ApiResponse } from "@/types/api-types";

export const getJiraInstallUrl = async (orgId: string, integrationId: string): Promise<GetInstallUrlResponse> => {
    const response = await apiClient.get<GetInstallUrlResponse>(`/integrations/jira/install/${orgId}/${integrationId}`);
    return response.data;
};

export const getJiraProjects = async (integrationId: string): Promise<JiraProject[]> => {
    const response = await apiClient.get<JiraProject[]>(`/integrations/jira/projects/${integrationId}`);
    return response.data;
};

export const syncJiraProjects = async (integrationId: string) => {
    const response = await apiClient.post<ApiResponse>(`/integrations/jira/sync-projects/${integrationId}`);
    return response.data;
};

export const ingestJiraIssues = async (integrationId: string, projectKey?: string, jql?: string) => {
    const params: Record<string, string> = {};
    if (projectKey) params.projectKey = projectKey;
    if (jql) params.jql = jql;
    const response = await apiClient.post<ApiResponse>(`/integrations/jira/ingest/${integrationId}`, null, { params });
    return response.data;
};
