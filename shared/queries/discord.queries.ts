// src/shared/queries/discord.integrations.queries.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBotInstallUrlForGuild, getChannels, getDiscordOAuthUrl, getDiscordUserGuild, ingestChannel, removeGuild, syncChannels } from "../api/integration-discord";


export const useGetDiscordUserGuilds = (integrationId?: string) =>
    useQuery({
        queryKey: ["discord-guilds", integrationId],
        queryFn: () => getDiscordUserGuild(integrationId!),
        enabled: !!integrationId,
    });

export const useRemoveGuild = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ integrationId, guildId, }: {
            integrationId: string;
            guildId: string;
        }) => removeGuild(integrationId, guildId),
        onSuccess: (_, vars) => {
            qc.invalidateQueries({
                queryKey: ["discord-guilds", vars.integrationId],
            });
        },
    });
};

/* -------------------- CHANNELS -------------------- */

export const useGetChannels = (
    integrationId?: string,
    guildId?: string
) =>
    useQuery({
        queryKey: ["discord-channels", integrationId, guildId],
        queryFn: () => getChannels(integrationId!, guildId!),
        enabled: !!integrationId && !!guildId,
    });

export const useSyncChannels = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ integrationId, guildId, }: { integrationId: string, guildId?: string }) =>
            syncChannels(integrationId, guildId),
        onSuccess: (_, vars) => {
            qc.invalidateQueries({
                queryKey: ["discord-channels", vars.integrationId],
            });
        },
    });
};

/* -------------------- INGEST -------------------- */

export const useIngestChannel = () =>
    useMutation({
        mutationFn: ({
            integrationId,
            channelId,
            projectId,
        }: {
            integrationId: string;
            channelId: string;
            projectId: string;
        }) => ingestChannel(integrationId, channelId, projectId),
    });


export const useGetBotInstallUrlForGuild = (
    integrationId?: string,
    guildId?: string
) =>
    useQuery({
        queryKey: ["discord-bot-install-url", integrationId, guildId],
        queryFn: () =>
            getBotInstallUrlForGuild(integrationId!, guildId!),
        enabled: !!integrationId && !!guildId,
    });

export const useGetOAuthUrl = (
    orgId?: string,
    integrationId?: string
) =>
    useQuery({
        queryKey: ["discord-oauth-url", orgId, integrationId],
        queryFn: () => getDiscordOAuthUrl(orgId!, integrationId!),
        enabled: !!orgId && !!integrationId,
    });