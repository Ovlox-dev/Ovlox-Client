import { apiClient } from "@/shared/api/client";

export interface Contributor {
    key: string;
    name: string | null;
    email: string | null;
    memberId: string | null;
    identityId: string | null;
    commits: number;
    pullRequests: number;
    messages: number;
    tasks: number;
    other: number;
}

export interface ContributionMapResponse {
    projectId: string;
    totalEvents: number;
    contributors: Contributor[];
    /** Daily bucket counts keyed by YYYY-MM-DD (UTC). Used by the Insights heatmap. */
    heatmap?: Array<{ date: string; count: number }>;
}

export const getContributionMap = async (
    orgId: string,
    projectId: string,
    params?: { since?: string; until?: string },
): Promise<ContributionMapResponse> => {
    const response = await apiClient.get<ContributionMapResponse>(
        `/orgs/${orgId}/projects/${projectId}/contributions`,
        { params },
    );
    return response.data;
};
