import { apiClient } from "@/shared/api/client";
import { GetInstallUrlResponse, GetSlackChannelResponse, ApiResponse } from "@/types/api-types";

export const getSlackInstallUrl = async (orgId: string, integrationId: string): Promise<GetInstallUrlResponse> => {
    const response = await apiClient.get<GetInstallUrlResponse>(`/integrations/slack/install/${orgId}/${integrationId}`);
    return response.data;
};

export const getSlackChannels = async (integrationId: string): Promise<GetSlackChannelResponse[]> => {
    const response = await apiClient.get<GetSlackChannelResponse[]>(`/integrations/slack/channels/${integrationId}`);
    return response.data;
};

export const syncSlackChannels = async (integrationId: string) => {
    const response = await apiClient.post<ApiResponse>(`/integrations/slack/sync-channels/${integrationId}`);
    return response.data;
};

export const ingestSlackHistory = async (integrationId: string, channelId: string, projectId?: string) => {
    const params: Record<string, string> = { channelId };
    if (projectId) { params.projectId = projectId; }
    const response = await apiClient.post<ApiResponse>(`/integrations/slack/ingest/${integrationId}`, null, { params });
    return response.data;
};
