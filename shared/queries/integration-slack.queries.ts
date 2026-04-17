import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getSlackInstallUrl,
    getSlackChannels,
    syncSlackChannels,
    ingestSlackHistory,
} from "@/shared/api/integration-slack";

export const slackKeys = {
    all: ["slack"] as const,

    installUrl: (orgId: string, integrationId: string) =>
        [...slackKeys.all, "install-url", orgId, integrationId] as const,

    channels: (integrationId: string) =>
        [...slackKeys.all, "channels", integrationId] as const,
};

export const useSlackInstallUrl = (
    orgId?: string,
    integrationId?: string
) =>
    useQuery({
        queryKey:
            orgId && integrationId
                ? slackKeys.installUrl(orgId, integrationId)
                : [],
        queryFn: () => getSlackInstallUrl(orgId!, integrationId!),
        enabled: !!orgId && !!integrationId,
    });

export const useSlackChannels = (integrationId?: string) =>
    useQuery({
        queryKey: integrationId ? slackKeys.channels(integrationId) : [],
        queryFn: () => getSlackChannels(integrationId!),
        enabled: !!integrationId,
    });

/*                                  Mutations                                 */

export const useSyncSlackChannels = (integrationId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => syncSlackChannels(integrationId),
        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: slackKeys.channels(integrationId),
            });
        },
    });
};

export const useIngestSlackHistory = (integrationId: string) =>
    useMutation({
        mutationFn: ({
            channelId,
            projectId,
        }: {
            channelId: string;
            projectId?: string;
        }) => ingestSlackHistory(integrationId, channelId, projectId),
    });