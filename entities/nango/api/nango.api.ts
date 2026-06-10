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
