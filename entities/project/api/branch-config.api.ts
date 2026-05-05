import { apiClient } from "@/shared/api/client";

export interface UpdateBranchConfigRequest {
    trackedBranches?: string[];
    ignoredBranches?: string[];
}

export interface UpdateBranchConfigResponse {
    message: string;
    trackedBranches: string[];
    ignoredBranches: string[];
}

export const updateRepositoryBranchConfig = async (
    orgId: string,
    projectId: string,
    repositoryId: string,
    data: UpdateBranchConfigRequest,
): Promise<UpdateBranchConfigResponse> => {
    const response = await apiClient.put<UpdateBranchConfigResponse>(
        `/orgs/${orgId}/projects/${projectId}/repositories/${repositoryId}/branches`,
        data,
    );
    return response.data;
};
