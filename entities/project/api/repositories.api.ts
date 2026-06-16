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

/** A FileRisk row from `/repositories/risks` — keyed on the risk, with the file nested under `file`. */
export interface FileRiskItem {
    id: string;
    fileId: string;
    projectId: string;
    riskScore: number | null;
    reason: string | null;
    detectedAt?: string | null;
    updatedAt?: string | null;
    file?: {
        id: string;
        path: string;
        language?: string | null;
        riskScore?: number | null;
        repository?: { id: string; name?: string; provider?: string } | null;
    } | null;
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

// The backend returns lists under semantic keys (`repositories`, `files`, `risks`, `commits`)
// not a generic `data` field, so we unwrap explicitly per endpoint here. The legacy
// `unwrapList` helper below only checks `.data` — keep it for endpoints that DO use that
// shape, but don't rely on it for the new ones.

export const listRepositories = async (
    orgId: string,
    projectId: string,
    params?: { provider?: ExternalProvider | string; limit?: number; offset?: number },
): Promise<RepositorySummary[]> => {
    const response = await apiClient.get<{ repositories?: RepositorySummary[] } | RepositorySummary[]>(
        `/orgs/${orgId}/projects/${projectId}/repositories`,
        { params },
    );
    if (Array.isArray(response.data)) { return response.data; }
    return response.data.repositories ?? [];
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
): Promise<FileRiskItem[]> => {
    const response = await apiClient.get<{ risks?: FileRiskItem[] } | FileRiskItem[]>(
        `/orgs/${orgId}/projects/${projectId}/repositories/risks`,
        { params },
    );
    if (Array.isArray(response.data)) { return response.data; }
    return response.data.risks ?? [];
};

export const listCodeFiles = async (
    orgId: string,
    projectId: string,
    repositoryId: string,
    params?: { language?: string; minRiskScore?: number; limit?: number; offset?: number },
): Promise<CodeFileSummary[]> => {
    const response = await apiClient.get<{ files?: CodeFileSummary[] } | CodeFileSummary[]>(
        `/orgs/${orgId}/projects/${projectId}/repositories/${repositoryId}/files`,
        { params },
    );
    if (Array.isArray(response.data)) { return response.data; }
    return response.data.files ?? [];
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

// ───────────────────────────────────────────
//  Commits — file-scoped + project-wide
// ───────────────────────────────────────────

/** A single commit/file-change row, returned by both the file-scoped and project-wide endpoints. */
export interface CommitFeedItem {
    rawEventId: string;
    source?: string | null;
    sourceId?: string | null;
    content?: string | null;
    timestamp?: string | null;
    branchName?: string | null;
    prNumber?: number | null;
    authorName?: string | null;
    authorEmail?: string | null;
    authorMemberId?: string | null;
    isPrimaryBranch?: boolean | null;
    metadata?: Record<string, unknown> | null;
    repository?: { id: string; name?: string; provider?: string; providerRepoId?: string; url?: string } | null;
    llmSummary?: string | null;
    summaryModel?: string | null;
    fileChangesCount?: number;
    additions?: number;
    deletions?: number;

    // Returned by the file-scoped endpoint additionally:
    changeId?: string;
    changeType?: string;
    patch?: string | null;
    changedAt?: string | null;
    eventType?: string;
}

export interface CommitsListResponse {
    commits: CommitFeedItem[];
    total: number;
    limit: number;
    offset: number;
}

export const listFileCommits = async (
    orgId: string,
    projectId: string,
    fileId: string,
    params?: { limit?: number; offset?: number },
): Promise<CommitsListResponse> => {
    const response = await apiClient.get<CommitsListResponse>(
        `/orgs/${orgId}/projects/${projectId}/repositories/code-files/${fileId}/commits`,
        { params },
    );
    return response.data;
};

export const listProjectCommits = async (
    orgId: string,
    projectId: string,
    params?: {
        repositoryId?: string;
        author?: string;
        since?: string;
        until?: string;
        limit?: number;
        offset?: number;
    },
): Promise<CommitsListResponse> => {
    const response = await apiClient.get<CommitsListResponse>(
        `/orgs/${orgId}/projects/${projectId}/repositories/commits`,
        { params },
    );
    return response.data;
};
