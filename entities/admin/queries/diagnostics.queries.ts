import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bootstrapOpenAiModels, runOpenAiDiagnostics } from "../api/diagnostics.api";

export const adminDiagnosticsKeys = {
    all: ["admin", "diagnostics"] as const,
    openai: () => [...adminDiagnosticsKeys.all, "openai"] as const,
};

export const useOpenAiDiagnostics = () =>
    useQuery({
        queryKey: adminDiagnosticsKeys.openai(),
        queryFn: runOpenAiDiagnostics,
        // Diagnostics is a manual-trigger surface; don't auto-poll.
        refetchInterval: false,
        staleTime: 5 * 60 * 1000,
    });

export const useBootstrapOpenAiModels = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bootstrapOpenAiModels,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminDiagnosticsKeys.openai() });
        },
    });
};
