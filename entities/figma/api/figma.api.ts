import { apiClient } from "@/shared/api/client";

export interface FigmaFile {
    key: string;
    name: string;
    thumbnailUrl?: string;
    lastModified?: string;
    metadata?: Record<string, unknown>;
}

export const getFigmaAuthUrl = async (
    orgId: string,
    integrationId: string,
): Promise<{ url: string }> => {
    const response = await apiClient.get<{ url: string }>(
        `/integrations/figma/install/${orgId}/${integrationId}`,
    );
    return response.data;
};

export const fetchFigmaFiles = async (integrationId: string): Promise<FigmaFile[]> => {
    const response = await apiClient.get<FigmaFile[]>(`/integrations/figma/files/${integrationId}`);
    return response.data;
};

export const syncFigmaFiles = async (integrationId: string) => {
    const response = await apiClient.post(`/integrations/figma/sync-files/${integrationId}`);
    return response.data;
};

export const ingestFigmaFile = async (
    integrationId: string,
    fileKey: string,
    projectId?: string,
) => {
    const response = await apiClient.post(`/integrations/figma/ingest/${integrationId}`, null, {
        params: { fileKey, projectId },
    });
    return response.data;
};
