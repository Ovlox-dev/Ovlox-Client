import { apiClient } from "@/shared/api/client";
import type { ExternalProvider } from "@/types/enum";

export interface IdentityAlias {
    id: string;
    alias: string;
    note: string | null;
    createdAt: string;
}

export interface MemberIdentity {
    id: string;
    provider: ExternalProvider;
    providerUserId: string;
    displayName: string | null;
    avatarUrl: string | null;
    linkedUserId: string | null;
    createdAt: string;
    mapId: string;
    mappedAt: string;
    aliases: IdentityAlias[];
}

export interface UnmappedIdentity {
    id: string;
    provider: ExternalProvider;
    providerUserId: string;
    displayName: string | null;
    avatarUrl: string | null;
    linkedUserId: string | null;
    createdAt: string;
    rawEvents: Array<{
        id: string;
        eventType: string;
        timestamp: string;
        authorName: string | null;
        authorEmail: string | null;
    }>;
}

export interface ContributionTotals {
    commits: number;
    pullRequests: number;
    messages: number;
    tasks: number;
    other: number;
    total: number;
}

export interface MemberContributions {
    memberId: string;
    windowDays: number;
    since: string;
    totals: ContributionTotals;
    heatmap: Array<{ date: string; count: number }>;
    perProject: Array<{
        projectId: string;
        projectSlug?: string;
        projectName: string;
        count: number;
    }>;
}

export const listMemberIdentities = async (
    orgId: string,
    memberId: string
): Promise<MemberIdentity[]> => {
    const res = await apiClient.get<MemberIdentity[]>(
        `/orgs/${orgId}/contributors/members/${memberId}/identities`
    );
    return res.data;
};

export const getMemberContributions = async (
    orgId: string,
    memberId: string,
    days?: number
): Promise<MemberContributions> => {
    const res = await apiClient.get<MemberContributions>(
        `/orgs/${orgId}/contributors/members/${memberId}/contributions`,
        { params: { days } }
    );
    return res.data;
};

export const listUnmappedIdentities = async (
    orgId: string
): Promise<UnmappedIdentity[]> => {
    const res = await apiClient.get<UnmappedIdentity[]>(
        `/orgs/${orgId}/contributors/identities/unmapped`
    );
    return res.data;
};

export const linkIdentityToMember = async (
    orgId: string,
    body: { identityId: string; memberId: string }
) => {
    const res = await apiClient.post(`/orgs/${orgId}/contributors/maps`, body);
    return res.data;
};

export const unlinkContributorMap = async (
    orgId: string,
    mapId: string
): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(
        `/orgs/${orgId}/contributors/maps/${mapId}`
    );
    return res.data;
};

export const createIdentityAlias = async (
    orgId: string,
    identityId: string,
    body: { alias: string; note?: string }
): Promise<IdentityAlias> => {
    const res = await apiClient.post<IdentityAlias>(
        `/orgs/${orgId}/contributors/identities/${identityId}/aliases`,
        body
    );
    return res.data;
};

export const deleteIdentityAlias = async (
    orgId: string,
    identityId: string,
    aliasId: string
): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(
        `/orgs/${orgId}/contributors/identities/${identityId}/aliases/${aliasId}`
    );
    return res.data;
};
