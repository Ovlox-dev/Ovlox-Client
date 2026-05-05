import { useQuery } from "@tanstack/react-query";

import { type GetTimelineParams, getProjectTimeline } from "../api/timeline.api";

export const timelineKeys = {
    all: ["timeline"] as const,
    project: (orgId: string, projectId: string, params?: unknown) =>
        [...timelineKeys.all, orgId, projectId, params] as const,
};

export const useGetTimeline = (
    orgId: string,
    projectId: string,
    params?: GetTimelineParams,
) =>
    useQuery({
        queryKey: timelineKeys.project(orgId, projectId, params),
        queryFn: () => getProjectTimeline(orgId, projectId, params),
        enabled: !!orgId && !!projectId,
    });
