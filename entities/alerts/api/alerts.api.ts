import { apiClient } from "@/shared/api/client";

export type RiskType = "SECURITY" | "CODE_QUALITY" | "INCIDENT_RISK" | "DELIVERY_DELAY";
export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskAlert {
    id: string;
    projectId: string;
    type: RiskType;
    severity: RiskSeverity;
    title: string;
    description?: string | null;
    sourceEventId?: string | null;
    resolvedAt?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
    sourceEvent?: { id: string; eventType: string; content: string | null } | null;
}

export interface Incident {
    id: string;
    projectId: string;
    title: string;
    description?: string | null;
    severity: string;
    startedAt: string;
    resolvedAt?: string | null;
    rootCauseEventId?: string | null;
    resolvedByMemberId?: string | null;
}

export interface Deployment {
    id: string;
    projectId: string;
    environment: string;
    status: string;
    triggeredAt: string;
}

export const listRiskAlerts = async (
    orgId: string,
    projectId: string,
    params?: { type?: RiskType; severity?: RiskSeverity; resolved?: boolean; limit?: number; offset?: number },
): Promise<{ alerts: RiskAlert[]; total: number }> => {
    const response = await apiClient.get<{ alerts: RiskAlert[]; total: number }>(
        `/orgs/${orgId}/projects/${projectId}/alerts`,
        { params },
    );
    return response.data;
};

export const getRiskAlert = async (
    orgId: string,
    projectId: string,
    alertId: string,
): Promise<RiskAlert> => {
    const response = await apiClient.get<RiskAlert>(
        `/orgs/${orgId}/projects/${projectId}/alerts/${alertId}`,
    );
    return response.data;
};

export const resolveRiskAlert = async (
    orgId: string,
    projectId: string,
    alertId: string,
): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
        `/orgs/${orgId}/projects/${projectId}/alerts/${alertId}/resolve`,
    );
    return response.data;
};

export const listIncidents = async (
    orgId: string,
    projectId: string,
    params?: { resolved?: boolean; limit?: number; offset?: number },
): Promise<{ incidents: Incident[]; total: number }> => {
    const response = await apiClient.get<{ incidents: Incident[]; total: number }>(
        `/orgs/${orgId}/projects/${projectId}/incidents`,
        { params },
    );
    return response.data;
};

export const listDeployments = async (
    orgId: string,
    projectId: string,
    params?: { environment?: string; status?: string; limit?: number; offset?: number },
): Promise<{ deployments: Deployment[]; total: number }> => {
    const response = await apiClient.get<{ deployments: Deployment[]; total: number }>(
        `/orgs/${orgId}/projects/${projectId}/deployments`,
        { params },
    );
    return response.data;
};
