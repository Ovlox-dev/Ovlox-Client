import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
    type ReprocessEventsRequest,
    type RetryFailedBackfillRequest,
    reprocessEvents,
    resetProject,
    retryFailedBackfill,
} from "../api/recovery.api";
import { projectKeys } from "./projects.queries";

export const useRetryFailedBackfill = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body?: RetryFailedBackfillRequest) =>
            retryFailedBackfill(orgId, projectId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.detail(orgId, projectId),
            });
        },
    });
};

export const useReprocessEvents = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body?: ReprocessEventsRequest) =>
            reprocessEvents(orgId, projectId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.detail(orgId, projectId),
            });
        },
    });
};

export const useResetProject = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => resetProject(orgId, projectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(orgId, projectId) });
            queryClient.invalidateQueries({ queryKey: projectKeys.lists(orgId) });
        },
    });
};

