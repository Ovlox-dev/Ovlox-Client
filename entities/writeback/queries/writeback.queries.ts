import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    type ListWritebacksParams,
    approveWriteback,
    getWriteback,
    listWritebacks,
    rejectWriteback,
    unwrapWritebacks,
} from "../api/writeback.api";

export const writebackKeys = {
    all: ["writebacks"] as const,
    list: (orgId: string, params?: unknown) => [...writebackKeys.all, "list", orgId, params] as const,
    detail: (orgId: string, writebackId: string) => [...writebackKeys.all, orgId, writebackId] as const,
};

export const useListWritebacks = (orgId: string, params?: ListWritebacksParams) =>
    useQuery({
        queryKey: writebackKeys.list(orgId, params),
        queryFn: async () => unwrapWritebacks(await listWritebacks(orgId, params)),
        enabled: !!orgId,
    });

export const useGetWriteback = (orgId: string, writebackId: string | undefined) =>
    useQuery({
        queryKey: writebackKeys.detail(orgId, writebackId ?? ""),
        queryFn: () => getWriteback(orgId, writebackId!),
        enabled: !!orgId && !!writebackId,
    });

export const useApproveWriteback = (orgId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (writebackId: string) => approveWriteback(orgId, writebackId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: writebackKeys.all });
        },
    });
};

export const useRejectWriteback = (orgId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vars: { writebackId: string; note?: string }) =>
            rejectWriteback(orgId, vars.writebackId, vars.note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: writebackKeys.all });
        },
    });
};
