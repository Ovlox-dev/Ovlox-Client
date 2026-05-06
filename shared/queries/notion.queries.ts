import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    fetchNotionDatabases,
    getNotionAuthUrl,
    ingestNotionDatabase,
    syncNotionDatabases,
} from "@/entities/notion/api/notion.api";

export const notionKeys = {
    all: ["notion"] as const,
    authUrl: (orgId: string, integrationId: string) =>
        [...notionKeys.all, "authUrl", orgId, integrationId] as const,
    databases: (integrationId: string) =>
        [...notionKeys.all, "databases", integrationId] as const,
};

export const useNotionAuthUrl = (orgId: string, integrationId: string) =>
    useQuery({
        queryKey: notionKeys.authUrl(orgId, integrationId),
        queryFn: () => getNotionAuthUrl(orgId, integrationId),
        enabled: !!orgId && !!integrationId,
    });

export const useNotionDatabases = (integrationId: string | undefined) =>
    useQuery({
        queryKey: notionKeys.databases(integrationId ?? ""),
        queryFn: () => fetchNotionDatabases(integrationId!),
        enabled: !!integrationId,
    });

export const useSyncNotionDatabases = (integrationId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => syncNotionDatabases(integrationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notionKeys.databases(integrationId) });
        },
    });
};

export const useIngestNotionDatabase = (integrationId: string) =>
    useMutation({
        mutationFn: ({ databaseId, projectId }: { databaseId: string; projectId?: string }) =>
            ingestNotionDatabase(integrationId, databaseId, projectId),
    });
