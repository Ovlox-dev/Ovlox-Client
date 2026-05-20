import { apiClient } from "@/shared/api/client";

/**
 * Shape returned by `GET /orgs/:orgId/projects/:projectId/ingestion-status`.
 * Every list is bounded server-side (running ≤ 50, recent ≤ 25, lastSync ≤ 30).
 */
export interface IngestionStatus {
    projectId: string;
    totalEvents: number;
    runningJobs: Array<{
        id: string;
        type: string;
        status: "PENDING" | "RUNNING";
        progress: { current?: number; total?: number; message?: string } | null;
        startedAt: string | null;
        createdAt: string;
        provider: string | null;
        resourceName: string | null;
        resourceProviderId: string | null;
    }>;
    recentJobs: Array<{
        id: string;
        type: string;
        status: "COMPLETED" | "FAILED";
        error: string | null;
        startedAt: string | null;
        finishedAt: string | null;
        createdAt: string;
        provider: string | null;
        resourceName: string | null;
    }>;
    eventCountsBySource: Array<{
        source: string;
        eventType: string;
        count: number;
        lastEventAt: string;
    }>;
    lastSyncByResource: Array<{
        source: string;
        resourceId: string;
        resourceName: string | null;
        resourceProviderId: string | null;
        eventCount: number;
        lastEventAt: string;
    }>;
}

export const getIngestionStatus = async (
    orgId: string,
    projectId: string,
): Promise<IngestionStatus> => {
    const response = await apiClient.get<IngestionStatus>(
        `/orgs/${orgId}/projects/${projectId}/ingestion-status`,
    );
    return response.data;
};
