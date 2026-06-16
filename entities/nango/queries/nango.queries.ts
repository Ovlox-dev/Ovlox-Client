import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createNangoSession,
    getNangoConnections,
    getNangoIntegrations,
    syncNangoConnections,
    deleteNangoConnection,
    getNangoResources,
    getSelectedNangoResources,
    getRepoBranches,
    removeNangoResource,
    saveNangoResources,
    reindexNangoConnection,
    syncNangoData,
    setNangoTaskTarget,
    type CreateNangoSessionBody,
    type NangoResourceType,
} from "../api/nango.api";

/* -------------------------------------------------------------------------- */
/*                                   Keys                                     */
/* -------------------------------------------------------------------------- */

export const nangoKeys = {
    all: ["nango"] as const,
    connections: (orgId: string) => [...nangoKeys.all, "connections", orgId] as const,
    integrations: (orgId: string) => [...nangoKeys.all, "integrations", orgId] as const,
    resources: (orgId: string, providerConfigKey: string, connectionId: string, projectId: string) =>
        [...nangoKeys.all, "resources", orgId, providerConfigKey, connectionId, projectId] as const,
    selected: (orgId: string, providerConfigKey: string, connectionId: string, projectId: string) =>
        [...nangoKeys.all, "selected", orgId, providerConfigKey, connectionId, projectId] as const,
    branches: (orgId: string, providerConfigKey: string, connectionId: string, repo: string) =>
        [...nangoKeys.all, "branches", orgId, providerConfigKey, connectionId, repo] as const,
};

/* -------------------------------------------------------------------------- */
/*                                  Queries                                   */
/* -------------------------------------------------------------------------- */

export const useNangoConnections = (orgId: string, enabled = true) =>
    useQuery({
        queryKey: nangoKeys.connections(orgId),
        queryFn: () => getNangoConnections(orgId),
        enabled: !!orgId && enabled,
    });

export const useNangoIntegrations = (orgId: string, enabled = true) =>
    useQuery({
        queryKey: nangoKeys.integrations(orgId),
        queryFn: () => getNangoIntegrations(orgId),
        enabled: !!orgId && enabled,
    });

/* -------------------------------------------------------------------------- */
/*                                 Mutations                                  */
/* -------------------------------------------------------------------------- */

export const useCreateNangoSession = (orgId: string) =>
    useMutation({
        mutationFn: (body: CreateNangoSessionBody = {}) => createNangoSession(orgId, body),
    });

export const useSyncNangoConnections = (orgId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => syncNangoConnections(orgId),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: nangoKeys.connections(orgId) });
        },
    });
};

export const useDeleteNangoConnection = (orgId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { providerConfigKey: string; connectionId: string }) =>
            deleteNangoConnection(orgId, vars.providerConfigKey, vars.connectionId),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: nangoKeys.connections(orgId) });
        },
    });
};

export const useNangoResources = (
    orgId: string,
    providerConfigKey: string,
    connectionId: string,
    projectId: string,
    enabled = true,
) =>
    useQuery({
        queryKey: nangoKeys.resources(orgId, providerConfigKey, connectionId, projectId),
        queryFn: () => getNangoResources(orgId, providerConfigKey, connectionId, projectId),
        enabled: !!orgId && !!providerConfigKey && !!connectionId && !!projectId && enabled,
        // The provider proxy call (e.g. GitHub /user/repos) can be slow/fail; don't spin through
        // multiple retries — fail fast so the picker shows an error instead of hanging.
        retry: false,
    });

export const useSelectedNangoResources = (
    orgId: string,
    providerConfigKey: string,
    connectionId: string,
    projectId: string,
    enabled = true,
) =>
    useQuery({
        queryKey: nangoKeys.selected(orgId, providerConfigKey, connectionId, projectId),
        queryFn: () => getSelectedNangoResources(orgId, providerConfigKey, connectionId, projectId),
        enabled: !!orgId && !!providerConfigKey && !!connectionId && !!projectId && enabled,
    });

export const useRepoBranches = (
    orgId: string,
    providerConfigKey: string,
    connectionId: string,
    repo: string | null,
    enabled = true,
) =>
    useQuery({
        queryKey: nangoKeys.branches(orgId, providerConfigKey, connectionId, repo ?? ""),
        queryFn: () => getRepoBranches(orgId, providerConfigKey, connectionId, repo as string),
        enabled: !!orgId && !!providerConfigKey && !!connectionId && !!repo && enabled,
        retry: false,
    });

export const useRemoveNangoResource = (orgId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { providerConfigKey: string; connectionId: string; projectId: string; resourceId: string }) =>
            removeNangoResource(orgId, vars.providerConfigKey, vars.connectionId, vars.projectId, vars.resourceId),
        onSuccess: (_data, vars) => {
            void qc.invalidateQueries({ queryKey: nangoKeys.resources(orgId, vars.providerConfigKey, vars.connectionId, vars.projectId) });
            void qc.invalidateQueries({ queryKey: nangoKeys.selected(orgId, vars.providerConfigKey, vars.connectionId, vars.projectId) });
        },
    });
};

export const useReindexNangoConnection = (orgId: string) =>
    useMutation({
        mutationFn: (vars: { providerConfigKey: string; connectionId: string; projectId: string }) =>
            reindexNangoConnection(orgId, vars.providerConfigKey, vars.connectionId, vars.projectId),
    });

export const useSyncNangoData = (orgId: string) =>
    useMutation({
        mutationFn: (vars: { providerConfigKey: string; connectionId: string; projectId: string }) =>
            syncNangoData(orgId, vars.providerConfigKey, vars.connectionId, vars.projectId),
    });

export const useSetNangoTaskTarget = (orgId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { providerConfigKey: string; connectionId: string; projectId: string; resourceId: string | null }) =>
            setNangoTaskTarget(orgId, vars.providerConfigKey, vars.connectionId, vars.projectId, vars.resourceId),
        onSuccess: () => {
            // The target is project-wide (one across all connections) — refresh every connection's chips.
            void qc.invalidateQueries({ queryKey: [...nangoKeys.all, "selected", orgId] });
        },
    });
};

export const useSaveNangoResources = (orgId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: {
            providerConfigKey: string;
            connectionId: string;
            projectId: string;
            resources: Array<{ resourceId: string; resourceName?: string; resourceType: NangoResourceType; selectedBranches?: string[] }>;
        }) => saveNangoResources(orgId, vars.providerConfigKey, vars.connectionId, vars.projectId, vars.resources),
        onSuccess: (_data, vars) => {
            void qc.invalidateQueries({
                queryKey: nangoKeys.resources(orgId, vars.providerConfigKey, vars.connectionId, vars.projectId),
            });
        },
    });
};
