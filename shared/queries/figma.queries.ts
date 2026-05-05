import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    fetchFigmaFiles,
    getFigmaAuthUrl,
    ingestFigmaFile,
    syncFigmaFiles,
} from "@/entities/figma/api/figma.api";

export const figmaKeys = {
    all: ["figma"] as const,
    authUrl: (orgId: string, integrationId: string) =>
        [...figmaKeys.all, "authUrl", orgId, integrationId] as const,
    files: (integrationId: string) => [...figmaKeys.all, "files", integrationId] as const,
};

export const useFigmaAuthUrl = (orgId: string, integrationId: string) =>
    useQuery({
        queryKey: figmaKeys.authUrl(orgId, integrationId),
        queryFn: () => getFigmaAuthUrl(orgId, integrationId),
        enabled: !!orgId && !!integrationId,
    });

export const useFigmaFiles = (integrationId: string | undefined) =>
    useQuery({
        queryKey: figmaKeys.files(integrationId ?? ""),
        queryFn: () => fetchFigmaFiles(integrationId!),
        enabled: !!integrationId,
    });

export const useSyncFigmaFiles = (integrationId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => syncFigmaFiles(integrationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: figmaKeys.files(integrationId) });
        },
    });
};

export const useIngestFigmaFile = (integrationId: string) =>
    useMutation({
        mutationFn: ({ fileKey, projectId }: { fileKey: string; projectId?: string }) =>
            ingestFigmaFile(integrationId, fileKey, projectId),
    });
