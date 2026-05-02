import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    type RiskSeverity,
    type RiskType,
    listDeployments,
    listIncidents,
    listRiskAlerts,
    resolveRiskAlert,
} from "../api/alerts.api";

export const alertsKeys = {
    all: ["alerts"] as const,
    riskAlerts: (orgId: string, projectId: string, params?: unknown) =>
        [...alertsKeys.all, "risk", orgId, projectId, params] as const,
    incidents: (orgId: string, projectId: string, params?: unknown) =>
        [...alertsKeys.all, "incidents", orgId, projectId, params] as const,
    deployments: (orgId: string, projectId: string, params?: unknown) =>
        [...alertsKeys.all, "deployments", orgId, projectId, params] as const,
};

export const useListRiskAlerts = (
    orgId: string,
    projectId: string,
    params?: { type?: RiskType; severity?: RiskSeverity; resolved?: boolean; limit?: number; offset?: number },
) =>
    useQuery({
        queryKey: alertsKeys.riskAlerts(orgId, projectId, params),
        queryFn: () => listRiskAlerts(orgId, projectId, params),
        enabled: !!orgId && !!projectId,
    });

export const useResolveRiskAlert = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (alertId: string) => resolveRiskAlert(orgId, projectId, alertId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...alertsKeys.all, "risk", orgId, projectId],
            });
        },
    });
};

export const useListIncidents = (
    orgId: string,
    projectId: string,
    params?: { resolved?: boolean; limit?: number; offset?: number },
) =>
    useQuery({
        queryKey: alertsKeys.incidents(orgId, projectId, params),
        queryFn: () => listIncidents(orgId, projectId, params),
        enabled: !!orgId && !!projectId,
    });

export const useListDeployments = (
    orgId: string,
    projectId: string,
    params?: { environment?: string; status?: string; limit?: number; offset?: number },
) =>
    useQuery({
        queryKey: alertsKeys.deployments(orgId, projectId, params),
        queryFn: () => listDeployments(orgId, projectId, params),
        enabled: !!orgId && !!projectId,
    });
