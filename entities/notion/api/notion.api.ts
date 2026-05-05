import { apiClient } from "@/shared/api/client";

export interface NotionDatabase {
    id: string;
    title: string;
    url: string;
    metadata?: Record<string, unknown>;
}

export const getNotionAuthUrl = async (
    orgId: string,
    integrationId: string,
): Promise<{ url: string }> => {
    const response = await apiClient.get<{ url: string }>(
        `/integrations/notion/install/${orgId}/${integrationId}`,
    );
    return response.data;
};

export const fetchNotionDatabases = async (
    integrationId: string,
): Promise<NotionDatabase[]> => {
    const response = await apiClient.get<NotionDatabase[]>(
        `/integrations/notion/databases/${integrationId}`,
    );
    return response.data;
};

export const syncNotionDatabases = async (integrationId: string) => {
    const response = await apiClient.post(`/integrations/notion/sync-databases/${integrationId}`);
    return response.data;
};

export const ingestNotionDatabase = async (
    integrationId: string,
    databaseId: string,
    projectId?: string,
) => {
    const response = await apiClient.post(`/integrations/notion/ingest/${integrationId}`, null, {
        params: { databaseId, projectId },
    });
    return response.data;
};
