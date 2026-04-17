import { apiClient } from "@/shared/api/client";
import {
    CreateProjectRequest,
    CreateProjectResponse,
    ListProjectsResponse,
    UpdateProjectRequest,
    LinkIntegrationRequest,
    ApiResponse,
    GetAvailableResourcesResponse,
    ProjectMember,
    AddProjectMemberRequest,
    UpdateProjectMemberRoleRequest,
} from "@/types/api-types";
import { IProject } from "@/types/prisma-generated";


export const createProject = async (orgId: string, data: CreateProjectRequest): Promise<CreateProjectResponse> => {
    const response = await apiClient.post<CreateProjectResponse>(`/orgs/${orgId}/projects`, data);
    return response.data;
};

export const listProjects = async (
    orgId: string,
    params?: {
        keyword?: string;
        page?: number;
        limit?: number;
        offset?: number;
        sort?: string;
    }
): Promise<ListProjectsResponse> => {
    const response = await apiClient.get<ListProjectsResponse>(`/orgs/${orgId}/projects`, { params });
    return response.data;
};

export const getProject = async (orgId: string, projectId: string): Promise<IProject> => {
    const response = await apiClient.get<IProject>(`/orgs/${orgId}/projects/${projectId}`);
    return response.data;
};

export const updateProject = async (orgId: string, projectId: string, data: UpdateProjectRequest): Promise<IProject> => {
    const response = await apiClient.put<IProject>(`/orgs/${orgId}/projects/${projectId}`, data);
    return response.data;
};

export const deleteProject = async (
    orgId: string,
    projectId: string
): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
        `/orgs/${orgId}/projects/${projectId}`
    );
    return response.data;
};

export const linkIntegration = async (orgId: string, projectId: string, data: LinkIntegrationRequest): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/orgs/${orgId}/projects/${projectId}/link-integration`, data);
    return response.data;
};



export const listProjectMembers = async (orgId: string, projectId: string): Promise<ProjectMember[]> => {
    const response = await apiClient.get<ProjectMember[]>(
        `/orgs/${orgId}/projects/${projectId}/members`
    );
    return response.data;
};

export const addProjectMember = async (orgId: string, projectId: string, data: AddProjectMemberRequest): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
        `/orgs/${orgId}/projects/${projectId}/members`, data);
    return response.data;
};

export const removeProjectMember = async (orgId: string, projectId: string, memberId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/orgs/${orgId}/projects/${projectId}/members/${memberId}`);
    return response.data;
};

export const updateProjectMemberRole = async (orgId: string, projectId: string, memberId: string, data: UpdateProjectMemberRoleRequest): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>(
        `/orgs/${orgId}/projects/${projectId}/members/${memberId}`,
        data
    );
    return response.data;
};

export const syncProjectMembers = async (orgId: string, projectId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/orgs/${orgId}/projects/${projectId}/members/sync`, {});
    return response.data;
};

export type GetAvailableResourcesParams = {
    provider?: string;
    integrationId?: string;
    keyword?: string;
    page?: number;
    limit?: number;
};

export const getAvailableResources = async (orgId: string, projectId: string, params?: GetAvailableResourcesParams): Promise<ApiResponse<GetAvailableResourcesResponse[]>> => {
    const response = await apiClient.get<ApiResponse<GetAvailableResourcesResponse[]>>(`/orgs/${orgId}/projects/${projectId}/resources`, { params });
    return response.data;
};

export interface ProjectSettings {
    timezone: string;
    reportFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
}

export const getProjectSettings = async (
    orgId: string,
    projectId: string
): Promise<ProjectSettings> => {
    const response = await apiClient.get<ProjectSettings>(
        `/orgs/${orgId}/projects/${projectId}/settings`
    );
    return response.data;
};

export const updateProjectSettings = async (
    orgId: string,
    projectId: string,
    data: ProjectSettings
): Promise<ProjectSettings> => {
    const response = await apiClient.put<ProjectSettings>(
        `/orgs/${orgId}/projects/${projectId}/settings`,
        data
    );
    return response.data;
};