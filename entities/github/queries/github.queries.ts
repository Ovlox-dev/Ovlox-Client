import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getGithubInstallUrl,
    getGithubOAuthUrl,
    getOAuthCallback,
    getGithubRepositories,
    getRepositoriesByProject,
    syncGithubRepositories,
    getGithubOverview,
    ingestGithubData,
    getGithubCommits,
    getGithubPullRequests,
    getGithubIssues,
    getGithubCommitDetails,
    debugGithubCommit,
    autoConnectGithubIntegration,
} from "../api/github.api";

/* -------------------------------------------------------------------------- */
/*                                   Keys                                     */
/* -------------------------------------------------------------------------- */

export const githubKeys = {
    all: ["github"] as const,

    installUrl: (orgId: string) =>
        [...githubKeys.all, "install-url", orgId] as const,

    oauthUrl: (orgId: string, force?: boolean) =>
        [...githubKeys.all, "oauth-url", orgId, force] as const,

    repos: (integrationId: string) =>
        [...githubKeys.all, "repos", integrationId] as const,

    projectRepos: (integrationId: string, projectId: string) =>
        [...githubKeys.repos(integrationId), "project", projectId] as const,

    overview: (
        integrationId: string,
        repoFullName?: string,
        projectId?: string
    ) =>
        [
            ...githubKeys.all,
            "overview",
            integrationId,
            repoFullName,
            projectId,
        ] as const,

    commits: (integrationId: string, params?: string) =>
        [...githubKeys.all, "commits", integrationId, params] as const,

    commitDetail: (
        integrationId: string,
        sha: string,
        repoFullName?: string,
        projectId?: string
    ) =>
        [
            ...githubKeys.all,
            "commit",
            integrationId,
            sha,
            repoFullName,
            projectId,
        ] as const,

    pullRequests: (integrationId: string, params?: string) =>
        [...githubKeys.all, "prs", integrationId, params] as const,

    issues: (integrationId: string, params?: string) =>
        [...githubKeys.all, "issues", integrationId, params] as const,
};

/* -------------------------------------------------------------------------- */
/*                                   Queries                                  */
/* -------------------------------------------------------------------------- */

export const useGithubInstallUrl = (orgId?: string) =>
    useQuery({
        queryKey: orgId ? githubKeys.installUrl(orgId) : [],
        queryFn: () => getGithubInstallUrl(orgId!),
        enabled: !!orgId,
    });

export const useGithubOAuthUrl = (orgId?: string, force?: boolean) =>
    useQuery({
        queryKey: orgId ? githubKeys.oauthUrl(orgId, force) : [],
        queryFn: () => getGithubOAuthUrl(orgId!, force),
        enabled: !!orgId,
    });

export const useGithubRepositories = (integrationId?: string) =>
    useQuery({
        queryKey: integrationId ? githubKeys.repos(integrationId) : [],
        queryFn: () => getGithubRepositories(integrationId!),
        enabled: !!integrationId,
    });

export const useGithubRepositoriesByProject = (
    integrationId?: string,
    projectId?: string
) =>
    useQuery({
        queryKey:
            integrationId && projectId
                ? githubKeys.projectRepos(integrationId, projectId)
                : [],
        queryFn: () =>
            getRepositoriesByProject(integrationId!, projectId!),
        enabled: !!integrationId && !!projectId,
    });

export const useGithubOverview = (
    integrationId?: string,
    repoFullName?: string,
    projectId?: string
) =>
    useQuery({
        queryKey:
            integrationId
                ? githubKeys.overview(integrationId, repoFullName, projectId)
                : [],
        queryFn: () =>
            getGithubOverview(integrationId!, repoFullName, projectId),
        enabled: !!integrationId,
    });

export const useGithubCommits = (
    integrationId?: string,
    options?: {
        repoFullName?: string;
        branch?: string;
        limit?: number;
        projectId?: string;
        repo?: string;
    }
) =>
    useQuery({
        queryKey:
            integrationId
                ? githubKeys.commits(integrationId,)
                : [],
        queryFn: () => getGithubCommits(integrationId!, options),
        enabled: !!integrationId,
    });

export const useGithubPullRequests = (
    integrationId?: string,
    options?: {
        repoFullName?: string;
        state?: string;
        limit?: number;
        projectId?: string;
        repo?: string;
    }
) =>
    useQuery({
        queryKey:
            integrationId
                ? githubKeys.pullRequests(integrationId)
                : [],
        queryFn: () => getGithubPullRequests(integrationId!, options),
        enabled: !!integrationId,
    });

export const useGithubIssues = (
    integrationId?: string,
    options?: {
        repoFullName?: string;
        state?: string;
        limit?: number;
        projectId?: string;
        repo?: string;
    }
) =>
    useQuery({
        queryKey:
            integrationId
                ? githubKeys.issues(integrationId)
                : [],
        queryFn: () => getGithubIssues(integrationId!, options),
        enabled: !!integrationId,
    });

export const useGithubCommitDetails = (
    integrationId?: string,
    sha?: string,
    options?: {
        repoFullName?: string;
        projectId?: string;
        repo?: string;
    }
) =>
    useQuery({
        queryKey:
            integrationId && sha
                ? githubKeys.commitDetail(
                    integrationId,
                    sha,
                    options?.repoFullName ?? options?.repo,
                    options?.projectId
                )
                : [],
        queryFn: () =>
            getGithubCommitDetails(integrationId!, sha!, options),
        enabled: !!integrationId && !!sha,
    });

/* -------------------------------------------------------------------------- */
/*                                  Mutations                                 */
/* -------------------------------------------------------------------------- */

export const useGithubOAuthCallback = () =>
    useMutation({
        mutationFn: ({
            code,
            state,
            installationId,
            setupAction,
        }: {
            code: string;
            state: string;
            installationId: string;
            setupAction: string;
        }) => getOAuthCallback(code, state, installationId, setupAction),
    });

export const useSyncGithubRepositories = (integrationId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (projectId?: string) =>
            syncGithubRepositories(integrationId, projectId),
        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: githubKeys.repos(integrationId),
            });
        },
    });
};

export const useIngestGithubData = (integrationId: string) =>
    useMutation({
        mutationFn: (repoId?: string) =>
            ingestGithubData(integrationId, repoId),
    });

export const useDebugGithubCommit = (
    integrationId: string,
    sha: string
) =>
    useMutation({
        mutationFn: (options?: {
            repoFullName?: string;
            projectId?: string;
            repo?: string;
        }) => debugGithubCommit(integrationId, sha, options),
    });

export const useAutoConnectGithubIntegration = (orgId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (sourceOrgId: string) =>
            autoConnectGithubIntegration(orgId, sourceOrgId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["orgs"] });
        },
    });
};