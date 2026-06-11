import { apiClient } from "@/shared/api/client";

/* -------------------------------------------------------------------------- */
/*                                   Types                                     */
/* -------------------------------------------------------------------------- */

export interface NangoConnection {
    id: string;
    organizationId: string;
    projectId: string | null;
    integrationId: string | null;
    providerConfigKey: string;
    connectionId: string;
    endUserId: string | null;
    provider: string | null;
    status: string;
    metadata: Record<string, unknown> | null;
    created_at?: string;
    updated_at?: string;
}

export interface NangoIntegrationConfig {
    unique_key: string;
    provider: string;
    display_name?: string;
    logo?: string;
    forward_webhooks?: boolean;
}

export interface CreateNangoSessionBody {
    projectId?: string;
    email?: string;
    displayName?: string;
    allowedIntegrations?: string[];
}

export interface CreateNangoSessionResponse {
    sessionToken: string;
    expiresAt?: string;
    /** Ready-to-open Nango Connect UI URL — open in a popup to run the provider OAuth/install. */
    connectUrl: string;
}

export interface SyncNangoConnectionsResponse {
    imported: number;
    skipped: number;
    total: number;
}

/* -------------------------------------------------------------------------- */
/*                                   API                                      */
/* -------------------------------------------------------------------------- */

/** Create a Connect session. The response's `connectUrl` is opened to run the provider auth flow. */
export const createNangoSession = async (
    orgId: string,
    body: CreateNangoSessionBody = {},
): Promise<CreateNangoSessionResponse> => {
    const res = await apiClient.post<CreateNangoSessionResponse>(`/orgs/${orgId}/nango/session`, body);
    return res.data;
};

/** Connections already recorded in our DB for this org (populated after a successful connect). */
export const getNangoConnections = async (orgId: string): Promise<NangoConnection[]> => {
    const res = await apiClient.get<NangoConnection[]>(`/orgs/${orgId}/nango/connections`);
    return res.data;
};

/** Provider configs registered in Nango (the connectable providers). */
export const getNangoIntegrations = async (orgId: string): Promise<{ configs: NangoIntegrationConfig[] }> => {
    const res = await apiClient.get<{ configs: NangoIntegrationConfig[] }>(`/orgs/${orgId}/nango/integrations`);
    return res.data;
};

/** Reconcile connections from Nango into our DB — fallback when the auth webhook was missed. */
export const syncNangoConnections = async (orgId: string): Promise<SyncNangoConnectionsResponse> => {
    const res = await apiClient.post<SyncNangoConnectionsResponse>(`/orgs/${orgId}/nango/connections/sync`, {});
    return res.data;
};

export const deleteNangoConnection = async (
    orgId: string,
    providerConfigKey: string,
    connectionId: string,
): Promise<{ deleted: boolean }> => {
    const res = await apiClient.delete<{ deleted: boolean }>(
        `/orgs/${orgId}/nango/connections/${encodeURIComponent(providerConfigKey)}/${encodeURIComponent(connectionId)}`,
    );
    return res.data;
};

export const getNangoConfig = async (orgId: string): Promise<{ nangoHost: string }> => {
    const res = await apiClient.get<{ nangoHost: string }>(`/orgs/${orgId}/nango/config`);
    return res.data;
};

/* -------------------------------------------------------------------------- */
/*                        BULK ingest resource selection                      */
/* -------------------------------------------------------------------------- */

export type NangoResourceType = "repo" | "channel" | "project" | "team";

export interface NangoResource {
    resourceId: string;
    resourceName: string;
    resourceType: NangoResourceType;
    selected: boolean;
    metadata?: Record<string, unknown>;
}

export interface NangoRepoBranch {
    name: string;
    isDefault: boolean;
}

/** Live channels/projects/teams on a connection, annotated with the project's current selection. */
export const getNangoResources = async (
    orgId: string,
    providerConfigKey: string,
    connectionId: string,
    projectId: string,
): Promise<NangoResource[]> => {
    const res = await apiClient.get<{ resources: NangoResource[] }>(
        `/orgs/${orgId}/nango/connections/${encodeURIComponent(providerConfigKey)}/${encodeURIComponent(connectionId)}/resources`,
        { params: { projectId } },
    );
    return res.data.resources ?? [];
};

/** Branches of a GitHub repo (for the multi-branch / environment picker). Default branch first. */
export const getRepoBranches = async (
    orgId: string,
    providerConfigKey: string,
    connectionId: string,
    repo: string,
): Promise<NangoRepoBranch[]> => {
    const res = await apiClient.get<{ branches: NangoRepoBranch[] }>(
        `/orgs/${orgId}/nango/connections/${encodeURIComponent(providerConfigKey)}/${encodeURIComponent(connectionId)}/branches`,
        { params: { repo } },
    );
    return res.data.branches ?? [];
};

/** Remove ONE resource (repo/channel/project/team) from a SINGLE project — connection stays intact. */
export const removeNangoResource = async (
    orgId: string,
    providerConfigKey: string,
    connectionId: string,
    projectId: string,
    resourceId: string,
): Promise<{ removed: boolean; rawEventsDeleted: number; repositoryDeleted: boolean }> => {
    const res = await apiClient.delete<{ removed: boolean; rawEventsDeleted: number; repositoryDeleted: boolean }>(
        `/orgs/${orgId}/nango/connections/${encodeURIComponent(providerConfigKey)}/${encodeURIComponent(connectionId)}/resources`,
        { params: { projectId, resourceId } },
    );
    return res.data;
};

/** Re-trigger code-indexing for the selected GitHub repos on a connection (project-scoped). */
export const reindexNangoConnection = async (
    orgId: string,
    providerConfigKey: string,
    connectionId: string,
    projectId: string,
): Promise<{ repos: number }> => {
    const res = await apiClient.post<{ repos: number }>(
        `/orgs/${orgId}/nango/connections/${encodeURIComponent(providerConfigKey)}/${encodeURIComponent(connectionId)}/reindex`,
        { projectId },
    );
    return res.data;
};

/** Save which resources to ingest for a project; newly-selected ones are backfilled server-side. */
export const saveNangoResources = async (
    orgId: string,
    providerConfigKey: string,
    connectionId: string,
    projectId: string,
    resources: Array<{ resourceId: string; resourceName?: string; resourceType: NangoResourceType; selectedBranches?: string[] }>,
): Promise<{ selected: number; backfillsEnqueued: number }> => {
    const res = await apiClient.post<{ selected: number; backfillsEnqueued: number }>(
        `/orgs/${orgId}/nango/connections/${encodeURIComponent(providerConfigKey)}/${encodeURIComponent(connectionId)}/resources`,
        { projectId, resources },
    );
    return res.data;
};
