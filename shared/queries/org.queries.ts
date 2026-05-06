import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createOrg,
    userOrgs,
    userOrgById,
    userOrgBySlug,
    updateOrg,
    deleteOrg,
    inviteMember,
    listMembers,
    updateMember,
    removeMember,
    listInvites,
    acceptInvite,
    listIntegrations,
    getOrgIntegrationStatusByIntegrationId,
    addIntegrations,
    UserOrgsFilters,
} from "@/entities/organization/api/org";

export const orgKeys = {
    all: ["orgs"] as const,

    userLists: ["orgs", "user"] as const,
    userList: (filters?: UserOrgsFilters) =>
        [...orgKeys.userLists, filters] as const,

    detail: (orgId: string) => ["orgs", orgId] as const,
    bySlug: (slug: string) => ["orgs", "slug", slug] as const,

    members: (orgId: string) =>
        [...orgKeys.detail(orgId), "members"] as const,
    invites: (orgId: string) =>
        [...orgKeys.detail(orgId), "invites"] as const,

    integrations: (orgId: string) =>
        [...orgKeys.detail(orgId), "integrations"] as const,
    integration: (orgId: string, integrationId: string) =>
        [...orgKeys.integrations(orgId), integrationId] as const,
};


export const useUserOrgs = (filters?: UserOrgsFilters) =>
    useQuery({
        queryKey: orgKeys.userList(filters),
        queryFn: () => userOrgs(filters),
    });

export const useOrgById = (orgId: string) =>
    useQuery({
        queryKey: orgKeys.detail(orgId),
        queryFn: () => userOrgById(orgId),
        enabled: !!orgId,
    });

export const useOrgBySlug = (slug: string) =>
    useQuery({
        queryKey: orgKeys.bySlug(slug),
        queryFn: () => userOrgBySlug(slug),
        enabled: !!slug,
    });

export const useCreateOrg = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createOrg,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: orgKeys.userLists,
            });
        },
    });
};

export const useUpdateOrg = (orgId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof updateOrg>[1]) =>
            updateOrg(orgId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: orgKeys.detail(orgId),
            });
            queryClient.invalidateQueries({
                queryKey: orgKeys.userLists,
            });
        },
    });
};

export const useDeleteOrg = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteOrg,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: orgKeys.userLists,
            });
        },
    });
};

export const useListOrgMembers = (
    orgId: string,
    params?: { page?: number; limit?: number; search?: string; sort?: string }
) =>
    useQuery({
        queryKey: [...orgKeys.members(orgId), params],
        queryFn: () => listMembers(orgId, params),
        enabled: !!orgId,
    });

export const useInviteOrgMember = (orgId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof inviteMember>[1]) =>
            inviteMember(orgId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: orgKeys.invites(orgId),
            });
        },
    });
};

export const useUpdateOrgMember = (orgId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            memberId,
            data,
        }: {
            memberId: string;
            data: Parameters<typeof updateMember>[2];
        }) => updateMember(orgId, memberId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: orgKeys.members(orgId),
            });
        },
    });
};

export const useRemoveOrgMember = (orgId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (memberId: string) =>
            removeMember(orgId, memberId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: orgKeys.members(orgId),
            });
        },
    });
};

export const useOrgInvites = (
    orgId: string,
    params?: { page?: number; limit?: number }
) =>
    useQuery({
        queryKey: [...orgKeys.invites(orgId), params],
        queryFn: () => listInvites(orgId, params),
        enabled: !!orgId,
    });

export const useAcceptInvite = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: acceptInvite,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: orgKeys.userLists,
            });
        },
    });
};

export const useOrgIntegrations = (orgId: string) =>
    useQuery({
        queryKey: orgKeys.integrations(orgId),
        queryFn: () => listIntegrations(orgId),
        enabled: !!orgId,
    });

export const useOrgIntegrationById = (
    orgId: string,
    integrationId: string
) =>
    useQuery({
        queryKey: orgKeys.integration(orgId, integrationId),
        queryFn: () =>
            getOrgIntegrationStatusByIntegrationId(orgId, integrationId),
        enabled: !!orgId && !!integrationId,
    });

export const useAddOrgIntegrations = (orgId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof addIntegrations>[1]) =>
            addIntegrations(orgId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: orgKeys.integrations(orgId),
            });
        },
    });
};