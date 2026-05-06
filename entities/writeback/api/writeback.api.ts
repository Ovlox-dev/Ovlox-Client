import { apiClient } from "@/shared/api/client";

export type WritebackActionStatus =
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "EXECUTING"
    | "EXECUTED"
    | "FAILED"
    | "CANCELLED";

export type WritebackActionType =
    | "PR_COMMENT"
    | "PR_REVIEW"
    | "CREATE_TICKET"
    | "UPDATE_TICKET"
    | "SLACK_MESSAGE"
    | "DISCORD_MESSAGE"
    | "CREATE_GITHUB_ISSUE"
    | "CLOSE_GITHUB_ISSUE";

export type WritebackRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Writeback {
    id: string;
    organizationId: string;
    projectId?: string | null;
    actionType: WritebackActionType;
    status: WritebackActionStatus;
    riskLevel?: WritebackRiskLevel | null;
    targetProvider?: string | null;
    targetExternalId?: string | null;
    payload?: Record<string, unknown> | null;
    reasoning?: string | null;
    suggestedBy?: string | null;
    approvedBy?: string | null;
    approvedAt?: string | null;
    rejectedBy?: string | null;
    rejectedAt?: string | null;
    rejectionNote?: string | null;
    executedAt?: string | null;
    failureReason?: string | null;
    createdAt: string;
    updatedAt: string;
    project?: { id: string; name: string } | null;
    suggester?: { id: string; firstName?: string | null; lastName?: string | null } | null;
}

export interface ListWritebacksParams {
    projectId?: string;
    status?: WritebackActionStatus;
    limit?: number;
    offset?: number;
}

export interface ListWritebacksResponse {
    data: Writeback[];
    total?: number;
    limit?: number;
    offset?: number;
}

export const listWritebacks = async (
    orgId: string,
    params?: ListWritebacksParams,
): Promise<ListWritebacksResponse | Writeback[]> => {
    const response = await apiClient.get<ListWritebacksResponse | Writeback[]>(
        `/orgs/${orgId}/writebacks`,
        { params },
    );
    return response.data;
};

export const getWriteback = async (orgId: string, writebackId: string): Promise<Writeback> => {
    const response = await apiClient.get<Writeback>(`/orgs/${orgId}/writebacks/${writebackId}`);
    return response.data;
};

export const approveWriteback = async (
    orgId: string,
    writebackId: string,
): Promise<{ message: string; status?: WritebackActionStatus }> => {
    const response = await apiClient.post<{ message: string; status?: WritebackActionStatus }>(
        `/orgs/${orgId}/writebacks/${writebackId}/approve`,
    );
    return response.data;
};

export const rejectWriteback = async (
    orgId: string,
    writebackId: string,
    note?: string,
): Promise<{ message: string; status?: WritebackActionStatus }> => {
    const response = await apiClient.post<{ message: string; status?: WritebackActionStatus }>(
        `/orgs/${orgId}/writebacks/${writebackId}/reject`,
        note ? { note } : {},
    );
    return response.data;
};

export function unwrapWritebacks(payload: ListWritebacksResponse | Writeback[] | undefined | null): Writeback[] {
    if (!payload) { return []; }
    if (Array.isArray(payload)) { return payload; }
    return payload.data ?? [];
}
