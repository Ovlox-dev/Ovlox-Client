import { useQuery } from "@tanstack/react-query";

import { getIngestionStatus } from "../api/ingestion-status.api";

export const ingestionStatusKeys = {
    all: ["ingestion-status"] as const,
    project: (orgId: string, projectId: string) =>
        [...ingestionStatusKeys.all, orgId, projectId] as const,
};

/**
 * Polls every 4s while a job is inflight, every 30s otherwise. The shorter
 * interval picks up backfill progress quickly without hammering the API once
 * everything has settled. Pair with the readiness SSE stream for instant
 * BUILDING ↔ READY transitions.
 */
export const useIngestionStatus = (orgId: string, projectId: string) =>
    useQuery({
        queryKey: ingestionStatusKeys.project(orgId, projectId),
        queryFn: () => getIngestionStatus(orgId, projectId),
        enabled: !!orgId && !!projectId,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data && data.runningJobs && data.runningJobs.length > 0) {
                return 4_000;
            }
            return 30_000;
        },
        staleTime: 2_000,
    });
