import { apiClient } from "@/shared/api/client";
import {
    ApiResponse,
    GetDiscordUserGuildsResponse,
    GetDiscordOAuthUrlResponse,
    GetDiscordChannelResponse,
} from "@/types/api-types";

export const getDiscordOAuthUrl = async (orgId: string, integrationId: string): Promise<GetDiscordOAuthUrlResponse> => {
    const response = await apiClient.get<GetDiscordOAuthUrlResponse>(`/integrations/discord/oauth/${orgId}/${integrationId}`);
    return response.data;
};

export const getDiscordUserGuild = async (integrationId: string): Promise<GetDiscordUserGuildsResponse[]> => {
    const response = await apiClient.get<GetDiscordUserGuildsResponse[]>(`/integrations/discord/guilds/${integrationId}`);
    return response.data;
};

export const getBotInstallUrlForGuild = async (integrationId: string, guildId: string): Promise<{ url: string }> => {
    const response = await apiClient.get<{ url: string }>(`/integrations/discord/install/${integrationId}/${guildId}`);
    return response.data
}

export const ingestChannel = async (integrationId: string, channelId: string, projectId: string) => {
    const response = await apiClient.post(`/integrations/discord/ingest/${integrationId}`, null, {
        params: { channelId, projectId }
    });
    return response.data
}

export const removeGuild = async (integrationId: string, guildId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/integrations/discord/${integrationId}/guilds/${guildId}`);
    return response.data
}

export const getChannels = async (integrationId: string, guildId: string): Promise<GetDiscordChannelResponse[]> => {
    const response = await apiClient.get<GetDiscordChannelResponse[]>(`/integrations/discord/channels/${integrationId}`, {
        params: { guildId }
    });
    return response.data
}

export const syncChannels = async (integrationId: string, guildId?: string) => {
    const response = await apiClient.post<ApiResponse>(
        `/integrations/discord/sync-channels/${integrationId}`,
        null,
        guildId ? { params: { guildId } } : undefined,
    );
    return response.data
};