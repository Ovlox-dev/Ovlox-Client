import { apiClient } from "@/shared/api/client";
import type { ExternalProvider } from "@/types/enum";

export interface RepositorySummary {
    id: string;
    name?: string;
    provider?: ExternalProvider | string;
    organizationId?: string;
    projectId?: string;
    externalId?: string;
    defaultBranch?: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
}

export interface CodeFileSummary {
    id: string;
    repositoryId: string;
    path: string;
    language?: string | null;
    riskScore?: number | null;
    sizeBytes?: number | null;
    lastCommitAt?: string | null;
    metadata?: Record<string, unknown>;
}

export interface FileRiskItem extends CodeFileSummary {
    repository?: RepositorySummary;
    riskFactors?: Record<string, unknown>;
}

export interface CodeFileDetail extends CodeFileSummary {
    repository?: RepositorySummary;
    contentSnippet?: string;
    riskFactors?: Record<string, unknown>;
}

export interface ListResponse<T> {
    data: T[];
    total?: number;
    limit?: number;
    offset?: number;
}

export const listRepositories = async (
    orgId: string,
    projectId: string,
    params?: { provider?: ExternalProvider | string; limit?: number; offset?: number },
): Promise<ListResponse<RepositorySummary> | RepositorySummary[]> => {
    const response = await apiClient.get<ListResponse<RepositorySummary> | RepositorySummary[]>(
        `/orgs/${orgId}/projects/${projectId}/repositories`,
        { params },
    );
    return response.data;
};

export const getRepository = async (
    orgId: string,
    projectId: string,
    repositoryId: string,
): Promise<RepositorySummary> => {
    const response = await apiClient.get<RepositorySummary>(
        `/orgs/${orgId}/projects/${projectId}/repositories/${repositoryId}`,
    );
    return response.data;
};

export const listFileRisks = async (
    orgId: string,
    projectId: string,
    params?: { repositoryId?: string; minRiskScore?: number; limit?: number; offset?: number },
): Promise<ListResponse<FileRiskItem> | FileRiskItem[]> => {
    const response = await apiClient.get<ListResponse<FileRiskItem> | FileRiskItem[]>(
        `/orgs/${orgId}/projects/${projectId}/repositories/risks`,
        { params },
    );
    return response.data;
};

export const listCodeFiles = async (
    orgId: string,
    projectId: string,
    repositoryId: string,
    params?: { language?: string; minRiskScore?: number; limit?: number; offset?: number },
): Promise<ListResponse<CodeFileSummary> | CodeFileSummary[]> => {
    const response = await apiClient.get<ListResponse<CodeFileSummary> | CodeFileSummary[]>(
        `/orgs/${orgId}/projects/${projectId}/repositories/${repositoryId}/files`,
        { params },
    );
    return response.data;
};

export const getCodeFile = async (
    orgId: string,
    projectId: string,
    fileId: string,
): Promise<CodeFileDetail> => {
    const response = await apiClient.get<CodeFileDetail>(
        `/orgs/${orgId}/projects/${projectId}/repositories/code-files/${fileId}`,
    );
    return response.data;
};

/** Normalize the list endpoints that may return either a bare array or a wrapper. */
export function unwrapList<T>(payload: ListResponse<T> | T[] | undefined | null): T[] {
    if (!payload) { return []; }
    if (Array.isArray(payload)) { return payload; }
    return payload.data ?? [];
}
