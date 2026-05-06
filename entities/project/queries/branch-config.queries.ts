import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
    type UpdateBranchConfigRequest,
    updateRepositoryBranchConfig,
} from "../api/branch-config.api";
import { projectKeys } from "./projects.queries";

export const useUpdateBranchConfig = (
    orgId: string,
    projectId: string,
    repositoryId: string,
) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UpdateBranchConfigRequest) =>
            updateRepositoryBranchConfig(orgId, projectId, repositoryId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectKeys.detail(orgId, projectId),
            });
        },
    });
};
