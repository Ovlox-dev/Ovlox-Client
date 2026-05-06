import { useQuery } from "@tanstack/react-query";

import { getContributionMap } from "../api/contributions.api";

export const contributionsKeys = {
    all: ["contributions"] as const,
    project: (orgId: string, projectId: string, params?: unknown) =>
        [...contributionsKeys.all, orgId, projectId, params] as const,
};

export const useGetContributions = (
    orgId: string,
    projectId: string,
    params?: { since?: string; until?: string },
) =>
    useQuery({
        queryKey: contributionsKeys.project(orgId, projectId, params),
        queryFn: () => getContributionMap(orgId, projectId, params),
        enabled: !!orgId && !!projectId,
    });
