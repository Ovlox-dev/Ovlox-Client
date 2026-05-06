import { apiClient } from "@/shared/api/client";

export interface ProjectContextEntry {
    id: string;
    projectId: string;
    title: string;
    summary: string;
    occurredAt: string;
    rawEventId?: string | null;
    llmOutputId?: string | null;
    isDecision: boolean;
    isBlocker: boolean;
    isMilestone: boolean;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
}

export interface ListProjectContextParams {
    isDecision?: boolean;
    isBlocker?: boolean;
    isMilestone?: boolean;
    limit?: number;
    offset?: number;
}

export const listProjectContext = async (
    orgId: string,
    projectId: string,
    params?: ListProjectContextParams,
): Promise<{ contexts: ProjectContextEntry[]; pagination: { total: number; limit: number; offset: number } }> => {
    const response = await apiClient.get(`/orgs/${orgId}/projects/${projectId}/context`, { params });
    return response.data as never;
};
