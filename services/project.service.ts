import { apiClient } from "@/shared/api/client";
import { CreateProjectRequest, CreateProjectResponse, ListProjectsResponse, UpdateProjectRequest, LinkIntegrationRequest, GetResourcesResponse } from "@/types/api-types";
import { IProject } from "@/types/prisma-generated";

export const createProject = async (orgId: string, data: CreateProjectRequest): Promise<CreateProjectResponse> => {
    const response = await apiClient.post<CreateProjectResponse>(`/orgs/${orgId}/projects`, data);
    return response.data;
};

export const listProjects = async (orgId: string, params?: { page?: number; limit?: number; search?: string; sort?: string }): Promise<ListProjectsResponse> => {
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

export const deleteProject = async (orgId: string, projectId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/orgs/${orgId}/projects/${projectId}`);
    return response.data;
};

export const linkIntegration = async (orgId: string, projectId: string, data: LinkIntegrationRequest): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/orgs/${orgId}/projects/${projectId}/link-integration`, data);
    return response.data;
};

export const getResources = async (orgId: string, projectId: string): Promise<GetResourcesResponse> => {
    const response = await apiClient.get<GetResourcesResponse>(`/orgs/${orgId}/projects/${projectId}/resources`);
    return response.data;
};
