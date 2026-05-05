import { apiClient } from "@/shared/api/client";

export type CreditTransactionType =
    | "PURCHASE"
    | "REFUND"
    | "USAGE"
    | "BONUS"
    | "ADJUSTMENT"
    | "SUBSCRIPTION"
    | "EXPIRY"
    | "OVERAGE_USAGE";

export interface CreditTransaction {
    id: string;
    type: CreditTransactionType;
    status: string;
    amount: string;
    balanceBefore: string;
    balanceAfter: string;
    description?: string | null;
    processedById?: string | null;
    processedAt?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at: string;
}

export interface OrgCreditsBalance {
    organizationId: string;
    creditBalance: string | null;
}

export interface GrantCreditsRequest {
    amount: number | string;
    type?: CreditTransactionType;
    description: string;
    metadata?: Record<string, unknown>;
}

export interface GrantCreditsResponse {
    organizationId: string;
    balanceBefore: string;
    balanceAfter: string;
    amount: string;
    transactionId: string;
}

export const getOrgCreditBalance = async (orgId: string): Promise<OrgCreditsBalance> => {
    const response = await apiClient.get<OrgCreditsBalance>(`/admin/orgs/${orgId}/credits`);
    return response.data;
};

export const listCreditTransactions = async (
    orgId: string,
): Promise<{ organizationId: string; transactions: CreditTransaction[] }> => {
    const response = await apiClient.get<{ organizationId: string; transactions: CreditTransaction[] }>(
        `/admin/orgs/${orgId}/credits/transactions`,
    );
    return response.data;
};

export const grantCredits = async (
    orgId: string,
    data: GrantCreditsRequest,
): Promise<GrantCreditsResponse> => {
    const response = await apiClient.post<GrantCreditsResponse>(
        `/admin/orgs/${orgId}/credits/grant`,
        data,
    );
    return response.data;
};
