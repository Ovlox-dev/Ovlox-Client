import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { LinkIntegrationRequest } from "@/types/api-types";

import {
    addProjectMember,
    createProject,
    deleteProject,
    getAvailableResources,
    getProject,
    getProjectSettings,
    linkIntegration,
    listProjectMembers,
    listProjects,
    removeProjectMember,
    syncProjectMembers,
    updateProject,
    updateProjectMemberRole,
    updateProjectSettings,
    type GetAvailableResourcesParams,
} from "../api/projects";

export const projectKeys = {
    all: ["projects"] as const,
    lists: (orgId: string) => [...projectKeys.all, orgId] as const,
    list: (orgId: string, params?: unknown) =>
        [...projectKeys.lists(orgId), params] as const,

    detail: (orgId: string, projectId: string) =>
        [...projectKeys.all, orgId, projectId] as const,

    members: (orgId: string, projectId: string) =>
        [...projectKeys.detail(orgId, projectId), "members"] as const,

    resources: (orgId: string, projectId: string) =>
        [...projectKeys.detail(orgId, projectId), "resources"] as const,

    settings: (orgId: string, projectId: string) =>
        [...projectKeys.detail(orgId, projectId), "settings"] as const,
};

export const useListProjects = (
    orgId: string,
    params?: {
        keyword?: string;
        page?: number;
        limit?: number;
        offset?: number;
        sort?: string;
    }
) =>
    useQuery({
        queryKey: projectKeys.list(orgId, params),
        queryFn: () => listProjects(orgId, params),
        enabled: !!orgId,
    });

export const useGetProject = (orgId: string, projectId: string) =>
    useQuery({
        queryKey: projectKeys.detail(orgId, projectId),
        queryFn: () => getProject(orgId, projectId),
        enabled: !!orgId && !!projectId,
    });

export const useCreateProject = (orgId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof createProject>[1]) =>
            createProject(orgId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.lists(orgId),
            });
        },
    });
};

export const useUpdateProject = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof updateProject>[2]) =>
            updateProject(orgId, projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.detail(orgId, projectId),
            });
        },
    });
};

export const useDeleteProject = (orgId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (projectId: string) => deleteProject(orgId, projectId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.lists(orgId),
            });
        },
    });
};

export const useLinkIntegration = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: LinkIntegrationRequest) =>
            linkIntegration(orgId, projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.detail(orgId, projectId),
            });
        },
    });
};

export const useListProjectMembers = (orgId: string, projectId: string) =>
    useQuery({
        queryKey: projectKeys.members(orgId, projectId),
        queryFn: () => listProjectMembers(orgId, projectId),
        enabled: !!orgId && !!projectId,
    });

export const useAddProjectMember = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof addProjectMember>[2]) =>
            addProjectMember(orgId, projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.members(orgId, projectId),
            });
        },
    });
};

export const useRemoveProjectMember = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (memberId: string) =>
            removeProjectMember(orgId, projectId, memberId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.members(orgId, projectId),
            });
        },
    });
};

export const useUpdateProjectMemberRole = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            memberId,
            data,
        }: {
            memberId: string;
            data: Parameters<typeof updateProjectMemberRole>[3];
        }) => updateProjectMemberRole(orgId, projectId, memberId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.members(orgId, projectId),
            });
        },
    });
};

export const useSyncProjectMembers = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => syncProjectMembers(orgId, projectId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.members(orgId, projectId),
            });
        },
    });
};

export const useGetAvailableResources = (
    orgId?: string,
    projectId?: string,
    params?: GetAvailableResourcesParams
) =>
    useQuery({
        queryKey:
            orgId && projectId
                ? [...projectKeys.resources(orgId, projectId), params]
                : [],
        queryFn: () => getAvailableResources(orgId!, projectId!, params),
        enabled: !!orgId && !!projectId,
    });

export const useGetProjectSettings = (orgId: string, projectId: string) =>
    useQuery({
        queryKey: projectKeys.settings(orgId, projectId),
        queryFn: () => getProjectSettings(orgId, projectId),
        enabled: !!orgId && !!projectId,
    });

export const useUpdateProjectSettings = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof updateProjectSettings>[2]) =>
            updateProjectSettings(orgId, projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.settings(orgId, projectId),
            });
        },
    });
};

