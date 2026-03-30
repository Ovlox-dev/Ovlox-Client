import { apiClient } from "@/shared/api/client";
import { GetInstallUrlResponse, DiscordChannel, ApiResponse } from "@/types/api-types";

export const getDiscordInstallUrl = async (orgId: string, integrationId: string): Promise<GetInstallUrlResponse> => {
    const response = await apiClient.get<GetInstallUrlResponse>(`/integrations/discord/install/${orgId}/${integrationId}`);
    return response.data;
};

export const getDiscordChannels = async (integrationId: string, guildId: string): Promise<DiscordChannel[]> => {
    const response = await apiClient.get<DiscordChannel[]>(`/integrations/discord/channels/${integrationId}`, {
        params: { guildId },
    });
    return response.data;
};

export const syncDiscordChannels = async (integrationId: string, guildId: string) => {
    const response = await apiClient.post<ApiResponse>(`/integrations/discord/sync-channels/${integrationId}`, null, {
        params: { guildId },
    });
    return response.data;
};

export const ingestDiscordHistory = async (integrationId: string, channelId: string, projectId?: string) => {
    const params: Record<string, string> = { channelId };
    if (projectId) params.projectId = projectId;
    const response = await apiClient.post<ApiResponse>(`/integrations/discord/ingest/${integrationId}`, null, { params });
    return response.data;
};
