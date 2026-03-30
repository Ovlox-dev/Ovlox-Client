import { apiClient } from "@/shared/api/client";
import { apiBaseUrl } from "@/shared/api/client";
import { IIntegration } from "@/types/prisma-generated";
import { ApiResponse, IntegrationStatusEvent, OrgIntegrationStatusItem, OrgIntegrationStatusSseEvent } from "@/types/api-types";

export const listIntegrations = async (orgId: string) => {
    const response = await apiClient.get<OrgIntegrationStatusItem[]>(`/orgs/${orgId}/integrations`);
    return response.data;
};

export const getIntegrationStatus = async (orgId: string, integrationId: string) => {
    const response = await apiClient.get<OrgIntegrationStatusItem>(`/orgs/${orgId}/integrations/${integrationId}`);
    return response.data;
};

// SSE endpoint for integration status updates
export const subscribeToIntegrationStatus = (slug: string, onMessage: (items: OrgIntegrationStatusItem[]) => void) => {
    const eventSource = new EventSource(`${apiBaseUrl}/orgs/integrations/status/${slug}`, {
        withCredentials: true,
    });

    eventSource.onmessage = (event) => {
        const parsed = JSON.parse(event.data) as unknown;

        // New backend format: { data: [...] }
        if (typeof parsed === "object" && parsed !== null && Array.isArray((parsed as OrgIntegrationStatusSseEvent).data)) {
            onMessage((parsed as OrgIntegrationStatusSseEvent).data);
            return;
        }

        // Legacy format: { integrations: [...] }
        if (typeof parsed === "object" && parsed !== null && Array.isArray((parsed as IntegrationStatusEvent).integrations)) {
            const legacy = parsed as IntegrationStatusEvent;
            onMessage(
                legacy.integrations.map((i) => ({
                    app: i.type,
                    authType: "UNKNOWN",
                    status: i.status,
                    integrationId: i.id,
                    externalAccountId: null,
                    externalAccount: null,
                }))
            );
            return;
        }

        // Some servers might send the array directly
        if (Array.isArray(parsed)) {
            onMessage(parsed as OrgIntegrationStatusItem[]);
            return;
        }
    };

    // eventSource.onerror = (error) => {
    //     console.error("SSE error:", error);
    //     eventSource.close();
    // };

    return () => {
        eventSource.close();
    };
};
