import { apiClient } from "@/shared/api/client";
import {
    GetInstallUrlResponse,
    GitHubRepo,
    GitHubOverview,
    ApiResponse,
    GitHubCommitSummary,
    GitHubCommitDetail,
    DebugGithubCommitResponse,
    GitHubPullRequest,
    GitHubPullRequestsResponse,
    GitHubIssue,
    GitHubIssuesResponse,
    GitHubCommitsResponse,
    ProjectRepositoriesResponse,
    SyncRepositoriesResponse,
} from "@/types/api-types";

export const getGithubInstallUrl = async (orgId: string): Promise<GetInstallUrlResponse> => {
    const response = await apiClient.get<GetInstallUrlResponse>(`/integrations/github/install/${orgId}`);
    return response.data;
};

// Optional "force" parameter to reconnect with a different GitHub account
export const getGithubOAuthUrl = async (orgId: string, force?: boolean): Promise<GetInstallUrlResponse> => {
    const response = await apiClient.get<GetInstallUrlResponse>(`/integrations/github/oauth/${orgId}`, {
        params: force ? { force: true } : undefined,
    });
    return response.data;
};

export const getOAuthCallback = async (code: string, state: string, installationId: string, setupAction: string): Promise<ApiResponse> => {
    const response = await apiClient.get<ApiResponse>(`/integrations/github/callback?code=${code}&state=${state}&installation_id=${installationId}&setup_action=${setupAction}`);
    return response.data;
};

export const postWebhookHandler = async (): Promise<ApiResponse> => {
    const response = await apiClient.post<ApiResponse>(`/integrations/github/webhook`);
    return response.data;
};


export type GithubRepositoriesResponse = {
    data: Array<Pick<GitHubRepo, "id" | "name" | "url" | "default_branch" | "updated_at" | "pushed_at">>;
    pagination?: {
        page: number;
        perPage: number;
        totalCount: number;
        totalPages: number;
    };
};

export const getGithubRepositories = async (integrationId: string): Promise<GithubRepositoriesResponse> => {
    const response = await apiClient.get<{
        data: Array<Pick<GitHubRepo, "id" | "name" | "url" | "default_branch" | "updated_at" | "pushed_at">>;
        pagination?: {
            page: number;
            perPage: number;
            totalCount: number;
            totalPages: number;
        };
    }>(`/integrations/github/repo/${integrationId}`);
    return response.data;
};

// Get repositories linked to a specific project
export const getRepositoriesByProject = async (integrationId: string, projectId: string): Promise<ProjectRepositoriesResponse> => {
    const response = await apiClient.get<ProjectRepositoriesResponse>(`/integrations/github/repo/${integrationId}/project/${projectId}`);
    return response.data;
};

export const syncGithubRepositories = async (integrationId: string, projectId?: string): Promise<SyncRepositoriesResponse> => {
    const params: Record<string, string> = {};
    if (projectId) { params.projectId = projectId; }

    const response = await apiClient.post<SyncRepositoriesResponse>(`/integrations/github/sync-repos/${integrationId}`, null, { params });
    return response.data;
};

export const getGithubOverview = async (integrationId: string, repoFullName?: string, projectId?: string): Promise<GitHubOverview> => {
    const params: Record<string, string> = {};
    if (repoFullName) { params.repoFullName = repoFullName; }
    if (projectId) { params.projectId = projectId; }

    const response = await apiClient.get<GitHubOverview>(`/integrations/github/overview/${integrationId}`, { params });
    return response.data;
};

export const ingestGithubData = async (integrationId: string, repoId?: string) => {
    const params = repoId ? { repoId } : {};
    const response = await apiClient.post<ApiResponse>(`/integrations/github/ingest/${integrationId}`, null, { params });
    return response.data;
};

export const getGithubCommits = async (
    integrationId: string,
    options?: { repoFullName?: string; branch?: string; limit?: number; projectId?: string; repo?: string }
): Promise<GitHubCommitSummary[]> => {
    const params: Record<string, string | number> = {};
    const repoFullName = options?.repoFullName ?? options?.repo;
    if (repoFullName) { params.repoFullName = repoFullName; }
    if (options?.branch) { params.branch = options.branch; }
    if (options?.projectId) { params.projectId = options.projectId; }
    if (options?.limit) { params.limit = options.limit; }

    const response = await apiClient.get<GitHubCommitsResponse>(`/integrations/github/commits/${integrationId}`, { params });
    return response.data.commits || [];
};

export const getGithubPullRequests = async (
    integrationId: string,
    options?: { repoFullName?: string; state?: string; limit?: number; projectId?: string; repo?: string }
): Promise<GitHubPullRequest[]> => {
    const params: Record<string, string | number> = {};
    const repoFullName = options?.repoFullName ?? options?.repo;
    if (repoFullName) { params.repoFullName = repoFullName; }
    if (options?.state) { params.state = options.state; }
    if (options?.projectId) { params.projectId = options.projectId; }
    if (options?.limit) { params.limit = options.limit; }

    const response = await apiClient.get<GitHubPullRequestsResponse>(`/integrations/github/pull-requests/${integrationId}`, { params });
    return response.data.pullRequests || [];
};

export const getGithubIssues = async (
    integrationId: string,
    options?: { repoFullName?: string; state?: string; limit?: number; projectId?: string; repo?: string }
): Promise<GitHubIssue[]> => {
    const params: Record<string, string | number> = {};
    const repoFullName = options?.repoFullName ?? options?.repo;
    if (repoFullName) { params.repoFullName = repoFullName; }
    if (options?.state) { params.state = options.state; }
    if (options?.projectId) { params.projectId = options.projectId; }
    if (options?.limit) { params.limit = options.limit; }

    const response = await apiClient.get<GitHubIssuesResponse>(`/integrations/github/issues/${integrationId}`, { params });
    return response.data.issues || [];
};

export const getGithubCommitDetails = async (
    integrationId: string,
    sha: string,
    options?: { repoFullName?: string; projectId?: string; repo?: string }
): Promise<GitHubCommitDetail> => {
    const params: Record<string, string> = {};
    const repoFullName = options?.repoFullName ?? options?.repo;
    if (repoFullName) { params.repoFullName = repoFullName; }
    if (options?.projectId) { params.projectId = options.projectId; }

    const response = await apiClient.get<GitHubCommitDetail>(`/integrations/github/commit/details/${integrationId}/${sha}`, { params });
    return response.data;
};

export const debugGithubCommit = async (
    integrationId: string,
    sha: string,
    options?: { repoFullName?: string; projectId?: string; repo?: string }
): Promise<DebugGithubCommitResponse> => {
    const params: Record<string, string> = {};
    const repoFullName = options?.repoFullName ?? options?.repo;
    if (repoFullName) { params.repoFullName = repoFullName; }
    if (options?.projectId) { params.projectId = options.projectId; }

    const response = await apiClient.get<DebugGithubCommitResponse>(`/integrations/github/debug/${integrationId}/${sha}`, { params });
    return response.data;
};

// Auto-connect GitHub integration using installation from another org
export const autoConnectGithubIntegration = async (orgId: string, sourceOrgId: string) => {
    const response = await apiClient.post<ApiResponse>(`/orgs/${orgId}/integrations/github/auto-connect`, {
        sourceOrgId,
    });
    return response.data;
};

// Export types for convenience
export type { GitHubCommitSummary, GitHubCommitDetail, DebugGithubCommitResponse, GitHubPullRequest, GitHubIssue, ProjectRepositoriesResponse };
