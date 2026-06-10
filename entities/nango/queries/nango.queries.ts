import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createNangoSession,
    getNangoConnections,
    getNangoIntegrations,
    syncNangoConnections,
    deleteNangoConnection,
    type CreateNangoSessionBody,
} from "../api/nango.api";

/* -------------------------------------------------------------------------- */
/*                                   Keys                                     */
/* -------------------------------------------------------------------------- */

export const nangoKeys = {
    all: ["nango"] as const,
    connections: (orgId: string) => [...nangoKeys.all, "connections", orgId] as const,
    integrations: (orgId: string) => [...nangoKeys.all, "integrations", orgId] as const,
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
