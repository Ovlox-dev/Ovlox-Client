import { apiClient } from "@/shared/api/client";

export type TimelineCategory =
    | "DECISION"
    | "BLOCKER"
    | "MILESTONE"
    | "INCIDENT"
    | "RISK_ALERT"
    | "FEATURE"
    | "COMMIT"
    | "PULL_REQUEST"
    | "CONTEXT"
    | string;

export interface TimelineEntry {
    category: TimelineCategory;
    id: string;
    title: string;
    summary: string | null;
    severity: string | null;
    occurredAt: string;
    sourceEventId: string | null;
    metadata?: Record<string, unknown> | null;
}

export interface ProjectTimelineResponse {
    projectId: string;
    range: { since: string; until: string };
    count: number;
    categories: TimelineCategory[];
    entries: TimelineEntry[];
}

export interface GetTimelineParams {
    since?: string;
    until?: string;
    categories?: TimelineCategory[];
    limit?: number;
}

export const getProjectTimeline = async (
    orgId: string,
    projectId: string,
    params?: GetTimelineParams,
): Promise<ProjectTimelineResponse> => {
    const queryParams: Record<string, string | number> = {};
    if (params?.since) {queryParams.since = params.since;}
    if (params?.until) {queryParams.until = params.until;}
    if (params?.categories && params.categories.length > 0) {
        queryParams.categories = params.categories.join(",");
    }
    if (params?.limit) {queryParams.limit = params.limit;}

    const response = await apiClient.get<ProjectTimelineResponse>(
        `/orgs/${orgId}/projects/${projectId}/timeline`,
        { params: queryParams },
    );
    return response.data;
};
