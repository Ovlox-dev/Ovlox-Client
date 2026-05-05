import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    type GrantCreditsRequest,
    getOrgCreditBalance,
    grantCredits,
    listCreditTransactions,
} from "../api/credits.api";

export const adminCreditsKeys = {
    all: ["admin", "credits"] as const,
    balance: (orgId: string) => [...adminCreditsKeys.all, "balance", orgId] as const,
    transactions: (orgId: string) => [...adminCreditsKeys.all, "transactions", orgId] as const,
};

export const useOrgCreditBalance = (orgId: string) =>
    useQuery({
        queryKey: adminCreditsKeys.balance(orgId),
        queryFn: () => getOrgCreditBalance(orgId),
        enabled: !!orgId,
    });

export const useListCreditTransactions = (orgId: string) =>
    useQuery({
        queryKey: adminCreditsKeys.transactions(orgId),
        queryFn: () => listCreditTransactions(orgId),
        enabled: !!orgId,
    });

export const useGrantCredits = (orgId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: GrantCreditsRequest) => grantCredits(orgId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminCreditsKeys.balance(orgId) });
            queryClient.invalidateQueries({ queryKey: adminCreditsKeys.transactions(orgId) });
        },
    });
};
