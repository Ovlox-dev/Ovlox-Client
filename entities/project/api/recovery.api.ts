import { apiClient } from "@/shared/api/client";

export interface RetryFailedBackfillRequest {
    ingestionJobId?: string;
    integrationId?: string;
}

export interface RetryFailedBackfillResponse {
    retried: number;
    jobs: Array<{
        ingestionJobId: string;
        integrationId: string;
        resourceId: string;
        provider: string;
    }>;
}

export const retryFailedBackfill = async (
    orgId: string,
    projectId: string,
    body: RetryFailedBackfillRequest = {},
): Promise<RetryFailedBackfillResponse> => {
    const response = await apiClient.post<RetryFailedBackfillResponse>(
        `/orgs/${orgId}/projects/${projectId}/backfill/retry`,
        body,
    );
    return response.data;
};

export interface ReprocessEventsRequest {
    limit?: number;
    force?: boolean;
}

export interface ReprocessEventsResponse {
    scheduled: number;
    queued: number;
    rawEventIds: string[];
}

export const reprocessEvents = async (
    orgId: string,
    projectId: string,
    body: ReprocessEventsRequest = {},
): Promise<ReprocessEventsResponse> => {
    const response = await apiClient.post<ReprocessEventsResponse>(
        `/orgs/${orgId}/projects/${projectId}/reprocess-events`,
        body,
    );
    return response.data;
};

export interface ResetProjectResponse {
    /** Number of dependent rows wiped per table — keys vary by backend version. */
    cleared?: Record<string, number>;
    message?: string;
}

export const resetProject = async (orgId: string, projectId: string): Promise<ResetProjectResponse> => {
    const response = await apiClient.post<ResetProjectResponse>(
        `/orgs/${orgId}/projects/${projectId}/reset`,
    );
    return response.data;
};

