import { useQuery } from "@tanstack/react-query";

import { type ListProjectContextParams, listProjectContext } from "../api/project-context.api";

export const projectContextKeys = {
    all: ["project-context"] as const,
    list: (orgId: string, projectId: string, params?: unknown) =>
        [...projectContextKeys.all, orgId, projectId, params] as const,
};

export const useListProjectContext = (
    orgId: string,
    projectId: string,
    params?: ListProjectContextParams,
) =>
    useQuery({
        queryKey: projectContextKeys.list(orgId, projectId, params),
        queryFn: () => listProjectContext(orgId, projectId, params),
        enabled: !!orgId && !!projectId,
    });
