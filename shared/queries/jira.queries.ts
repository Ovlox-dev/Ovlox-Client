import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getJiraInstallUrl,
    getJiraProjects,
    ingestJira,
    syncJiraProjects,
} from "@/shared/api/integration-jira";

export const jiraKeys = {
    all: ["jira"] as const,
    installUrl: (orgId?: string, integrationId?: string) =>
        [...jiraKeys.all, "install-url", orgId, integrationId] as const,
    projects: (integrationId?: string) =>
        [...jiraKeys.all, "projects", integrationId] as const,
    ingest: () => [...jiraKeys.all, "ingest"] as const,
    syncProjects: () => [...jiraKeys.all, "sync-projects"] as const,
};

export const useGetJiraInstallUrl = (orgId?: string, integrationId?: string) =>
    useQuery({
        queryKey: jiraKeys.installUrl(orgId, integrationId),
        queryFn: () => getJiraInstallUrl(orgId!, integrationId!),
        enabled: !!orgId && !!integrationId,
    });

export const useGetJiraProjects = (integrationId?: string) =>
    useQuery({
        queryKey: jiraKeys.projects(integrationId),
        queryFn: () => getJiraProjects(integrationId!),
        enabled: !!integrationId,
    });

export const useSyncJiraProjects = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ integrationId }: { integrationId: string }) =>
            syncJiraProjects(integrationId),
        onSuccess: (_, vars) => {
            qc.invalidateQueries({
                queryKey: jiraKeys.projects(vars.integrationId),
            });
        },
    });
};

export const useIngestJira = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
            integrationId,
            projectKey,
            jql,
        }: {
            integrationId: string;
            projectKey?: string;
            jql?: string;
        }) => ingestJira(integrationId, projectKey, jql),
        onSuccess: (_, vars) => {
            // Ingest may update what the backend considers "available resources"
            // and/or what the project has linked; keep Jira project list fresh.
            qc.invalidateQueries({
                queryKey: jiraKeys.projects(vars.integrationId),
            });
        },
    });
};

